import asyncio
import logging
import uuid
from dataclasses import dataclass, asdict
from datetime import datetime
from enum import Enum
from typing import Dict, Optional, Set

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)

router = APIRouter()


class ProgressStatus(str, Enum):
    PENDING = "pending"
    STARTED = "started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass
class ProgressUpdate:
    task_id: str
    status: ProgressStatus
    progress: float
    message: str
    current_step: Optional[str] = None
    total_steps: Optional[int] = None
    current_step_num: Optional[int] = None
    error: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class ProgressManager:
    def __init__(self):
        self.active_tasks: Dict[str, ProgressUpdate] = {}
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        self.task_locks: Dict[str, asyncio.Lock] = {}
    
    def create_task(self, task_id: Optional[str] = None) -> str:
        task_id = task_id or str(uuid.uuid4())
        now = datetime.now()
        self.active_tasks[task_id] = ProgressUpdate(
            task_id=task_id,
            status=ProgressStatus.PENDING,
            progress=0.0,
            message="Task created",
            created_at=now,
            updated_at=now,
        )
        self.task_locks[task_id] = asyncio.Lock()
        logger.info(f"Created progress task: {task_id}")
        return task_id
    
    async def update_task(self, task_id: str, status: Optional[ProgressStatus] = None,
                         progress: Optional[float] = None, message: Optional[str] = None,
                         current_step: Optional[str] = None, total_steps: Optional[int] = None,
                         current_step_num: Optional[int] = None, error: Optional[str] = None) -> bool:
        if task_id not in self.active_tasks:
            logger.warning(f"Task not found: {task_id}")
            return False
        
        async with self.task_locks[task_id]:
            update = self.active_tasks[task_id]
            
            if status is not None:
                update.status = status
            if progress is not None:
                update.progress = max(0.0, min(100.0, progress))
            if message is not None:
                update.message = message
            if current_step is not None:
                update.current_step = current_step
            if total_steps is not None:
                update.total_steps = total_steps
            if current_step_num is not None:
                update.current_step_num = current_step_num
            if error is not None:
                update.error = error
            
            update.updated_at = datetime.now()
        
        await self._notify_task(task_id)
        return True
    
    def get_task(self, task_id: str) -> Optional[ProgressUpdate]:
        return self.active_tasks.get(task_id)
    
    def remove_task(self, task_id: str) -> bool:
        if task_id in self.active_tasks:
            del self.active_tasks[task_id]
            if task_id in self.task_locks:
                del self.task_locks[task_id]
            if task_id in self.active_connections:
                del self.active_connections[task_id]
            logger.info(f"Removed progress task: {task_id}")
            return True
        return False
    
    async def connect(self, task_id: str, websocket: WebSocket):
        if task_id not in self.active_connections:
            self.active_connections[task_id] = set()
        self.active_connections[task_id].add(websocket)
        logger.info(f"WebSocket connected to task: {task_id}")
        
        current_task = self.get_task(task_id)
        if current_task:
            await websocket.send_json(asdict(current_task))
    
    def disconnect(self, task_id: str, websocket: WebSocket):
        if task_id in self.active_connections:
            self.active_connections[task_id].discard(websocket)
            if not self.active_connections[task_id]:
                del self.active_connections[task_id]
        logger.info(f"WebSocket disconnected from task: {task_id}")
    
    async def _notify_task(self, task_id: str):
        if task_id not in self.active_connections or task_id not in self.active_tasks:
            return
        
        update = self.active_tasks[task_id]
        message = asdict(update)
        
        disconnected = []
        for websocket in self.active_connections[task_id]:
            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.error(f"Failed to send update to WebSocket: {e}")
                disconnected.append(websocket)
        
        for websocket in disconnected:
            self.disconnect(task_id, websocket)


progress_manager = ProgressManager()


@router.post("/tasks", status_code=201)
async def create_progress_task(task_id: Optional[str] = None):
    created_task_id = progress_manager.create_task(task_id)
    return {"task_id": created_task_id}


@router.get("/tasks/{task_id}")
async def get_progress(task_id: str):
    task = progress_manager.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return JSONResponse(content=asdict(task))


@router.put("/tasks/{task_id}")
async def update_progress(
    task_id: str,
    status: Optional[ProgressStatus] = None,
    progress: Optional[float] = None,
    message: Optional[str] = None,
    current_step: Optional[str] = None,
    total_steps: Optional[int] = None,
    current_step_num: Optional[int] = None,
    error: Optional[str] = None,
):
    success = await progress_manager.update_task(
        task_id=task_id,
        status=status,
        progress=progress,
        message=message,
        current_step=current_step,
        total_steps=total_steps,
        current_step_num=current_step_num,
        error=error,
    )
    if not success:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"success": True}


@router.delete("/tasks/{task_id}")
async def delete_progress_task(task_id: str):
    success = progress_manager.remove_task(task_id)
    if not success:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"success": True}


@router.websocket("/ws/{task_id}")
async def websocket_progress(websocket: WebSocket, task_id: str):
    await websocket.accept()
    await progress_manager.connect(task_id, websocket)
    
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        progress_manager.disconnect(task_id, websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}", exc_info=True)
        progress_manager.disconnect(task_id, websocket)
