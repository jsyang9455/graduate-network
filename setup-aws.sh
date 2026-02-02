#!/bin/bash

# Graduate Network - AWS Ubuntu 자동 설치 스크립트
# Ubuntu 20.04, 22.04, 24.04 지원

set -e

echo "=========================================="
echo "Graduate Network 자동 설치 시작"
echo "=========================================="
echo ""

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 함수: 에러 메시지
error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# 함수: 성공 메시지
success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# 함수: 정보 메시지
info() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

# Root 권한 확인
if [ "$EUID" -eq 0 ]; then 
    error "이 스크립트는 root 권한으로 실행하지 마세요. sudo 없이 실행하세요."
fi

# Ubuntu 버전 확인
info "Ubuntu 버전 확인 중..."
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$NAME
    VER=$VERSION_ID
    info "감지된 OS: $OS $VER"
else
    error "Ubuntu를 감지할 수 없습니다."
fi

# 1단계: 시스템 업데이트
info "시스템 패키지 업데이트 중..."
sudo apt update && sudo apt upgrade -y
success "시스템 업데이트 완료"

# 2단계: 필수 패키지 설치
info "필수 패키지 설치 중..."
sudo apt install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    software-properties-common \
    git \
    wget
success "필수 패키지 설치 완료"

# 3단계: Docker 설치 확인
if command -v docker &> /dev/null; then
    info "Docker가 이미 설치되어 있습니다."
    docker --version
else
    info "Docker 설치 중..."
    
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
    
    success "Docker 설치 완료"
    docker --version
fi

# 4단계: Docker Compose 설치 확인
if command -v docker-compose &> /dev/null; then
    info "Docker Compose가 이미 설치되어 있습니다."
    docker-compose --version
else
    info "Docker Compose 설치 중..."
    
    # Docker Compose 최신 버전 설치
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    
    # 실행 권한 부여
    sudo chmod +x /usr/local/bin/docker-compose
    
    success "Docker Compose 설치 완료"
    docker-compose --version
fi

# 5단계: 프로젝트 설치 확인
if [ -d "graduate-network" ]; then
    info "프로젝트 디렉토리가 이미 존재합니다."
    read -p "기존 프로젝트를 삭제하고 다시 설치하시겠습니까? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        info "기존 프로젝트 삭제 중..."
        cd graduate-network
        docker-compose down 2>/dev/null || true
        cd ..
        sudo rm -rf graduate-network
        success "기존 프로젝트 삭제 완료"
    else
        info "기존 프로젝트를 유지합니다."
        cd graduate-network
        info "프로젝트 업데이트 중..."
        git pull origin main || info "업데이트를 건너뜁니다."
    fi
else
    # GitHub에서 프로젝트 클론
    info "프로젝트 클론 중..."
    echo "GitHub 저장소 URL을 입력하세요 (예: https://github.com/username/graduate-network.git):"
    read -p "URL: " REPO_URL
    
    if [ -z "$REPO_URL" ]; then
        error "GitHub 저장소 URL이 필요합니다."
    fi
    
    git clone $REPO_URL graduate-network
    cd graduate-network
    success "프로젝트 클론 완료"
fi

# 6단계: 환경 변수 설정 (있는 경우)
if [ ! -f .env ]; then
    info ".env 파일이 없습니다. 기본 설정을 사용합니다."
fi

# 7단계: Docker Compose로 실행
info "Docker Compose로 애플리케이션 시작 중..."
docker-compose down 2>/dev/null || true
docker-compose up -d

# 컨테이너 시작 대기
info "컨테이너 시작 대기 중..."
sleep 5

# 8단계: 상태 확인
info "컨테이너 상태 확인 중..."
docker-compose ps

# 9단계: 완료 메시지
echo ""
echo "=========================================="
success "설치가 완료되었습니다!"
echo "=========================================="
echo ""
echo "애플리케이션이 실행 중입니다:"
echo "- 프론트엔드: http://$(curl -s ifconfig.me)"
echo "- 백엔드 API: http://$(curl -s ifconfig.me):5000"
echo ""
echo "유용한 명령어:"
echo "  - 로그 확인: docker-compose logs"
echo "  - 서비스 중지: docker-compose down"
echo "  - 서비스 시작: docker-compose up -d"
echo "  - 서비스 재시작: docker-compose restart"
echo ""
info "Docker 그룹 권한이 적용되지 않았다면 로그아웃 후 다시 로그인하세요."
echo ""
