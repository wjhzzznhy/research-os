from fastapi import APIRouter

from app.server.api.v1.system import router as system_router
from app.server.api.v1.projects import router as projects_router
from app.server.api.v1.tasks import router as tasks_router
from app.server.api.v1.files import router as files_router
from app.server.api.v1.skills import router as skills_router
from app.server.api.v1.agents import router as agents_router
from app.server.api.v1.memory import router as memory_router
from app.server.api.v1.workflows import router as workflows_router
from app.server.api.v1.prompts import router as prompts_router
from app.server.api.v1.papers import router as papers_router
from app.server.api.v1.smart_draw import router as smart_draw_router
from app.server.api.v1.excalidraw_icons import router as excalidraw_icons_router
from app.server.api.v1.storage import router as storage_router
from app.server.api.v1.qa import router as qa_router
from app.server.api.v1.progress import router as progress_router
from app.server.api.v1.icons import router as icons_router
from app.server.api.v1.materials import router as materials_router

api_router = APIRouter()

api_router.include_router(system_router, prefix="/system", tags=["System"])
api_router.include_router(projects_router, prefix="/projects", tags=["Projects"])
api_router.include_router(tasks_router, prefix="/tasks", tags=["Tasks"])
api_router.include_router(files_router, prefix="/files", tags=["Files"])
api_router.include_router(skills_router, prefix="/skills", tags=["Skills"])
api_router.include_router(agents_router, prefix="/agents", tags=["Agents"])
api_router.include_router(memory_router, prefix="/memory", tags=["Memory"])
api_router.include_router(workflows_router, prefix="/workflows", tags=["Workflows"])
api_router.include_router(prompts_router, prefix="/prompts", tags=["Prompts"])
api_router.include_router(papers_router, prefix="/papers", tags=["Papers"])

api_router.include_router(smart_draw_router, prefix="/smart-draw", tags=["smart-draw"])
api_router.include_router(excalidraw_icons_router, prefix="/excalidraw-icons", tags=["excalidraw-icons"])
api_router.include_router(storage_router, prefix="/storage", tags=["storage"])
api_router.include_router(qa_router, prefix="/qa", tags=["qa"])
api_router.include_router(progress_router, prefix="/progress", tags=["progress"])
api_router.include_router(icons_router, prefix="/icons", tags=["icons"])
api_router.include_router(materials_router, prefix="/materials", tags=["materials"])
