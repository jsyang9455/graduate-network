// Register functionality
document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('registerForm');
    const registerError = document.getElementById('registerError');
    const registerSuccess = document.getElementById('registerSuccess');
    const studentFields = document.getElementById('studentFields');
    const userTypeRadios = document.querySelectorAll('input[name="userType"]');

    // Load schools and majors
    loadSchools();
    loadMajors();

    // Populate graduation years
    populateGraduationYears();

    // Handle user type change
    userTypeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            const studentFields = document.getElementById('studentFields');
            
            if (this.value === 'teacher') {
                // 선생님: 이름, 이메일, 비밀번호, 학교만 표시
                studentFields.style.display = 'none';
                
                // Remove required from student fields
                const phoneInput = document.getElementById('phone');
                const graduationYearInput = document.getElementById('graduationYear');
                const majorInput = document.getElementById('major');
                const studentIdInput = document.getElementById('studentId');
                
                if (phoneInput) phoneInput.removeAttribute('required');
                if (graduationYearInput) graduationYearInput.removeAttribute('required');
                if (majorInput) majorInput.removeAttribute('required');
                if (studentIdInput) studentIdInput.removeAttribute('required');
            } else {
                // 학생/졸업생: 모든 필드 표시
                studentFields.style.display = 'block';
                
                // Add required to student fields
                const phoneInput = document.getElementById('phone');
                const graduationYearInput = document.getElementById('graduationYear');
                const majorInput = document.getElementById('major');
                
                if (phoneInput) phoneInput.setAttribute('required', 'required');
                if (graduationYearInput) graduationYearInput.setAttribute('required', 'required');
                if (majorInput) majorInput.setAttribute('required', 'required');
            }
        });
    });

    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Get selected user type
        const userType = document.querySelector('input[name="userType"]:checked').value;

        // Get form values
        const formData = {
            userType: userType,
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            password: document.getElementById('password').value,
            confirmPassword: document.getElementById('confirmPassword').value,
            schoolName: document.getElementById('schoolName').value,
            agreeTerms: document.getElementById('agreeTerms').checked
        };

        // Add student-specific fields only if student type
        if (userType === 'student') {
            const phoneInput = document.getElementById('phone');
            const graduationYearInput = document.getElementById('graduationYear');
            const majorInput = document.getElementById('major');
            const studentIdInput = document.getElementById('studentId');
            
            formData.phone = phoneInput ? phoneInput.value : '';
            formData.graduationYear = graduationYearInput ? graduationYearInput.value : '';
            formData.major = majorInput ? majorInput.value : '';
            formData.studentId = studentIdInput ? studentIdInput.value : '';
        }

        // Validation
        if (!validateForm(formData)) {
            return;
        }

        // Show loading state
        const submitBtn = registerForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = '등록 중...';
        submitBtn.disabled = true;

        try {
            // 백엔드 API로 회원가입 시도
            const registerData = {
                email: formData.email,
                password: formData.password,
                name: formData.name,
                user_type: formData.userType === 'teacher' ? 'teacher' : (formData.userType === 'student' ? 'student' : 'graduate'),
                phone: formData.phone || '',
                school_name: formData.schoolName
            };

            try {
                const response = await api.auth.register(registerData);
                // 백엔드 성공 - 토큰 저장 후 이동
                if (response && response.token) {
                    auth.login(response.user, response.token);
                }
                showSuccess('🎉 회원가입이 완료되었습니다! 로그인 페이지로 이동합니다...');
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
                return;
            } catch (apiError) {
                // 이메일 중복은 에러 메시지 표시
                if (apiError.message && (apiError.message.includes('already') || apiError.message.includes('registered') || apiError.message.includes('중복'))) {
                    showError('이미 등록된 이메일입니다.');
                    submitBtn.textContent = originalText;
                    submitBtn.disabled = false;
                    return;
                }
                // 기타 API 오류 → localStorage fallback
                console.warn('백엔드 API 실패, localStorage에 저장:', apiError.message);
            }

            // localStorage fallback
            let users = JSON.parse(localStorage.getItem('graduateNetwork_users') || '[]');
            if (users.some(u => u.email === formData.email)) {
                showError('이미 등록된 이메일입니다.');
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
                return;
            }
            const newUser = {
                id: users.length + 1,
                email: formData.email,
                password: formData.password,
                name: formData.name,
                user_type: registerData.user_type,
                phone: formData.phone || '',
                schoolName: formData.schoolName,
                registeredAt: new Date().toISOString()
            };
            if (formData.userType === 'student') {
                newUser.graduationYear = formData.graduationYear;
                newUser.major = formData.major;
            }
            users.push(newUser);
            localStorage.setItem('graduateNetwork_users', JSON.stringify(users));

            showSuccess('🎉 회원가입이 완료되었습니다! 로그인 페이지로 이동합니다...');
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);

        } catch (error) {
            showError(error.message || '회원가입에 실패했습니다. 다시 시도해주세요.');
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });

    function populateGraduationYears() {
        const graduationYearInput = document.getElementById('graduationYear');
        
        // graduationYear is now an input type="number", not a select
        // So we don't need to populate options
        if (graduationYearInput && graduationYearInput.tagName === 'SELECT') {
            const currentYear = 2026;
            const startYear = 1980;
            for (let year = currentYear; year >= startYear; year--) {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year + '년';
                graduationYearInput.appendChild(option);
            }
        }
    }

    function validateForm(data) {
        // Check required fields (common for all users)
        if (!data.name || !data.email || !data.password || !data.schoolName) {
            showError('필수 항목을 모두 입력해주세요.');
            return false;
        }

        // Check student-specific required fields
        if (data.userType === 'student') {
            if (!data.phone || !data.graduationYear || !data.major) {
                showError('필수 항목을 모두 입력해주세요.');
                return false;
            }
            
            // Check phone format only for students
            const phoneRegex = /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/;
            if (!phoneRegex.test(data.phone.replace(/-/g, ''))) {
                showError('올바른 연락처 형식이 아닙니다. (예: 010-1234-5678)');
                return false;
            }
        }

        // Check email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
            showError('올바른 이메일 형식이 아닙니다.');
            return false;
        }

        // Check password length
        if (data.password.length < 8) {
            showError('비밀번호는 8자 이상이어야 합니다.');
            return false;
        }

        // Check password confirmation
        if (data.password !== data.confirmPassword) {
            showError('비밀번호가 일치하지 않습니다.');
            return false;
        }

        // Check agreement
        if (!data.agreeTerms) {
            showError('필수 약관에 동의해주세요.');
            return false;
        }

        return true;
    }

    function showError(message) {
        registerError.textContent = message;
        registerError.style.display = 'block';
        registerSuccess.style.display = 'none';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function showSuccess(message) {
        registerSuccess.textContent = message;
        registerSuccess.style.display = 'block';
        registerError.style.display = 'none';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function loadSchools() {
        const schoolSelect = document.getElementById('schoolName');
        if (!schoolSelect) return;

        // localStorage에서 학교 목록 가져오기
        let schools = JSON.parse(localStorage.getItem('schools') || '[]');
        
        // 기본 학교가 없으면 전주공업고등학교 추가
        if (schools.length === 0) {
            schools = [{
                id: 1,
                name: '전주공업고등학교',
                createdAt: new Date().toISOString()
            }];
            localStorage.setItem('schools', JSON.stringify(schools));
        }

        // 기존 옵션 제거 (첫 번째 "학교 선택" 옵션 제외)
        while (schoolSelect.options.length > 1) {
            schoolSelect.remove(1);
        }

        // 학교 목록을 드롭다운에 추가
        schools.forEach(school => {
            const option = document.createElement('option');
            option.value = school.name;
            option.textContent = school.name;
            schoolSelect.appendChild(option);
        });
    }
    
    async function loadMajors() {
        const majorSelect = document.getElementById('major');
        if (!majorSelect) return;

        try {
            const response = await api.get('/majors');
            const majors = response.majors || [];

            // 기존 옵션 제거 (첫 번째 "전공 선택" 옵션 제외)
            while (majorSelect.options.length > 1) {
                majorSelect.remove(1);
            }

            // 학과 목록을 드롭다운에 추가
            majors.forEach(major => {
                const option = document.createElement('option');
                option.value = major.name;
                option.textContent = major.name;
                majorSelect.appendChild(option);
            });
        } catch (error) {
            console.error('학과 목록 로드 실패:', error);
            // API 실패 시 기본 학과 목록 사용
            const defaultMajors = ['기계과', '전기과', '전자과', '컴퓨터과', '건축과', '토목과'];
            defaultMajors.forEach(major => {
                const option = document.createElement('option');
                option.value = major;
                option.textContent = major;
                majorSelect.appendChild(option);
            });
        }
    }
});

