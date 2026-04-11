import os
import sys

CURRENT_DIR = os.path.dirname(__file__)
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from app.core.database import sync_engine as engine
from app.domain.models.document import Document
from app.domain.models.document_chunk import DocumentChunk
from app.domain.models.document_image import DocumentImage


def main():
    Document.__table__.create(bind=engine, checkfirst=True)
    DocumentChunk.__table__.create(bind=engine, checkfirst=True)
    DocumentImage.__table__.create(bind=engine, checkfirst=True)


if __name__ == "__main__":
    main()
