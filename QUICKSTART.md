# 🚀 빠른 실행 가이드

## 1단계: PostgreSQL 설치 및 데이터베이스 생성

### PostgreSQL 설치 (Windows)
1. https://www.postgresql.org/download/windows/ 에서 다운로드
2. 설치 시 비밀번호를 기억해두세요!
3. 기본 포트: 5432

### 데이터베이스 생성
```bash
# 방법 1: pgAdmin 4 사용
# - pgAdmin 4 실행
# - Databases 우클릭 -> Create -> Database
# - Database name: graduate_network
# - Save 클릭

# 방법 2: 명령줄 사용 (PowerShell)
psql -U postgres
CREATE DATABASE graduate_network;
\q
```

## 2단계: 백엔드 설정 및 실행

```powershell
# 백엔드 폴더로 이동
cd backend

# 의존성 설치
npm install

# 환경 변수 파일 생성
copy .env.example .env

# .env 파일을 메모장으로 열기
notepad .env

# 다음 항목들을 수정:
# DB_PASSWORD=PostgreSQL에서 설정한 비밀번호
# JWT_SECRET=랜덤한문자열로변경하세요
```

### .env 파일 예시:
```env
NODE_ENV=development
PORT=5000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=graduate_network
DB_USER=postgres
DB_PASSWORD=여기에실제비밀번호입력

JWT_SECRET=my_super_secret_key_123456
JWT_EXPIRE=7d

CORS_ORIGIN=http://localhost:3000
```

### 데이터베이스 마이그레이션 및 실행
```powershell
# 데이터베이스 테이블 생성
npm run migrate

# 초기 샘플 데이터 삽입 (선택사항)
npm run seed

# 서버 실행
npm start

# 또는 개발 모드 (자동 재시작)
npm run dev
```

서버가 정상적으로 실행되면 다음과 같은 메시지가 표시됩니다:
```
✅ Database connected successfully
🚀 Server is running on port 5000
📡 API available at http://localhost:5000/api
🏥 Health check at http://localhost:5000/api/health
```

## 3단계: 프론트엔드 실행

새 터미널 창을 열고 프로젝트 루트 디렉토리에서:

### 방법 1: VS Code Live Server 사용 (추천)
1. VS Code에서 index.html 파일 열기
2. 우클릭 -> "Open with Live Server"

### 방법 2: Python HTTP 서버
```powershell
python -m http.server 3000
```

### 방법 3: Node.js http-server
```powershell
npx http-server -p 3000
```

브라우저에서 `http://localhost:3000` 접속

## 4단계: 로그인하기

초기 데이터를 삽입했다면 다음 계정으로 로그인 가능:

### 테스트 계정
- **이메일**: kim.mingyu@example.com
- **비밀번호**: password123

또는 회원가입 페이지에서 새 계정 생성

## 🔍 문제 해결

### 데이터베이스 연결 오류
```
❌ Unexpected database error
```
**해결방법:**
1. PostgreSQL 서비스가 실행 중인지 확인 (Windows Services)
2. `.env` 파일의 DB_PASSWORD가 올바른지 확인
3. 데이터베이스 `graduate_network`가 생성되었는지 확인

### 포트 충돌 오류
```
Error: listen EADDRINUSE :::5000
```
**해결방법:**
1. 다른 프로그램이 5000번 포트를 사용 중
2. `.env` 파일에서 PORT를 5001로 변경
3. `js/api.js` 파일의 API_BASE_URL도 함께 변경

### npm install 오류
```
npm ERR! code ENOENT
```
**해결방법:**
1. Node.js가 설치되어 있는지 확인: `node --version`
2. backend 폴더에 있는지 확인: `cd backend`
3. npm 캐시 삭제: `npm cache clean --force`

### CORS 오류 (브라우저 콘솔)
```
Access to fetch at 'http://localhost:5000/api' has been blocked by CORS
```
**해결방법:**
1. 백엔드 서버가 실행 중인지 확인
2. `.env` 파일의 CORS_ORIGIN 확인
3. 프론트엔드가 올바른 포트(3000)에서 실행 중인지 확인

## 📝 추가 명령어

### 데이터베이스 초기화 (모든 데이터 삭제)
```powershell
cd backend
npm run migrate
npm run seed
```

### 서버 로그 확인
백엔드 터미널에서 모든 API 요청을 실시간으로 확인할 수 있습니다.

### API 테스트
브라우저에서 다음 URL로 API 상태 확인:
- Health Check: http://localhost:5000/api/health
- API Info: http://localhost:5000/

## 🎉 완료!

이제 다음 기능들을 사용할 수 있습니다:
- ✅ 회원가입 및 로그인
- ✅ 채용 공고 조회 및 지원
- ✅ 동문 네트워킹
- ✅ 진로 상담 예약
- ✅ 증명서 발급
- ✅ 커뮤니티 게시판

문의사항이 있으시면 README.md를 참고해주세요!
