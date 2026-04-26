# ==========================================
# ResearchOS Unified API - Docker Image
# Combines: AI Agent Orchestration + Visual Intelligence
# ==========================================

# ==========================================
# Development Stage
# ==========================================
ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG ALL_PROXY
ARG NO_PROXY
FROM nvidia/cuda:12.8.0-runtime-ubuntu24.04 AS dev

ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG ALL_PROXY
ARG NO_PROXY
ENV HTTP_PROXY=$HTTP_PROXY
ENV HTTPS_PROXY=$HTTPS_PROXY
ENV ALL_PROXY=$ALL_PROXY
ENV NO_PROXY=$NO_PROXY
ENV http_proxy=$HTTP_PROXY
ENV https_proxy=$HTTPS_PROXY
ENV all_proxy=$ALL_PROXY
ENV no_proxy=$NO_PROXY
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=Asia/Shanghai
ENV PIP_INDEX_URL=https://pypi.tuna.tsinghua.edu.cn/simple
ENV PIP_TIMEOUT=600

WORKDIR /app

RUN apt-get update && apt-get install -y \
    python3.12 \
    python3.12-venv \
    python3-pip \
    libpq5 \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/* \
    && ln -sf /usr/bin/python3.12 /usr/bin/python

RUN pip install --no-cache-dir --break-system-packages \
    torch==2.8.0 \
    torchvision==0.23.0 \
    torchaudio==2.8.0 \
    --index-url https://download.pytorch.org/whl/cu128

RUN pip install --no-cache-dir --break-system-packages \
    fastapi[all] \
    uvicorn[standard] \
    sqlalchemy \
    sqlmodel \
    asyncpg \
    psycopg2-binary \
    "psycopg[binary]" \
    python-multipart \
    pydantic \
    pydantic-settings \
    python-dotenv \
    langgraph \
    langchain-core \
    langchain-openai \
    langchain \
    langchain-community \
    langchain-google-genai \
    langchain-postgres \
    pypdf \
    tiktoken \
    boto3 \
    redis \
    celery \
    pillow \
    numpy \
    scipy \
    transformers \
    qwen-vl-utils \
    jinja2 \
    httpx

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload", "--reload-dir", "/app/app"]

# ==========================================
# Production Stage
# ==========================================
FROM nvidia/cuda:12.8.0-runtime-ubuntu24.04 AS prod

ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG ALL_PROXY
ARG NO_PROXY
ENV HTTP_PROXY=$HTTP_PROXY
ENV HTTPS_PROXY=$HTTPS_PROXY
ENV ALL_PROXY=$ALL_PROXY
ENV NO_PROXY=$NO_PROXY
ENV http_proxy=$HTTP_PROXY
ENV https_proxy=$HTTPS_PROXY
ENV all_proxy=$ALL_PROXY
ENV no_proxy=$NO_PROXY
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=Asia/Shanghai
ENV PIP_INDEX_URL=https://pypi.tuna.tsinghua.edu.cn/simple
ENV PIP_TIMEOUT=600
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y \
    python3.12 \
    python3.12-venv \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && ln -sf /usr/bin/python3.12 /usr/bin/python \
    && groupadd -r appuser && useradd -r -g appuser appuser

COPY --from=dev /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=dev /usr/local/bin /usr/local/bin

COPY --chown=appuser:appuser app ./app
COPY --chown=appuser:appuser scripts ./scripts
COPY --chown=appuser:appuser data ./data
COPY --chown=appuser:appuser embedding ./embedding

RUN mkdir -p /app/storage /app/data/media && chown -R appuser:appuser /app/storage /app/data

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/ || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
