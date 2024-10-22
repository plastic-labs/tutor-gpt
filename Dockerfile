# https://pythonspeed.com/articles/base-image-python-docker-images/
# https://testdriven.io/blog/docker-best-practices/
FROM python:3.11-slim-bullseye

COPY --from=ghcr.io/astral-sh/uv:0.4.9 /uv /bin/uv

# Set Working directory
WORKDIR /app

RUN addgroup --system app && adduser --system --group app
RUN chown -R app:app /app
USER app

# Enable bytecode compilation
ENV UV_COMPILE_BYTECODE=1

# Copy from the cache instead of linking since it's a mounted volume
ENV UV_LINK_MODE=copy

# Install the project's dependencies using the lockfile and settings
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    --mount=type=bind,source=api/,target=api/ \
    --mount=type=bind,source=agent/,target=agent/ \
    --mount=type=bind,source=bot/,target=bot/ \
    uv sync --frozen --no-dev

# Copy only requirements to cache them in docker layer
COPY --chown=app:app uv.lock  /app/
COPY --chown=app:app pyproject.toml /app/

# Place executables in the environment at the front of the path
ENV PATH="/app/.venv/bin:$PATH"

EXPOSE 8000

COPY --chown=app:app agent/ /app/agent/
COPY --chown=app:app bot/ /app/bot/
COPY --chown=app:app api/ /app/api/

# RUN --mount=type=cache,target=/root/.cache/uv \
RUN uv pip install -r /app/api/pyproject.toml

# https://stackoverflow.com/questions/29663459/python-app-does-not-print-anything-when-running-detached-in-docker
CMD ["fastapi", "run", "--host", "0.0.0.0", "api/main.py"]
