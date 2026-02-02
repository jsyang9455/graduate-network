# AWS Ubuntu 배포 가이드

이 가이드는 AWS EC2 Ubuntu 서버에 전주공업고등학교 졸업생 네트워크 플랫폼을 배포하는 방법을 설명합니다.

## 📋 목차
- [시스템 요구사항](#시스템-요구사항)
- [1단계: EC2 인스턴스 준비](#1단계-ec2-인스턴스-준비)
- [2단계: Docker 설치](#2단계-docker-설치)
- [3단계: 애플리케이션 배포](#3단계-애플리케이션-배포)
- [4단계: 방화벽 설정](#4단계-방화벽-설정)
- [5단계: 도메인 연결 (선택)](#5단계-도메인-연결-선택)
- [문제 해결](#문제-해결)

---

## 시스템 요구사항

### AWS EC2 인스턴스
- **OS**: Ubuntu 22.04 LTS 또는 24.04 LTS
- **인스턴스 타입**: 최소 t2.small (1 vCPU, 2GB RAM)
  - 권장: t2.medium (2 vCPU, 4GB RAM)
- **스토리지**: 최소 20GB SSD
- **네트워크**: 고정 IP 또는 Elastic IP

### 포트 설정
다음 포트를 인바운드 규칙에 추가해야 합니다:
- **80**: HTTP (웹 접속)
- **443**: HTTPS (SSL 사용 시)
- **22**: SSH (관리용)

---

## 1단계: EC2 인스턴스 준비

### 1.1 AWS 콘솔에서 EC2 인스턴스 생성

1. AWS Management Console 접속
2. EC2 서비스로 이동
3. "인스턴스 시작" 클릭
4. 다음 옵션 선택:
   - **AMI**: Ubuntu Server 22.04 LTS (HVM), SSD Volume Type
   - **인스턴스 유형**: t2.small 또는 t2.medium
   - **키 페어**: 새로 생성하거나 기존 키 선택
   - **스토리지**: 20GB gp3
   - **보안 그룹**: 새로 생성 (아래 참조)

### 1.2 보안 그룹 설정

인바운드 규칙 추가:
```
유형        프로토콜    포트 범위    소스
SSH         TCP        22          My IP (또는 0.0.0.0/0)
HTTP        TCP        80          0.0.0.0/0
HTTPS       TCP        443         0.0.0.0/0
```

### 1.3 Elastic IP 할당 (권장)

1. EC2 콘솔에서 "Elastic IP" 메뉴로 이동
2. "Elastic IP 주소 할당" 클릭
3. 할당된 IP를 EC2 인스턴스에 연결

### 1.4 SSH 접속

```bash
# Windows (PowerShell)
ssh -i "your-key.pem" ubuntu@your-ec2-public-ip

# Mac/Linux
chmod 400 your-key.pem
ssh -i your-key.pem ubuntu@your-ec2-public-ip
```

---

## 2단계: Docker 설치

### 2.1 시스템 업데이트

```bash
sudo apt update
sudo apt upgrade -y
```

### 2.2 필수 패키지 설치

```bash
sudo apt install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git
```

### 2.3 Docker 설치

```bash
# Docker GPG 키 추가
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Docker 저장소 추가
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Docker 설치
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Docker 서비스 시작 및 자동 시작 설정
sudo systemctl start docker
sudo systemctl enable docker

# 현재 사용자를 docker 그룹에 추가 (sudo 없이 docker 명령 실행)
sudo usermod -aG docker $USER

# 그룹 변경 적용 (재로그인 대신)
newgrp docker
```

### 2.4 Docker 설치 확인

```bash
docker --version
docker compose version
```

예상 출력:
```
Docker version 24.x.x, build xxxxx
Docker Compose version v2.x.x
```

---

## 3단계: 애플리케이션 배포

### 3.1 Git 저장소 클론

```bash
# 홈 디렉토리로 이동
cd ~

# 저장소 클론
git clone https://github.com/jsyang9455/graduate-network.git
cd graduate-network

# v1.1 태그로 체크아웃
git checkout v1.1
```

### 3.2 환경 변수 설정 (선택사항)

필요한 경우 환경 변수 파일을 생성할 수 있습니다:

```bash
# backend/.env 파일 생성
cat > backend/.env << 'EOF'
NODE_ENV=production
DB_HOST=db
DB_PORT=5432
DB_NAME=graduate_network
DB_USER=postgres
DB_PASSWORD=your_secure_password_here
JWT_SECRET=your_jwt_secret_here
PORT=5000
EOF
```

**⚠️ 중요**: `DB_PASSWORD`와 `JWT_SECRET`을 반드시 변경하세요!

### 3.3 Docker Compose 파일 확인

`docker-compose.yml` 파일이 올바른지 확인:

```bash
cat docker-compose.yml
```

### 3.4 애플리케이션 빌드 및 시작

```bash
# Docker 컨테이너 빌드 및 시작
docker compose up -d --build

# 실행 중인 컨테이너 확인
docker compose ps
```

예상 출력:
```
NAME                          IMAGE                      STATUS
graduate-network-frontend     graduate-network-frontend  Up
graduate-network-backend      graduate-network-backend   Up
graduate-network-db           postgres:15-alpine         Up (healthy)
```

### 3.5 로그 확인

```bash
# 전체 로그 확인
docker compose logs

# 특정 서비스 로그 확인
docker compose logs frontend
docker compose logs backend
docker compose logs db

# 실시간 로그 모니터링
docker compose logs -f
```

### 3.6 애플리케이션 접속 확인

브라우저에서 다음 주소로 접속:
```
http://your-ec2-public-ip
```

정상적으로 로그인 페이지가 표시되면 성공입니다! 🎉

---

## 4단계: 방화벽 설정

### 4.1 UFW (Uncomplicated Firewall) 설정

```bash
# UFW 설치 (Ubuntu에 기본 설치됨)
sudo apt install -y ufw

# 기본 정책 설정
sudo ufw default deny incoming
sudo ufw default allow outgoing

# 필요한 포트 허용
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS (SSL 사용 시)

# UFW 활성화
sudo ufw enable

# 상태 확인
sudo ufw status verbose
```

---

## 5단계: 도메인 연결 (선택)

### 5.1 DNS 설정

도메인을 소유하고 있다면:

1. DNS 관리 콘솔 접속
2. A 레코드 추가:
   ```
   타입: A
   이름: @ (또는 www)
   값: EC2 Elastic IP
   TTL: 3600
   ```

### 5.2 Nginx 리버스 프록시 설정 (선택)

더 나은 성능과 SSL을 위해 Nginx를 프론트에 두는 것을 권장합니다:

```bash
# Nginx 설치
sudo apt install -y nginx

# Nginx 설정 파일 생성
sudo nano /etc/nginx/sites-available/graduate-network
```

다음 내용 추가:
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://localhost:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

설정 활성화:
```bash
# 심볼릭 링크 생성
sudo ln -s /etc/nginx/sites-available/graduate-network /etc/nginx/sites-enabled/

# 기본 설정 제거
sudo rm /etc/nginx/sites-enabled/default

# Nginx 설정 테스트
sudo nginx -t

# Nginx 재시작
sudo systemctl restart nginx
```

### 5.3 SSL 인증서 설치 (Let's Encrypt)

```bash
# Certbot 설치
sudo apt install -y certbot python3-certbot-nginx

# SSL 인증서 발급
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 자동 갱신 테스트
sudo certbot renew --dry-run
```

---

## 관리 명령어

### 애플리케이션 관리

```bash
# 애플리케이션 중지
docker compose down

# 애플리케이션 재시작
docker compose restart

# 애플리케이션 업데이트
git pull origin main
docker compose up -d --build

# 특정 버전으로 업데이트
git fetch --tags
git checkout v1.1
docker compose up -d --build

# 로그 확인
docker compose logs -f

# 컨테이너 상태 확인
docker compose ps

# 데이터베이스 접속
docker compose exec db psql -U postgres -d graduate_network
```

### 시스템 모니터링

```bash
# 디스크 사용량 확인
df -h

# 메모리 사용량 확인
free -h

# CPU 사용량 확인
top

# Docker 리소스 사용량
docker stats
```

### 백업

```bash
# 데이터베이스 백업
docker compose exec db pg_dump -U postgres graduate_network > backup_$(date +%Y%m%d).sql

# 백업 복원
docker compose exec -T db psql -U postgres graduate_network < backup_20260202.sql
```

---

## 문제 해결

### 컨테이너가 시작되지 않는 경우

```bash
# 로그 확인
docker compose logs

# 컨테이너 상태 확인
docker compose ps -a

# 특정 컨테이너 재시작
docker compose restart frontend
docker compose restart backend
```

### 포트 80이 이미 사용 중인 경우

```bash
# 포트를 사용 중인 프로세스 확인
sudo lsof -i :80

# 해당 프로세스 종료
sudo kill -9 <PID>

# 또는 Apache 등 다른 웹서버 중지
sudo systemctl stop apache2
```

### 데이터베이스 연결 오류

```bash
# 데이터베이스 컨테이너 로그 확인
docker compose logs db

# 데이터베이스 컨테이너 재시작
docker compose restart db

# 데이터베이스 접속 테스트
docker compose exec db psql -U postgres -d graduate_network
```

### 메모리 부족

```bash
# 사용하지 않는 Docker 리소스 정리
docker system prune -a

# 메모리 확인
free -h

# 스왑 파일 생성 (권장: 2GB)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 애플리케이션이 느린 경우

```bash
# 리소스 사용량 확인
docker stats

# 로그 확인
docker compose logs

# 필요시 인스턴스 타입 업그레이드
# t2.small -> t2.medium
```

---

## 보안 권장사항

### 1. SSH 보안 강화

```bash
# SSH 포트 변경 (선택)
sudo nano /etc/ssh/sshd_config
# Port 22를 다른 포트로 변경

# 비밀번호 인증 비활성화
# PasswordAuthentication no

# SSH 재시작
sudo systemctl restart sshd
```

### 2. 자동 보안 업데이트 설정

```bash
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

### 3. Fail2ban 설치

```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 4. 정기 백업 자동화

```bash
# crontab 편집
crontab -e

# 매일 새벽 2시에 백업
0 2 * * * cd ~/graduate-network && docker compose exec -T db pg_dump -U postgres graduate_network > ~/backups/backup_$(date +\%Y\%m\%d).sql
```

---

## 성능 최적화

### 1. Docker 로그 크기 제한

`docker-compose.yml` 파일에 추가:

```yaml
services:
  frontend:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### 2. 정기적인 리소스 정리

```bash
# 주간 정리 스크립트
cat > ~/cleanup.sh << 'EOF'
#!/bin/bash
docker system prune -f
docker volume prune -f
EOF

chmod +x ~/cleanup.sh

# crontab에 추가 (매주 일요일 새벽 3시)
0 3 * * 0 ~/cleanup.sh
```

---

## 모니터링 설정 (선택)

### Prometheus + Grafana (고급)

별도의 모니터링 스택을 구성하려면:

```bash
# 모니터링 디렉토리 생성
mkdir -p ~/monitoring
cd ~/monitoring

# docker-compose.yml 생성
# (Prometheus, Grafana, Node Exporter 설정)
```

---

## 지원 및 문의

문제가 발생하거나 질문이 있으면:
- 📧 이메일: support@jjobb.com
- 📞 전화: 063-XXX-XXXX
- 🔗 GitHub Issues: https://github.com/jsyang9455/graduate-network/issues

---

**버전**: v1.1  
**최종 업데이트**: 2026년 2월 2일  
**작성**: 전주공업고등학교 IT팀
