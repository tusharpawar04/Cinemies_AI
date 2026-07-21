$env:PYTHONUNBUFFERED = "1"
& .venv\Scripts\activate.ps1
python -m uvicorn main:app --host 0.0.0.0 --port 8000
