from __future__ import annotations

import json
import math
from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Optional, Tuple


class ExcalidrawParseError(ValueError):
    pass


@dataclass(frozen=True)
class ExcalidrawScene:
    elements: List[Dict[str, Any]]
    files: Dict[str, Any]
    app_state: Dict[str, Any]
    raw: Dict[str, Any]


def parse_excalidraw_scene(blob: bytes) -> ExcalidrawScene:
    try:
        raw = json.loads(blob.decode("utf-8"))
    except Exception as e:
        raise ExcalidrawParseError(f"invalid json: {e}")

    if not isinstance(raw, dict):
        raise ExcalidrawParseError("invalid excalidraw payload: expected object")

    elements = raw.get("elements")
    if not isinstance(elements, list):
        raise ExcalidrawParseError("invalid excalidraw payload: elements missing")

    files = raw.get("files")
    if files is None:
        files = {}
    if not isinstance(files, dict):
        files = {}

    app_state = raw.get("appState")
    if app_state is None:
        app_state = {}
    if not isinstance(app_state, dict):
        app_state = {}

    norm_elements: List[Dict[str, Any]] = []
    for el in elements:
        if isinstance(el, dict):
            norm_elements.append(el)

    return ExcalidrawScene(elements=norm_elements, files=files, app_state=app_state, raw=raw)


def element_kind(element: Dict[str, Any]) -> str:
    t = element.get("type")
    if isinstance(t, str) and t:
        return t
    return "unknown"


def _points_summary(points: Any) -> Tuple[int, Optional[float]]:
    if not isinstance(points, list) or not points:
        return 0, None

    pts: List[Tuple[float, float]] = []
    for p in points:
        if (
            isinstance(p, (list, tuple))
            and len(p) >= 2
            and isinstance(p[0], (int, float))
            and isinstance(p[1], (int, float))
        ):
            pts.append((float(p[0]), float(p[1])))

    if len(pts) < 2:
        return len(pts), None

    length = 0.0
    for (x1, y1), (x2, y2) in zip(pts, pts[1:]):
        length += math.hypot(x2 - x1, y2 - y1)
    return len(pts), length


def element_to_embedding_text(element: Dict[str, Any]) -> str:
    parts: List[str] = []

    eid = element.get("id")
    if isinstance(eid, str) and eid:
        parts.append(f"ElementId: {eid}")

    kind = element_kind(element)
    parts.append(f"Type: {kind}")

    text = element.get("text")
    if isinstance(text, str) and text.strip():
        parts.append(f"Text: {text.strip()}")

    for key in ("x", "y", "width", "height", "angle"):
        v = element.get(key)
        if isinstance(v, (int, float)):
            parts.append(f"{key}: {float(v):.2f}")

    for key in (
        "strokeColor",
        "backgroundColor",
        "fillStyle",
        "strokeWidth",
        "strokeStyle",
        "roughness",
        "opacity",
        "roundness",
        "fontFamily",
        "fontSize",
        "textAlign",
        "verticalAlign",
        "startArrowhead",
        "endArrowhead",
    ):
        v = element.get(key)
        if isinstance(v, (str, int, float)) and str(v):
            parts.append(f"{key}: {v}")

    points_count, path_len = _points_summary(element.get("points"))
    if points_count:
        parts.append(f"points_count: {points_count}")
    if isinstance(path_len, float):
        parts.append(f"path_len: {path_len:.2f}")

    if element.get("isDeleted") is True:
        parts.append("deleted: true")

    group_ids = element.get("groupIds")
    if isinstance(group_ids, list) and group_ids:
        parts.append(f"group_ids_count: {len(group_ids)}")

    return "\n".join(parts).strip()


def scene_summary_text(scene: ExcalidrawScene) -> str:
    counts: Dict[str, int] = {}
    text_count = 0
    freedraw_count = 0
    for el in scene.elements:
        k = element_kind(el)
        counts[k] = counts.get(k, 0) + 1
        if isinstance(el.get("text"), str) and el.get("text", "").strip():
            text_count += 1
        if k == "freedraw":
            freedraw_count += 1

    parts = [
        "Excalidraw Scene",
        f"elements_total: {len(scene.elements)}",
        f"text_elements: {text_count}",
        f"freedraw_elements: {freedraw_count}",
    ]
    for k in sorted(counts.keys()):
        parts.append(f"type_{k}: {counts[k]}")
    return "\n".join(parts).strip()


def iter_scene_documents(
    *,
    scene_id: str,
    scene: ExcalidrawScene,
    base_metadata: Dict[str, Any],
    include_scene_summary: bool = True,
    include_deleted: bool = False,
) -> Iterable[Tuple[str, str, Dict[str, Any]]]:
    scene_id = (scene_id or "").strip()
    if not scene_id:
        raise ValueError("scene_id is required")

    base = dict(base_metadata or {})
    base["scene_id"] = scene_id
    base["kind"] = "excalidraw-element"

    if include_scene_summary:
        doc_id = f"{scene_id}::__scene__"
        meta = dict(base)
        meta["element_id"] = "__scene__"
        meta["element_type"] = "scene"
        yield doc_id, scene_summary_text(scene), meta

    for el in scene.elements:
        if el.get("isDeleted") is True and not include_deleted:
            continue
        element_id = el.get("id")
        if not isinstance(element_id, str) or not element_id:
            continue
        doc_id = f"{scene_id}:{element_id}"
        meta = dict(base)
        meta["element_id"] = element_id
        meta["element_type"] = element_kind(el)
        meta["has_text"] = bool(isinstance(el.get("text"), str) and el.get("text", "").strip())
        meta["excalidraw_element"] = el
        yield doc_id, element_to_embedding_text(el), meta

