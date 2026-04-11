import json
from typing import Any, Dict, List, Tuple


def summarize_excalidraw_elements(elements: Any) -> Dict[str, Any]:
    if not isinstance(elements, list):
        return {"count": 0, "types": {}, "texts": []}
    type_counts: Dict[str, int] = {}
    texts: List[str] = []
    for el in elements:
        if not isinstance(el, dict):
            continue
        t = el.get("type")
        if isinstance(t, str):
            type_counts[t] = type_counts.get(t, 0) + 1
        if el.get("type") == "text":
            raw = el.get("text")
            if isinstance(raw, str):
                s = " ".join(raw.split())
                if s:
                    texts.append(s[:200])
    return {"count": len(elements), "types": type_counts, "texts": texts[:10]}


def get_element_bounding_box(el: Dict[str, Any]) -> Tuple[float, float, float, float]:
    x = el.get("x", 0)
    y = el.get("y", 0)
    width = el.get("width", 0)
    height = el.get("height", 0)
    return (float(x), float(y), float(x + width), float(y + height))


def calculate_spatial_relations(elements: List[Dict[str, Any]], max_samples: int = 50) -> List[str]:
    relations: List[str] = []
    sampled = elements[:max_samples] if len(elements) > max_samples else elements

    boxes = []
    labels = []
    for el in sampled:
        if not isinstance(el, dict):
            continue
        box = get_element_bounding_box(el)
        if box[2] > box[0] and box[3] > box[1]:
            boxes.append(box)
            labels.append(el.get("type", "unknown"))

    for i, (box1, label1) in enumerate(zip(boxes, labels)):
        for j, (box2, label2) in enumerate(zip(boxes, labels)):
            if i >= j:
                continue
            x1_min, y1_min, x1_max, y1_max = box1
            x2_min, y2_min, x2_max, y2_max = box2

            x_overlap = max(0, min(x1_max, x2_max) - max(x1_min, x2_min))
            y_overlap = max(0, min(y1_max, y2_max) - max(y1_min, y2_min))
            overlap_area = x_overlap * y_overlap

            box1_area = (x1_max - x1_min) * (y1_max - y1_min)
            box2_area = (x2_max - x2_min) * (y2_max - y2_min)

            if overlap_area > 0:
                if overlap_area / min(box1_area, box2_area) > 0.5:
                    relations.append(f"{label1}_contains_{label2}")
                else:
                    relations.append(f"{label1}_overlaps_{label2}")

            horizontal_dist = max(0, max(x1_min - x2_max, x2_min - x1_max))
            vertical_dist = max(0, max(y1_min - y2_max, y2_min - y1_max))

            if horizontal_dist < 50 and vertical_dist < 50:
                if y1_max <= y2_min:
                    relations.append(f"{label1}_above_{label2}")
                elif y2_max <= y1_min:
                    relations.append(f"{label1}_below_{label2}")
                if x1_max <= x2_min:
                    relations.append(f"{label1}_left_of_{label2}")
                elif x2_max <= x1_min:
                    relations.append(f"{label1}_right_of_{label2}")

    return relations


def build_excalidraw_semantic_description(elements: Any) -> str:
    if not isinstance(elements, list):
        return "Empty Excalidraw canvas"

    summary = summarize_excalidraw_elements(elements)
    parts: List[str] = []

    parts.append(f"Canvas with {summary['count']} elements")

    types = summary.get("types", {}) or {}
    if types:
        type_desc = ", ".join([f"{k}({v})" for k, v in sorted(types.items(), key=lambda kv: -kv[1])])
        parts.append(f"Contains: {type_desc}")

    texts = summary.get("texts", []) or []
    if texts:
        text_preview = " | ".join([str(t)[:50] for t in texts[:5]])
        parts.append(f"Text content: {text_preview}")

    spatial_relations = calculate_spatial_relations(elements)
    if spatial_relations:
        relation_counts: Dict[str, int] = {}
        for rel in spatial_relations[:100]:
            relation_counts[rel] = relation_counts.get(rel, 0) + 1
        top_relations = sorted(relation_counts.items(), key=lambda kv: -kv[1])[:10]
        rel_desc = ", ".join([f"{k}({v})" for k, v in top_relations])
        parts.append(f"Spatial layout: {rel_desc}")

    return ". ".join(parts)


def format_excalidraw_summary(summary: Dict[str, Any]) -> str:
    count = summary.get("count", 0)
    types = summary.get("types", {}) or {}
    texts = summary.get("texts", []) or []
    parts: List[str] = [f"Excalidraw elements: {count}"]
    if isinstance(types, dict) and types:
        top = sorted(types.items(), key=lambda kv: (-int(kv[1]), str(kv[0])))[:10]
        parts.append("Types: " + ", ".join([f"{k}({v})" for k, v in top]))
    if isinstance(texts, list) and texts:
        parts.append("Texts: " + " | ".join([str(t) for t in texts[:5]]))
    return ". ".join(parts)


def find_first_list_value(root: Any, key: str, max_nodes: int = 2000) -> List[Any] | None:
    queue: List[Any] = [root]
    seen = 0
    while queue and seen < max_nodes:
        node = queue.pop(0)
        seen += 1
        if isinstance(node, dict):
            val = node.get(key)
            if isinstance(val, list):
                return val
            for v in node.values():
                if isinstance(v, (dict, list)):
                    queue.append(v)
        elif isinstance(node, list):
            for v in node:
                if isinstance(v, (dict, list)):
                    queue.append(v)
    return None


def json_shape_hint(data: Any) -> str:
    if isinstance(data, dict):
        keys = list(data.keys())[:20]
        return f"dict keys={keys}"
    if isinstance(data, list):
        return f"list len={len(data)}"
    return type(data).__name__


def parse_excalidraw_library(content: bytes) -> List[Dict[str, Any]]:
    data = json.loads(content.decode("utf-8"))

    items: List[Dict[str, Any]] = []

    library_items: List[Any] | None = None
    if isinstance(data, list):
        library_items = data
    else:
        library_items = find_first_list_value(data, "libraryItems")
        if library_items is None:
            library_items = find_first_list_value(data, "library")
        if library_items is None:
            library_items = find_first_list_value(data, "items")

    if isinstance(library_items, list) and library_items:
        for idx, li in enumerate(library_items):
            elements: Any = None
            raw_meta: Dict[str, Any] = {}
            item_id: str | None = None

            if isinstance(li, list):
                elements = li
            elif isinstance(li, dict):
                elements = li.get("elements")
                raw_meta = {"status": li.get("status")}
                item_id = li.get("id") if isinstance(li.get("id"), str) else None
            else:
                continue

            summary = summarize_excalidraw_elements(elements)
            items.append(
                {
                    "item_index": idx,
                    "item_id": item_id,
                    "elements_summary": summary,
                    "elements_count": summary.get("count", 0),
                    "raw": raw_meta,
                }
            )
        return items

    elements = find_first_list_value(data, "elements")
    if isinstance(elements, list) and elements:
        summary = summarize_excalidraw_elements(elements)
        items.append(
            {
                "item_index": 0,
                "item_id": data.get("id") if isinstance(data, dict) and isinstance(data.get("id"), str) else None,
                "elements_summary": summary,
                "elements_count": summary.get("count", 0),
                "raw": {"type": data.get("type")} if isinstance(data, dict) else {},
            }
        )
    return items


def extract_excalidraw_library_items(content: bytes) -> List[Dict[str, Any]]:
    data = json.loads(content.decode("utf-8"))

    library_items: List[Any] | None = None
    if isinstance(data, list):
        library_items = data
    else:
        library_items = find_first_list_value(data, "libraryItems")
        if library_items is None:
            library_items = find_first_list_value(data, "library")
        if library_items is None:
            library_items = find_first_list_value(data, "items")

    extracted: List[Dict[str, Any]] = []

    if isinstance(library_items, list) and library_items:
        for idx, li in enumerate(library_items):
            if isinstance(li, list):
                extracted.append(
                    {
                        "id": None,
                        "status": "unpublished",
                        "created": None,
                        "name": None,
                        "elements": li,
                        "index": idx,
                    }
                )
                continue

            if not isinstance(li, dict):
                continue

            extracted.append(
                {
                    "id": li.get("id") if isinstance(li.get("id"), str) else None,
                    "status": li.get("status") if li.get("status") in {"published", "unpublished"} else "unpublished",
                    "created": li.get("created") if isinstance(li.get("created"), (int, float)) else None,
                    "name": li.get("name") if isinstance(li.get("name"), str) else None,
                    "elements": li.get("elements") if isinstance(li.get("elements"), list) else [],
                    "index": idx,
                }
            )
        return extracted

    elements = find_first_list_value(data, "elements")
    if isinstance(elements, list) and elements:
        extracted.append(
            {
                "id": data.get("id") if isinstance(data, dict) and isinstance(data.get("id"), str) else None,
                "status": "unpublished",
                "created": None,
                "name": data.get("name") if isinstance(data, dict) and isinstance(data.get("name"), str) else None,
                "elements": elements,
                "index": 0,
            }
        )
    return extracted

