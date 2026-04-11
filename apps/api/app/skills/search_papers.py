from __future__ import annotations

"""

直接调用 arXiv 的 Atom API，因此可以在主应用之外单独运行。

"""

import argparse
import json
import re
import socket
import sys
import time
from pathlib import Path
from typing import Any
from urllib import error as urlerror
from urllib import parse as urlparse
from urllib import request as urlrequest
from xml.etree import ElementTree as ET

# arXiv API 地址列表。
# 先尝试 https，如果失败再尝试 http，提高兼容性。
_ARXIV_API_URLS = (
    "https://export.arxiv.org/api/query",
    "http://export.arxiv.org/api/query",
)

# XML 命名空间。
# Atom 是 arXiv API 返回 XML 的基础命名空间；
# arxiv 是 arXiv 自己扩展的字段；
# opensearch 用来读取总命中数量。
_ARXIV_NS = {
    "atom": "http://www.w3.org/2005/Atom",
    "arxiv": "http://arxiv.org/schemas/atom",
    "opensearch": "http://a9.com/-/spec/opensearch/1.1/",
}

# 用于把输入关键词拆成“词”。
# 这里的意思是：只要不是空白、逗号、分号、冒号、括号，就算一个词的一部分。
_TERM_PATTERN = re.compile(r"[^\s,;:()]+")

# 默认超时时间（秒）。
_DEFAULT_TIMEOUT = 20

# 默认重试次数。
_DEFAULT_RETRIES = 2


# 默认请求头。
# User-Agent 很重要，有些服务会根据它判断是不是正常客户端。
_DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; standalone-paper-search/1.1; +https://arxiv.org)",
    "Accept": "application/atom+xml, application/xml;q=0.9, */*;q=0.8",
}


def _normalize_whitespace(value: str) -> str:
    """合并重复空白，使文本更稳定、整洁。"""
    return " ".join((value or "").split())


def _coerce_top_k(value: Any, default: int = 5, maximum: int = 100) -> int:
    """把用户输入的数量限制在合理范围内。"""
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        parsed = default
    return max(1, min(parsed, maximum))


def _build_search_queries(keyword: str) -> list[str]:
    """为同一个关键词生成多种 arXiv 查询写法，减少空结果。"""
    cleaned = _normalize_whitespace(keyword).replace('"', " ")
    raw_terms = _TERM_PATTERN.findall(cleaned)

    # 去掉空词和布尔关键字，避免把 AND / OR / NOT 当成普通搜索词。
    terms = [
        term.strip()
        for term in raw_terms
        if term.strip() and term.lower() not in {"and", "or", "not"}
    ]

    if not terms:
        return []

    phrase = " ".join(terms)
    queries: list[str] = []

    # 先尝试“短语匹配”，更精确。
    queries.append(f'(ti:"{phrase}" OR abs:"{phrase}" OR all:"{phrase}")')

    if len(terms) == 1:
        token = terms[0]
        queries.append(f"(ti:{token} OR abs:{token} OR all:{token})")
        queries.append(f"all:{token}")
    else:
        # 多词时，逐渐放宽条件。
        title_or_abstract_and = " AND ".join(f"(ti:{term} OR abs:{term})" for term in terms)
        all_and = " AND ".join(f"all:{term}" for term in terms)
        all_or = " OR ".join(f"all:{term}" for term in terms)

        queries.append(f"({title_or_abstract_and})")
        queries.append(f"({all_and})")
        queries.append(f"({all_or})")

    # 去重，避免重复查询。
    unique_queries: list[str] = []
    seen: set[str] = set()
    for query in queries:
        normalized_query = _normalize_whitespace(query)
        if normalized_query and normalized_query not in seen:
            seen.add(normalized_query)
            unique_queries.append(normalized_query)

    return unique_queries


def _fetch_feed(
    query: str,
    max_results: int,
    *,
    timeout: int = _DEFAULT_TIMEOUT,
    retries: int = _DEFAULT_RETRIES,
    debug: bool = False,
) -> ET.Element | None:
    """请求 arXiv API，并把返回的 Atom XML 解析成 XML 根节点。"""
    params = {
        "search_query": query,
        "start": 0,
        "max_results": _coerce_top_k(max_results, default=10, maximum=100),
        "sortBy": "relevance",
        "sortOrder": "descending",
    }

    last_error: Exception | None = None

    for api_url in _ARXIV_API_URLS:
        request_url = f"{api_url}?{urlparse.urlencode(params)}"

        for attempt in range(retries + 1):
            try:
                if debug:
                    print(f"[调试] 请求地址: {request_url}", file=sys.stderr)

                request = urlrequest.Request(request_url, headers=_DEFAULT_HEADERS)

                with urlrequest.urlopen(request, timeout=timeout) as response:
                    payload = response.read()

                root = ET.fromstring(payload)
                return root

            except (
                urlerror.HTTPError,
                urlerror.URLError,
                socket.timeout,
                TimeoutError,
                ET.ParseError,
                OSError,
            ) as exc:
                last_error = exc
                if debug:
                    print(
                        f"[调试] 第 {attempt + 1} 次请求失败: {type(exc).__name__}: {exc}",
                        file=sys.stderr,
                    )

                # 如果还有重试机会，就稍微等一下再请求。
                if attempt < retries:
                    time.sleep(1.5 * (attempt + 1))

    if debug and last_error is not None:
        print(
            f"[调试] 所有请求都失败了: {type(last_error).__name__}: {last_error}",
            file=sys.stderr,
        )

    return None


def _get_total_results(root: ET.Element) -> int | None:
    """从 XML 中读取总命中数量。"""
    text = _normalize_whitespace(
        root.findtext("opensearch:totalResults", default="", namespaces=_ARXIV_NS)
    )
    return int(text) if text.isdigit() else None


def _parse_year(date_text: str) -> int | None:
    """从日期字符串中提取年份。"""
    return int(date_text[:4]) if len(date_text) >= 4 and date_text[:4].isdigit() else None


def _parse_entry(entry: ET.Element) -> dict[str, Any] | None:
    """把单篇论文的 XML 节点转换成普通 Python 字典。"""
    paper_id = _normalize_whitespace(
        entry.findtext("atom:id", default="", namespaces=_ARXIV_NS)
    )
    title = _normalize_whitespace(
        entry.findtext("atom:title", default="", namespaces=_ARXIV_NS)
    )
    abstract = _normalize_whitespace(
        entry.findtext("atom:summary", default="", namespaces=_ARXIV_NS)
    )

    authors = [
        _normalize_whitespace(
            author.findtext("atom:name", default="", namespaces=_ARXIV_NS)
        )
        for author in entry.findall("atom:author", _ARXIV_NS)
    ]
    authors = [author for author in authors if author]

    published = _normalize_whitespace(
        entry.findtext("atom:published", default="", namespaces=_ARXIV_NS)
    )
    updated = _normalize_whitespace(
        entry.findtext("atom:updated", default="", namespaces=_ARXIV_NS)
    )
    year = _parse_year(published)

    categories: list[str] = []
    for category in entry.findall("atom:category", _ARXIV_NS):
        term = _normalize_whitespace(category.attrib.get("term", ""))
        if term:
            categories.append(term)

    # 去重，避免分类重复。
    categories = list(dict.fromkeys(categories))

    primary_category = ""
    primary_category_node = entry.find("arxiv:primary_category", _ARXIV_NS)
    if primary_category_node is not None:
        primary_category = _normalize_whitespace(primary_category_node.attrib.get("term", ""))

    if not primary_category and categories:
        primary_category = categories[0]

    url = ""
    pdf_url = ""
    for link in entry.findall("atom:link", _ARXIV_NS):
        href = _normalize_whitespace(link.attrib.get("href", ""))
        rel = _normalize_whitespace(link.attrib.get("rel", "")).lower()
        link_type = _normalize_whitespace(link.attrib.get("type", "")).lower()
        link_title = _normalize_whitespace(link.attrib.get("title", "")).lower()

        if not href:
            continue

        if (link_title == "pdf" or link_type == "application/pdf") and not pdf_url:
            pdf_url = href
        elif rel == "alternate" and not url:
            url = href

    if not url:
        url = paper_id

    # 没有标题或摘要的条目直接跳过。
    if not title or not abstract:
        return None

    return {
        "id": paper_id,
        "title": title,
        "authors": authors,
        "abstract": abstract,
        "year": year,
        "published": published,
        "updated": updated,
        "primary_category": primary_category,
        "categories": categories,
        "url": url,
        "pdf_url": pdf_url,
    }


def _paper_key(paper: dict[str, Any]) -> str:
    """生成论文去重键，避免同一篇论文重复出现在结果中。"""
    return str(
        paper.get("id") or paper.get("url") or paper.get("title", "")
    ).strip().lower()


def search_papers(
    keyword: str,
    top_k: int = 5,
    *,
    timeout: int = _DEFAULT_TIMEOUT,
    retries: int = _DEFAULT_RETRIES,
    debug: bool = False,
) -> list[dict[str, Any]]:
    """根据关键词从 arXiv 搜索论文，并返回标准化后的结果列表。"""
    normalized_keyword = _normalize_whitespace(keyword)
    if not normalized_keyword:
        return []

    requested_top_k = _coerce_top_k(top_k, default=5, maximum=100)

    # 实际请求时多拿一些，避免去重或过滤后数量不够。
    fetch_size = min(max(requested_top_k * 3, 10), 100)

    queries = _build_search_queries(normalized_keyword)
    if not queries:
        return []

    if debug:
        print(f"[调试] 用户关键词: {normalized_keyword}", file=sys.stderr)
        print(f"[调试] 查询策略列表: {queries}", file=sys.stderr)

    papers: list[dict[str, Any]] = []
    seen: set[str] = set()

    for query in queries:
        root = _fetch_feed(
            query,
            fetch_size,
            timeout=timeout,
            retries=retries,
            debug=debug,
        )
        if root is None:
            continue

        total_results = _get_total_results(root)
        if debug:
            total_text = total_results if total_results is not None else "未知"
            print(
                f"[调试] 当前查询总命中数: {total_text} | query={query}",
                file=sys.stderr,
            )

        for entry in root.findall("atom:entry", _ARXIV_NS):
            paper = _parse_entry(entry)
            if paper is None:
                continue

            unique_key = _paper_key(paper)
            if not unique_key or unique_key in seen:
                continue

            seen.add(unique_key)
            papers.append(paper)

            if len(papers) >= requested_top_k:
                return papers

    return papers[:requested_top_k]


def save_papers_to_json(
    results: list[dict[str, Any]],
    output_path: str | Path,
    keyword: str = "",
) -> str:
    """将搜索结果保存为 JSON，方便后续本地检索复用。"""
    target_path = Path(output_path)
    if target_path.parent and not target_path.parent.exists():
        target_path.parent.mkdir(parents=True, exist_ok=True)

    payload = {
        "source": "arXiv",
        "keyword": _normalize_whitespace(keyword),
        "count": len(results),
        "items": results,
    }

    target_path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return str(target_path.resolve())


def main() -> None:
    parser = argparse.ArgumentParser(description="从 arXiv 搜索学术论文摘要。")
    parser.add_argument("keyword", help="自然语言关键词，例如：jailbreak")
    parser.add_argument("--top-k", type=int, default=5, help="返回的论文数量")
    parser.add_argument("--output-json", default="", help="可选：把结果保存为 JSON 文件")
    parser.add_argument("--timeout", type=int, default=_DEFAULT_TIMEOUT, help="单次请求超时时间（秒）")
    parser.add_argument("--retries", type=int, default=_DEFAULT_RETRIES, help="每个地址的重试次数")
    parser.add_argument("--debug", action="store_true", help="输出调试信息，便于排查空结果")
    args = parser.parse_args()

    results = search_papers(
        keyword=args.keyword,
        top_k=args.top_k,
        timeout=args.timeout,
        retries=args.retries,
        debug=args.debug,
    )

    if args.output_json:
        saved_path = save_papers_to_json(results, args.output_json, keyword=args.keyword)
        print(f"已保存 JSON 到: {saved_path}", file=sys.stderr)

    if not results and args.debug:
        print(
            "[调试] 没有查到结果。请检查：网络是否能访问 export.arxiv.org，或换一个关键词再试。",
            file=sys.stderr,
        )

    print(json.dumps(results, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

# 示例：
# python -X utf8 .\backend\scripts\search_papers_standalone.py "jailbreak" --top-k 3 --debug
# python -X utf8 .\backend\scripts\search_papers_standalone.py "retrieval augmented generation" --top-k 5 --output-json ".\backend\scripts\sample_papers_export.json" --debug