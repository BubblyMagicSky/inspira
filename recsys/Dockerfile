FROM python:3.11-slim

WORKDIR /app

# Install Poetry
RUN pip install poetry==1.7.1

# Copy poetry configuration files
COPY pyproject.toml poetry.lock* ./

# Configure poetry to not create a virtual environment
RUN poetry config virtualenvs.create false

# Install dependencies
RUN poetry install --no-interaction --no-ansi --no-root

# Copy application code
COPY . .

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
