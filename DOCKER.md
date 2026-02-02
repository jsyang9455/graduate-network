# Docker 실행 가이드

## 사전 요구사항
- Docker Desktop 설치 (https://www.docker.com/products/docker-desktop/)

## 실행 방법

### 1. Docker 컨테이너 빌드 및 실행
```bash
# 모든 서비스 시작 (백그라운드)
docker-compose up -d

# 또는 로그를 보면서 실행
docker-compose up
```

### 2. 서비스 확인
- **프론트엔드**: http://localhost
- **백엔드 API**: http://localhost:5000/api
- **Health Check**: http://localhost:5000/api/health

### 3. 로그 확인
```bash
# 모든 서비스 로그
docker-compose logs -f

# 특정 서비스 로그
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### 4. 서비스 중지
```bash
# 중지
docker-compose stop

# 중지 및 컨테이너 삭제
docker-compose down

# 중지, 컨테이너 삭제, 볼륨 삭제 (데이터 초기화)
docker-compose down -v
```

### 5. 재시작
```bash
# 서비스 재시작
docker-compose restart

# 특정 서비스만 재시작
docker-compose restart backend
```

## 컨테이너 구성

### PostgreSQL (Database)
- **컨테이너명**: graduate-network-db
- **포트**: 5432
- **데이터**: Docker 볼륨에 영구 저장
- **초기 데이터**: schema.sql 및 seed.sql 자동 실행

### Backend (Node.js + Express)
- **컨테이너명**: graduate-network-backend
- **포트**: 5000
- **환경**: Production 모드
- **자동 재시작**: 활성화

### Frontend (Nginx)
- **컨테이너명**: graduate-network-frontend
- **포트**: 80
- **웹서버**: Nginx
- **자동 재시작**: 활성화

## 테스트 계정
- **이메일**: kim.mingyu@example.com
- **비밀번호**: password123

## 문제 해결

### 포트 충돌
다른 프로그램이 포트를 사용 중이면 docker-compose.yml에서 포트 변경:
```yaml
ports:
  - "8080:80"  # 프론트엔드
  - "5001:5000"  # 백엔드
```

### 데이터베이스 초기화
```bash
docker-compose down -v
docker-compose up -d
```

### 컨테이너 상태 확인
```bash
docker-compose ps
```

### 백엔드 컨테이너 접속
```bash
docker exec -it graduate-network-backend sh
```

### 데이터베이스 접속
```bash
docker exec -it graduate-network-db psql -U postgres -d graduate_network
```

## 운영 환경 배포

### 1. 환경 변수 수정
docker-compose.yml에서 다음 항목 변경:
- DB_PASSWORD: 강력한 비밀번호로 변경
- JWT_SECRET: 무작위 문자열로 변경
- CORS_ORIGIN: 실제 도메인으로 변경

### 2. HTTPS 설정 (선택사항)
nginx.conf에 SSL 인증서 설정 추가

### 3. 백그라운드 실행
```bash
docker-compose up -d
```

### 4. 자동 시작 설정
Docker Desktop 설정에서 "Start Docker Desktop when you log in" 활성화
