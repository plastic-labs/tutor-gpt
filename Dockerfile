# -----------------------------------------------------------------------------------------------------------------------------
FROM node:16-alpine AS web-builder
RUN apk add --no-cache --virtual .gyp python3 build-base   

WORKDIR /app

COPY ./www/ www/

WORKDIR /app/www

RUN touch .env
RUN rm .env.local

# Note: You can mount multiple secrets
RUN --mount=type=secret,id=NEXT_PUBLIC_SUPABASE_URL \
  --mount=type=secret,id=NEXT_PUBLIC_SUPABASE_ANON_KEY \
  --mount=type=secret,id=NEXT_PUBLIC_URL \
  echo "NEXT_PUBLIC_SUPABASE_URL=$(cat /run/secrets/NEXT_PUBLIC_SUPABASE_URL)" >> .env && \
  echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=$(cat /run/secrets/NEXT_PUBLIC_SUPABASE_ANON_KEY)" >> .env && \
  echo "NEXT_PUBLIC_URL=$(cat /run/secrets/NEXT_PUBLIC_URL)" >> .env 

RUN yarn install
RUN yarn build

# -----------------------------------------------------------------------------------------------------------------------------
# https://pythonspeed.com/articles/base-image-python-docker-images/
# https://testdriven.io/blog/docker-best-practices/
FROM python:3.10-slim-bullseye as runner

WORKDIR /app

# https://stackoverflow.com/questions/53835198/integrating-python-poetry-with-docker
ENV PYTHONFAULTHANDLER=1 \
  PYTHONUNBUFFERED=1 \
  PYTHONHASHSEED=random \
  PIP_NO_CACHE_DIR=off \
  PIP_DISABLE_PIP_VERSION_CHECK=on \
  PIP_DEFAULT_TIMEOUT=100 \
  POETRY_VERSION=1.4.1

RUN pip install "poetry==$POETRY_VERSION"

# Copy only requirements to cache them in docker layer
WORKDIR /app
COPY poetry.lock pyproject.toml /app/

# Project initialization:
RUN poetry config virtualenvs.create false \
  && poetry install --no-root --no-interaction --no-ansi --without dev

COPY --from=web-builder /app/www/out /app/www/out
WORKDIR /app

RUN addgroup --system app && adduser --system --group app
USER app

COPY agent/ agent/
COPY common/ common/
COPY bot/ bot/
COPY api/ api/

# https://stackoverflow.com/questions/29663459/python-app-does-not-print-anything-when-running-detached-in-docker
CMD ["python", "-m", "uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
# CMD ["python", "-u", "-m", "bot.app"]
