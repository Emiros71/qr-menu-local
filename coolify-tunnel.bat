@echo off
setlocal

set SSH_HOST=212.87.221.7
set SSH_USER=root
set LOCAL_PORT=8001
set REMOTE_HOST=10.0.1.6
set REMOTE_PORT=8080

echo Starting Coolify tunnel...
start "" http://127.0.0.1:%LOCAL_PORT%/login
ssh -N -L %LOCAL_PORT%:%REMOTE_HOST%:%REMOTE_PORT% %SSH_USER%@%SSH_HOST%

endlocal
