# https://pythonspeed.com/articles/base-image-python-docker-images/
# https://testdriven.io/blog/docker-best-practices/
FROM python:3.10-slim-bullseye as builder

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

COPY requirements.txt .

RUN pip wheel --no-cache-dir --no-deps --wheel-dir /app/wheels -r requirements.txt

FROM python:3.10-slim-bullseye

WORKDIR /app

COPY --from=builder /app/wheels /wheels
COPY --from=builder /app/requirements.txt .

RUN pip install --no-cache /wheels/*

RUN addgroup --system app && adduser --system --group app
USER app

COPY app.py .
COPY chain.py .
COPY data/ data/

# https://stackoverflow.com/questions/29663459/python-app-does-not-print-anything-when-running-detached-in-docker
CMD ["python", "-u", "app.py"]
