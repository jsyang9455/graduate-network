// Register functionality
document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('registerForm');
    const graduationYearSelect = document.getElementById('graduationYear');
    const registerError = document.getElementById('registerError');
    const registerSuccess = document.getElementById('registerSuccess');
    const studentFields = document.getElementById('studentFields');
    const userTypeRadios = document.querySelectorAll('input[name="userType"]');

    // Populate graduation years
    populateGraduationYears();

    // Handle user type change
    userTypeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.value === 'teacher') {
                studentFields.style.display = 'none';
                // Remove required from student fields
                document.getElementById('graduationYear').removeAttribute('required');
                document.getElementById('major').removeAttribute('required');
            } else {
                studentFields.style.display = 'block';
                // Add required to student fields
                document.getElementById('graduationYear').setAttribute('required', 'required');
                document.getElementById('major').setAttribute('required', 'required');
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
            phone: document.getElementById('phone').value,
            agreeTerms: document.getElementById('agreeTerms').checked,
            agreePrivacy: document.getElementById('agreePrivacy').checked,
            agreeMarketing: document.getElementById('agreeMarketing').checked
        };

        // Add student-specific fields only if student type
        if (userType === 'student') {
            formData.graduationYear = graduationYearSelect.value;
            formData.major = document.getElementById('major').value;
            formData.company = document.getElementById('company').value;
            formData.position = document.getElementById('position').value;
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
            // localStorage에 사용자 저장 (테스트용)
            let users = JSON.parse(localStorage.getItem('graduateNetwork_users') || '[]');
            
            // 이메일 중복 체크
            if (users.some(u => u.email === formData.email)) {
                showError('이미 등록된 이메일입니다.');
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
                return;
            }
            
            // 새 사용자 추가
            const newUser = {
                id: users.length + 1,
                email: formData.email,
                password: formData.password,
                name: formData.name,
                user_type: formData.userType === 'teacher' ? 'teacher' : 'graduate',
                phone: formData.phone,
                schoolName: formData.schoolName,
                registeredAt: new Date().toISOString()
            };

            // Add student-specific fields
            if (formData.userType === 'student') {
                newUser.graduationYear = formData.graduationYear;
                newUser.major = formData.major;
                newUser.company = formData.company;
                newUser.position = formData.position;
            }
            
            users.push(newUser);
            localStorage.setItem('graduateNetwork_users', JSON.stringify(users));

            // Show success message
            showSuccess('회원가입이 완료되었습니다! 로그인 페이지로 이동합니다...');

            // Redirect to login page after 2 seconds
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
        console.log('Populating graduation years...');
        console.log('graduationYearSelect:', graduationYearSelect);
        const currentYear = 2026;
        const startYear = 2022;
        for (let year = currentYear; year >= startYear; year--) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year + '년';
            graduationYearSelect.appendChild(option);
        }
        console.log('Graduation years populated:', graduationYearSelect.options.length);
    }

    function validateForm(data) {
        // Check required fields (common for all users)
        if (!data.name || !data.email || !data.password || !data.schoolName || !data.phone) {
            showError('필수 항목을 모두 입력해주세요.');
            return false;
        }

        // Check student-specific required fields
        if (data.userType === 'student') {
            if (!data.graduationYear || !data.major) {
                showError('필수 항목을 모두 입력해주세요.');
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

        // Check phone format
        const phoneRegex = /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/;
        if (!phoneRegex.test(data.phone.replace(/-/g, ''))) {
            showError('올바른 연락처 형식이 아닙니다. (예: 010-1234-5678)');
            return false;
        }

        // Check agreement
        if (!data.agreeTerms || !data.agreePrivacy) {
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
});
