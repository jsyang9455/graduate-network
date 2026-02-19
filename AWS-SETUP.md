# AWS Ubuntu 서버 설치 가이드

이 가이드는 AWS EC2 Ubuntu 서버에서 Graduate Network 프로젝트를 설치하고 실행하는 방법을 설명합니다.

## 지원 Ubuntu 버전
- Ubuntu 20.04 LTS
- Ubuntu 22.04 LTS
- Ubuntu 24.04 LTS

## 1단계: AWS EC2 인스턴스 생성

1. AWS 콘솔에서 EC2 인스턴스 생성
2. Ubuntu Server 선택 (20.04 LTS 또는 22.04 LTS 권장)
3. 인스턴스 타입: t2.medium 이상 권장 (메모리 4GB+)
4. 보안 그룹 설정:
   - 포트 22 (SSH)
   - 포트 80 (HTTP)
   - 포트 443 (HTTPS, 선택사항)
   - 포트 5000 (Backend API, 선택사항)

## 2단계: 서버 접속

```bash
ssh -i your-key.pem ubuntu@your-server-ip
```

## 3단계: 자동 설치 스크립트 실행

프로젝트에 포함된 `setup-aws.sh` 스크립트를 사용하면 모든 것이 자동으로 설치됩니다.

### 방법 1: GitHub에서 직접 클론하여 설치

```bash
# 프로젝트 클론
git clone https://github.com/your-username/graduate-network.git
cd graduate-network

# 실행 권한 부여
chmod +x setup-aws.sh

# 자동 설치 스크립트 실행
./setup-aws.sh
```

### 방법 2: 스크립트만 다운로드하여 실행

```bash
# 스크립트 다운로드
wget https://raw.githubusercontent.com/your-username/graduate-network/main/setup-aws.sh

# 실행 권한 부여
chmod +x setup-aws.sh

# 실행
./setup-aws.sh
```

스크립트가 자동으로 다음을 수행합니다:
1. 시스템 업데이트
2. Docker 및 Docker Compose 설치
3. Git 설치 및 프로젝트 클론
4. 프로젝트 실행

## 4단계: 서비스 확인

설치 완료 후 브라우저에서 접속:
```
http://your-server-ip
```

## 5단계: 서비스 관리 명령어

### 서비스 중지
```bash
cd graduate-network
docker-compose down
```

### 서비스 시작
```bash
cd graduate-network
docker-compose up -d
```

### 서비스 재시작
```bash
cd graduate-network
docker-compose restart
```

### 로그 확인
```bash
# 전체 로그
docker-compose logs

# 프론트엔드 로그
docker-compose logs frontend

# 백엔드 로그
docker-compose logs backend
```

### 컨테이너 상태 확인
```bash
docker-compose ps
```

## 수동 설치 방법 (스크립트 없이)

스크립트를 사용하지 않고 수동으로 설치하려면:

### 1. 시스템 업데이트
```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Docker 설치
```bash
# 필수 패키지 설치
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common

# Docker GPG 키 추가
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Docker 저장소 추가
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Docker 설치
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io

# Docker 서비스 시작
sudo systemctl start docker
sudo systemctl enable docker

# 현재 사용자를 docker 그룹에 추가
sudo usermod -aG docker $USER

# 로그아웃 후 재로그인 또는
newgrp docker
```

### 3. Docker Compose 설치
```bash
# Docker Compose 최신 버전 설치
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# 실행 권한 부여
sudo chmod +x /usr/local/bin/docker-compose

# 설치 확인
docker-compose --version
```

### 4. Git 설치
```bash
sudo apt install -y git
```

### 5. 프로젝트 클론 및 실행
```bash
# 프로젝트 클론
git clone https://github.com/your-username/graduate-network.git
cd graduate-network

# Docker Compose로 실행
docker-compose up -d

# 상태 확인
docker-compose ps
```

## 트러블슈팅

### 포트가 이미 사용 중인 경우
```bash
# 포트 80 사용 중인 프로세스 확인
sudo lsof -i :80

# 해당 프로세스 종료
sudo kill -9 <PID>
```

### Docker 권한 오류
```bash
# Docker 그룹에 사용자 추가
sudo usermod -aG docker $USER

# 로그아웃 후 재로그인
exit
# 다시 SSH 접속
```

### 메모리 부족
```bash
# 스왑 메모리 추가 (2GB)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## 방화벽 설정 (선택사항)

UFW 방화벽 사용 시:
```bash
# UFW 설치
sudo apt install -y ufw

# 기본 정책 설정
sudo ufw default deny incoming
sudo ufw default allow outgoing

# 필요한 포트 허용
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS

# 방화벽 활성화
sudo ufw enable

# 상태 확인
sudo ufw status
```

## 도메인 연결 (선택사항)

도메인이 있는 경우:

1. DNS 설정에서 A 레코드를 서버 IP로 지정
2. Nginx 설정 수정 (nginx.conf)
3. Let's Encrypt로 SSL 인증서 설치:

```bash
# Certbot 설치
sudo apt install -y certbot python3-certbot-nginx

# SSL 인증서 발급
sudo certbot --nginx -d yourdomain.com
```

## 백업

정기적으로 데이터를 백업하세요:

```bash
# 데이터베이스 백업
docker-compose exec postgres pg_dump -U postgres graduate_network > backup_$(date +%Y%m%d).sql

# 전체 백업
tar -czf backup_$(date +%Y%m%d).tar.gz graduate-network/
```

## 업데이트

프로젝트 업데이트:
```bash
cd graduate-network
git pull origin main
docker-compose down
docker-compose up -d --build
```

## 문의

문제가 발생하면 GitHub Issues에 문의하세요.
