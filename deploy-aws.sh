#!/bin/bash

###############################################################################
# 전주공업고등학교 졸업생 네트워크 플랫폼
# AWS Ubuntu 자동 설치 스크립트 v1.1
###############################################################################

set -e  # 오류 발생 시 스크립트 중단

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 로그 함수
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 루트 권한 확인
if [ "$EUID" -eq 0 ]; then 
    log_error "이 스크립트는 root 권한으로 실행하지 마세요!"
    log_info "일반 사용자로 실행하세요: ./deploy-aws.sh"
    exit 1
fi

# 헤더 출력
echo "========================================================================"
echo "  전주공업고등학교 졸업생 네트워크 플랫폼 자동 설치 스크립트 v1.1"
echo "========================================================================"
echo ""

# 1. 시스템 업데이트
log_info "시스템 패키지 업데이트 중..."
sudo apt update && sudo apt upgrade -y
log_success "시스템 업데이트 완료"
echo ""

# 2. 필수 패키지 설치
log_info "필수 패키지 설치 중..."
sudo apt install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git
log_success "필수 패키지 설치 완료"
echo ""

# 3. Docker 설치 확인
if command -v docker &> /dev/null; then
    log_warning "Docker가 이미 설치되어 있습니다."
    docker --version
else
    log_info "Docker 설치 중..."
    
    # Docker GPG 키 추가
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    
    # Docker 저장소 추가
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Docker 설치
    sudo apt update
    sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Docker 서비스 시작
    sudo systemctl start docker
    sudo systemctl enable docker
    
    # 사용자를 docker 그룹에 추가
    sudo usermod -aG docker $USER
    
    log_success "Docker 설치 완료"
    docker --version
    docker compose version
fi
echo ""

# 4. 기존 애플리케이션 확인
if [ -d "$HOME/graduate-network" ]; then
    log_warning "기존 graduate-network 디렉토리가 발견되었습니다."
    read -p "기존 설치를 제거하고 새로 설치하시겠습니까? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "기존 설치 제거 중..."
        cd $HOME/graduate-network
        docker compose down -v 2>/dev/null || true
        cd $HOME
        rm -rf graduate-network
        log_success "기존 설치 제거 완료"
    else
        log_info "기존 설치를 유지합니다. 업데이트를 진행합니다."
        cd $HOME/graduate-network
        git fetch --tags
        git checkout v1.1
        docker compose down
        docker compose up -d --build
        log_success "애플리케이션 업데이트 완료"
        echo ""
        echo "========================================================================"
        log_success "업데이트가 완료되었습니다!"
        echo "========================================================================"
        exit 0
    fi
fi
echo ""

# 5. Git 저장소 클론
log_info "Git 저장소 클론 중..."
cd $HOME
git clone https://github.com/jsyang9455/graduate-network.git
cd graduate-network
git checkout v1.1
log_success "저장소 클론 완료"
echo ""

# 6. 환경 변수 설정
log_info "환경 변수 설정 중..."

# 랜덤 비밀번호 생성
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
JWT_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-50)

# backend/.env 파일 생성
mkdir -p backend
cat > backend/.env << EOF
NODE_ENV=production
DB_HOST=db
DB_PORT=5432
DB_NAME=graduate_network
DB_USER=postgres
DB_PASSWORD=$DB_PASSWORD
JWT_SECRET=$JWT_SECRET
PORT=5000
EOF

log_success "환경 변수 설정 완료"
log_warning "생성된 비밀번호를 안전한 곳에 백업하세요!"
echo ""

# 7. Docker Compose로 애플리케이션 시작
log_info "Docker 컨테이너 빌드 및 시작 중... (약 3-5분 소요)"
echo "이 작업은 시간이 걸릴 수 있습니다. 기다려 주세요..."
echo ""

# docker 그룹 적용을 위해 newgrp 사용
if docker compose up -d --build; then
    log_success "Docker 컨테이너 시작 완료"
else
    log_error "Docker 컨테이너 시작 실패"
    log_info "수동으로 시도해보세요: cd $HOME/graduate-network && docker compose up -d --build"
    exit 1
fi
echo ""

# 8. 컨테이너 상태 확인
log_info "컨테이너 상태 확인 중..."
sleep 5
docker compose ps
echo ""

# 9. 로그 확인
log_info "애플리케이션 로그 확인 중..."
docker compose logs --tail=20
echo ""

# 10. 방화벽 설정
log_info "방화벽 설정 중..."
if command -v ufw &> /dev/null; then
    sudo ufw allow 22/tcp
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    sudo ufw --force enable
    log_success "방화벽 설정 완료"
else
    log_warning "UFW가 설치되어 있지 않습니다. 수동으로 방화벽을 설정하세요."
fi
echo ""

# 11. 서버 IP 확인
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s icanhazip.com 2>/dev/null || echo "확인 실패")

# 완료 메시지
echo "========================================================================"
echo ""
log_success "설치가 완료되었습니다! 🎉"
echo ""
echo "========================================================================"
echo ""
echo "📍 접속 정보:"
echo "   - URL: http://$SERVER_IP"
echo "   - Frontend: http://$SERVER_IP"
echo "   - Backend API: http://$SERVER_IP:5000"
echo ""
echo "📋 관리 명령어:"
echo "   - 로그 확인: cd ~/graduate-network && docker compose logs -f"
echo "   - 재시작: cd ~/graduate-network && docker compose restart"
echo "   - 중지: cd ~/graduate-network && docker compose down"
echo "   - 시작: cd ~/graduate-network && docker compose up -d"
echo ""
echo "📝 중요 파일 위치:"
echo "   - 애플리케이션: ~/graduate-network"
echo "   - 환경 변수: ~/graduate-network/backend/.env"
echo ""
echo "🔐 보안 정보:"
echo "   - 데이터베이스 비밀번호가 자동 생성되었습니다."
echo "   - ~/graduate-network/backend/.env 파일을 확인하세요."
echo ""
echo "📖 추가 도움말:"
echo "   - 상세 가이드: ~/graduate-network/AWS-DEPLOYMENT.md"
echo "   - 사용자 매뉴얼: ~/graduate-network/MANUAL.md"
echo ""
echo "⚠️  주의사항:"
echo "   - AWS 보안 그룹에서 포트 80을 열어야 합니다."
echo "   - 도메인을 연결하려면 AWS-DEPLOYMENT.md를 참조하세요."
echo ""
echo "========================================================================"
echo ""

# 재로그인 안내
log_warning "Docker 그룹 변경사항을 적용하려면 다음 중 하나를 실행하세요:"
echo "   1) newgrp docker  (새 그룹으로 전환)"
echo "   2) 로그아웃 후 다시 로그인"
echo ""

log_info "설치 스크립트를 실행해 주셔서 감사합니다!"
