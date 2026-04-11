# app/application/workflows/__init__.py
from .innov_workflow import InnovationWorkflow
from .chat_workflow import ChatWorkflow
from .coding_workflow import CodingWorkflow
from .drawing_workflow import DrawingWorkflow
from .reading_workflow import ReadingWorkflow
from .review_workflow import ReviewWorkflow
from .search_workflow import SearchWorkflow
from .writing_workflow import WritingWorkflow

__all__ = [
    "InnovationWorkflow",
    "ChatWorkflow",
    "CodingWorkflow",
    "DrawingWorkflow",
    "ReadingWorkflow",
    "ReviewWorkflow",
    "SearchWorkflow",
    "WritingWorkflow",
]
