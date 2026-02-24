// Login functionality
document.addEventListener('DOMContentLoaded', function() {
    let selectedUserType = null;
    const userTypeButtons = document.querySelectorAll('.user-type-btn');
    const userTypeSelection = document.getElementById('userTypeSelection');
    const loginFormContainer = document.getElementById('loginFormContainer');
    const selectedUserTypeName = document.getElementById('selectedUserTypeName');
    const changeTypeBtn = document.getElementById('changeTypeBtn');
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');

    // Check URL parameters for user type and return URL
    const urlParams = new URLSearchParams(window.location.search);
    const typeParam = urlParams.get('type');
    const returnUrl = urlParams.get('returnUrl');

    // Auto-select user type if specified in URL
    if (typeParam) {
        const targetButton = Array.from(userTypeButtons).find(btn => btn.getAttribute('data-type') === typeParam);
        if (targetButton) {
            targetButton.click();
        }
    }

    // User type labels
    const userTypeLabels = {
        'student': '재학생',
        'graduate': '졸업생',
        'teacher': '교사',
        'company': '기업',
        'admin': '관리자'
    };

    // Handle user type selection
    userTypeButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            selectedUserType = this.getAttribute('data-type');
            
            // Update UI
            userTypeButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Show login form after brief delay
            setTimeout(() => {
                userTypeSelection.style.display = 'none';
                loginFormContainer.style.display = 'block';
                selectedUserTypeName.textContent = userTypeLabels[selectedUserType];
            }, 300);
        });
    });

    // Handle change type button
    if (changeTypeBtn) {
        changeTypeBtn.addEventListener('click', function() {
            loginFormContainer.style.display = 'none';
            userTypeSelection.style.display = 'block';
            selectedUserType = null;
            userTypeButtons.forEach(b => b.classList.remove('active'));
            loginForm.reset();
            hideError();
        });
    }

    // Handle form submission
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();

        if (!selectedUserType) {
            showError('사용자 유형을 먼저 선택해주세요.');
            return;
        }

        const email = document.getElementById('email').value.trim().toLowerCase();
        const password = document.getElementById('password').value;

        if (!email || !password) {
            showError('이메일과 비밀번호를 입력해주세요.');
            return;
        }

        performLogin(email, password, false);
    });

    function performLogin(email, password, isTest) {
        hideError();

        // Show loading state
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = '로그인 중...';
        submitBtn.disabled = true;

        // For test login, use localStorage directly without API call
        if (isTest && testAccounts[selectedUserType]) {
            const testAccount = testAccounts[selectedUserType];
            
            // Create mock user data with proper ID
            const mockUser = {
                id: selectedUserType === 'student' ? 1 : 
                    selectedUserType === 'graduate' ? 2 :
                    selectedUserType === 'teacher' ? 3 :
                    selectedUserType === 'company' ? 5 :
                    selectedUserType === 'admin' ? 4 : 1,
                email: testAccount.email,
                name: testAccount.name,
                user_type: selectedUserType,
                phone: '010-1234-5678'
            };
            
            // Save to localStorage
            localStorage.setItem('graduateNetwork_user', JSON.stringify(mockUser));
            localStorage.setItem('token', 'test_token_' + selectedUserType);
            
            // Show success message
            const successMsg = document.getElementById('loginSuccess');
            const urlParams = new URLSearchParams(window.location.search);
            const returnUrl = urlParams.get('returnUrl');
            
            if (successMsg) {
                const destination = returnUrl || 'dashboard.html';
                successMsg.textContent = '로그인 성공! 이동합니다...';
                successMsg.style.display = 'block';
            }
            
            // Redirect after short delay
            setTimeout(() => {
                window.location.href = returnUrl || 'dashboard.html';
            }, 1000);
            
            return;
        }

        // 백엔드 API 먼저 시도 (실제 JWT 토큰 획득)
        api.auth.login(email, password)
            .then(response => {
                // 백엔드 로그인 성공 → 실제 JWT 저장
                auth.login(response.user, response.token);
                
                const successMsg = document.getElementById('loginSuccess');
                const urlParams = new URLSearchParams(window.location.search);
                const returnUrl = urlParams.get('returnUrl');
                
                if (successMsg) {
                    successMsg.textContent = '로그인 성공! 이동합니다...';
                    successMsg.style.display = 'block';
                }
                
                setTimeout(() => {
                    window.location.href = returnUrl || 'dashboard.html';
                }, 1000);
            })
            .catch(() => {
                // 백엔드 실패 시 localStorage에서 찾기 (오프라인 fallback)
                const users = JSON.parse(localStorage.getItem('graduateNetwork_users') || '[]');
                const foundUser = users.find(u => u.email === email && u.password === password);
                
                if (foundUser) {
                    const validUserTypes = ['student', 'graduate'];
                    const userTypeMatches = 
                        foundUser.user_type === selectedUserType || 
                        (validUserTypes.includes(foundUser.user_type) && validUserTypes.includes(selectedUserType));
                    
                    if (!userTypeMatches && foundUser.user_type !== selectedUserType) {
                        showError('선택한 사용자 유형과 일치하지 않습니다. 올바른 유형을 선택해주세요.');
                        submitBtn.textContent = originalText;
                        submitBtn.disabled = false;
                        return;
                    }
                    
                    const loginUser = {
                        id: foundUser.id,
                        email: foundUser.email,
                        name: foundUser.name,
                        user_type: foundUser.user_type || 'graduate',
                        phone: foundUser.phone
                    };
                    
                    localStorage.setItem('graduateNetwork_user', JSON.stringify(loginUser));
                    localStorage.setItem('token', 'user_token_' + foundUser.id);
                    
                    const successMsg = document.getElementById('loginSuccess');
                    const urlParams = new URLSearchParams(window.location.search);
                    const returnUrl = urlParams.get('returnUrl');
                    
                    if (successMsg) {
                        successMsg.textContent = '로그인 성공! 이동합니다...';
                        successMsg.style.display = 'block';
                    }
                    
                    setTimeout(() => {
                        window.location.href = returnUrl || 'dashboard.html';
                    }, 1000);
                    
                    submitBtn.textContent = originalText;
                    submitBtn.disabled = false;
                } else {
                    showError('이메일 또는 비밀번호가 올바르지 않습니다.');
                    submitBtn.textContent = originalText;
                    submitBtn.disabled = false;
                }
            });
    }

    function showError(message) {
        loginError.textContent = message;
        loginError.style.display = 'block';
        setTimeout(() => {
            loginError.style.display = 'none';
        }, 3000);
    }

    function hideError() {
        loginError.style.display = 'none';
    }

    // Social login handlers
    document.querySelectorAll('.btn-social').forEach(btn => {
        btn.addEventListener('click', function() {
            if (!selectedUserType) {
                showError('사용자 유형을 먼저 선택해주세요.');
                return;
            }
            alert('소셜 로그인 기능은 준비중입니다.');
        });
    });
});
