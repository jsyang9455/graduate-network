#!/bin/bash
# 서버 시작 스크립트

echo "🔄 기존 서버 종료 중..."
kill $(lsof -ti:5001) 2>/dev/null
kill $(lsof -ti:8080) 2>/dev/null
sleep 1

echo "🚀 백엔드 서버 시작 (포트 5001)..."
export PATH="/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH"
cd "$(dirname "$0")/backend"
node server.js &
BACKEND_PID=$!

sleep 2

# 백엔드 상태 확인
if curl -s http://localhost:5001/api/health > /dev/null 2>&1; then
  echo "✅ 백엔드 서버 OK (PID: $BACKEND_PID)"
else
  echo "❌ 백엔드 서버 시작 실패"
fi

echo "🌐 프론트엔드 서버 시작 (포트 8080)..."
cd "$(dirname "$0")"
python3 -m http.server 8080 &
FRONTEND_PID=$!

sleep 1

if curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/ | grep -q "200"; then
  echo "✅ 프론트엔드 서버 OK (PID: $FRONTEND_PID)"
else
  echo "❌ 프론트엔드 서버 시작 실패"
fi

echo ""
echo "========================================="
echo "  브라우저에서 접속: http://localhost:8080"
echo "========================================="
echo ""
echo "종료하려면 Ctrl+C 를 누르세요."

# 두 서버 모두 실행 중 유지
wait
