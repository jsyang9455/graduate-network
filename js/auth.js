// Authentication Management
class AuthManager {
    constructor() {
        this.storageKey = 'graduateNetwork_user';
        this.tokenKey = 'token';
        this.init();
    }

    init() {
        this.updateAuthUI();
        this.checkAuth();
    }

    // Check authentication status
    async checkAuth() {
        const token = localStorage.getItem(this.tokenKey);
        if (token) {
            // 이미 localStorage에 유저 데이터가 있으면 재검증 skip
            const existingUser = localStorage.getItem(this.storageKey);
            if (existingUser) {
                this.updateAuthUI();
                return;
            }

            // test/user 토큰도 skip
            if (token.startsWith('test_token_') || token.startsWith('user_token_')) {
                return;
            }
            
            try {
                const response = await api.auth.getCurrentUser();
                if (response.user) {
                    localStorage.setItem(this.storageKey, JSON.stringify(response.user));
                    this.updateAuthUI();
                }
            } catch (error) {
                // 401 (토큰 무효/만료) → 로컬 토큰만 삭제
                if (error.message && (error.message.includes('Invalid token') || error.message.includes('Unauthorized') || error.message.includes('Authentication required'))) {
                    localStorage.removeItem(this.storageKey);
                    localStorage.removeItem(this.tokenKey);
                    this.updateAuthUI();
                }
            }
        }
    }

    // Check if user is logged in
    isLoggedIn() {
        return localStorage.getItem(this.tokenKey) !== null;
    }

    // Get current user
    getCurrentUser() {
        const userStr = localStorage.getItem(this.storageKey);
        return userStr ? JSON.parse(userStr) : null;
    }

    // Login user
    login(userData, token) {
        localStorage.setItem(this.storageKey, JSON.stringify(userData));
        localStorage.setItem(this.tokenKey, token);
        this.updateAuthUI();
    }

    // Logout user
    logout() {
        localStorage.removeItem(this.storageKey);
        localStorage.removeItem(this.tokenKey);
        window.location.href = 'index.html';
    }

    // Update UI based on auth state
    updateAuthUI() {
        const user = this.getCurrentUser();
        const authButtons = document.getElementById('authButtons');
        const userMenu = document.getElementById('userMenu');
        const userName = document.getElementById('userName');

        if (user) {
            if (authButtons) authButtons.style.display = 'none';
            if (userMenu) {
                userMenu.style.display = 'flex';
                if (userName) userName.textContent = user.name;
            }
            // 관리자 메뉴 표시
            if (user.user_type === 'admin') {
                const adminMenuSection = document.getElementById('adminMenuSection');
                if (adminMenuSection) adminMenuSection.style.display = 'block';
            }
        } else {
            if (authButtons) authButtons.style.display = 'flex';
            if (userMenu) userMenu.style.display = 'none';
        }
    }

    // Require authentication
    requireAuth() {
        if (!this.isLoggedIn()) {
            alert('로그인이 필요한 서비스입니다.');
            const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
            window.location.href = 'login.html?returnUrl=' + returnUrl;
            return false;
        }
        return true;
    }
}

// Create global auth instance
const auth = new AuthManager();

// Logout function
function logout() {
    if (confirm('로그아웃 하시겠습니까?')) {
        auth.logout();
    }
}

// Navigate to service with auth check
function navigateToService(url) {
    if (auth.isLoggedIn()) {
        window.location.href = url;
    } else {
        alert('로그인이 필요한 서비스입니다.');
        window.location.href = 'login.html?returnUrl=' + encodeURIComponent(url);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    auth.updateAuthUI();
});
