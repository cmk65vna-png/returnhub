@echo off
echo Dang khoi dong ReturnHub...

REM Doi Docker Desktop san sang (30 giay)
timeout /t 30 /nobreak > nul

REM Vao thu muc chua docker-compose.yml
cd /d "%~dp0"

REM Chay app o che do nen (khong hien cua so)
docker compose up -d

REM Doi app khoi dong xong (15 giay)
timeout /t 15 /nobreak > nul

REM Tu mo trinh duyet vao trang nhap kho
start http://localhost:3000/warehouse

echo ReturnHub da san sang!
