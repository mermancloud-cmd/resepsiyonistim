FROM tiangolo/uvicorn-gunicorn-fastapi:python3.11

COPY main.py /app/main.py

ENV DB_PATH=/data/bungalov.db

VOLUME /data
EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
