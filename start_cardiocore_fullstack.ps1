Write-Host "Starting CardioCore Full-Stack (FastAPI 72-Factor Twin Engine + Next.js Frontend)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\Users\Sarthak Raut\Desktop\EDI Website\backend'; uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\Users\Sarthak Raut\Desktop\EDI Website\cardiocore-next'; npm run dev"
Write-Host "Backend running on http://127.0.0.1:8000/api/v1/docs and Frontend on http://localhost:3000" -ForegroundColor Green
