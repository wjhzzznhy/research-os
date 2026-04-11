from typing import List, Optional, Type, Any
from pydantic import BaseModel, Field
from langchain_core.tools import BaseTool
from app.application.services.icon import icon_service


def _build_icons_context(icons: List[Any]) -> str:
    if not icons:
        return "未检索到可用图标。"

    lines: List[str] = []
    lines.append("以下是从图标库检索到的相关条目（按相关度排序）：")
    for icon_result in icons[:20]:
        icon = icon_result.icon
        score = icon_result.similarity
        name = icon.name or "Unknown"
        style = icon.style or ""
        tags = icon.tags_manual or []
        
        pieces = [f"name={name}"]
        pieces.append(f"similarity={score:.4f}")
        if style:
            pieces.append(f"style={style}")
        if tags:
            pieces.append(f"tags={', '.join([str(t) for t in tags])}")

        lines.append("  ".join(pieces))
    return "\n".join(lines)


class SearchIconsInput(BaseModel):
    query: str = Field(description="search query string")
    k: Optional[int] = Field(default=8, description="number of results to return")


class SearchIconsTool(BaseTool):
    name: str = "search_icons"
    description: str = "Search the icons library for relevant icons by text query."
    args_schema: Type[BaseModel] = SearchIconsInput
    response_format: str = "content_and_artifact"

    def _run(self, *args, **kwargs):
        raise NotImplementedError("Use async version")

    async def _arun(
        self,
        query: str,
        k: int = 8,
        **kwargs,
    ) -> tuple[str, List[Any]]:
        results = await icon_service.search_by_text(query, top_k=k)
        return _build_icons_context(results), results
