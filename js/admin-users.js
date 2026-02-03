// 전역 변수
let currentUser = null;
let users = [];
let editingUserId = null;

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    // 인증 확인
    auth.requireAuth();
    currentUser = auth.getCurrentUser();
    
    // 관리자가 아니면 접근 불가
    if (!currentUser || currentUser.user_type !== 'admin') {
        alert('관리자만 접근할 수 있습니다.');
        window.location.href = 'dashboard.html';
        return;
    }
    
    document.getElementById('userName').textContent = currentUser.name;
    
    // 회원 로드
    loadUsers();
    
    // 검색 입력 이벤트
    document.getElementById('searchUser').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchUsers();
        }
    });
});

// 회원 로드
async function loadUsers() {
    try {
        console.log('회원 목록 로드 시작...');
        
        // API에서 사용자 목록 가져오기
        const response = await api.get('/users?limit=1000');
        console.log('API 응답:', response);
        
        if (response && response.users) {
            users = response.users;
            console.log('로드된 회원 수:', users.length);
        } else {
            console.warn('응답에 users 속성이 없음:', response);
            users = [];
        }
        
        updateStats();
        displayUsers(users);
    } catch (error) {
        console.error('회원 로드 실패:', error);
        
        // API 실패 시 localStorage fallback
        const usersData = localStorage.getItem('graduateNetwork_users');
        if (usersData) {
            users = JSON.parse(usersData);
            console.log('localStorage에서 로드:', users.length);
            updateStats();
            displayUsers(users);
        } else {
            console.error('localStorage에도 데이터 없음');
            alert('회원 목록을 불러올 수 없습니다.');
        }
    }
}

// 통계 업데이트
function updateStats() {
    document.getElementById('totalUsers').textContent = `${users.length}명`;
    document.getElementById('studentCount').textContent = `${users.filter(u => u.user_type === 'student' || u.user_type === 'graduate').length}명`;
    document.getElementById('teacherCount').textContent = `${users.filter(u => u.user_type === 'teacher').length}명`;
    document.getElementById('companyCount').textContent = `${users.filter(u => u.user_type === 'company').length}명`;
}

// 회원 목록 표시
function displayUsers(userList) {
    const tbody = document.getElementById('usersTableBody');
    
    if (userList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #999; padding: 40px;">회원이 없습니다.</td></tr>';
        return;
    }
    
    tbody.innerHTML = userList.map(user => {
        const userTypeLabel = {
            'student': '학생',
            'graduate': '졸업생',
            'teacher': '교사',
            'company': '기업',
            'admin': '관리자'
        }[user.user_type] || user.user_type;
        
        const joinDate = user.created_at ? new Date(user.created_at).toLocaleDateString() : '-';
        const schoolName = user.school_name || user.current_company || '-';
        const major = user.major || '-';
        
        return `
            <tr>
                <td>${user.id}</td>
                <td>${user.name || '-'}</td>
                <td>${user.email || '-'}</td>
                <td><span class="badge badge-${user.user_type}">${userTypeLabel}</span></td>
                <td>${schoolName}</td>
                <td>${major}</td>
                <td>${joinDate}</td>
                <td>
                    <button class="btn-small btn-primary" onclick="editUser('${user.id}')">수정</button>
                    ${user.user_type !== 'admin' ? `<button class="btn-small btn-danger" onclick="deleteUser('${user.id}')">탈퇴</button>` : ''}
                </td>
            </tr>
        `;
    }).join('');
}

// 회원 수정
function editUser(userId) {
    const user = users.find(u => String(u.id) === String(userId));
    if (!user) return;
    
    editingUserId = userId;
    document.getElementById('editUserId').value = user.id;
    document.getElementById('editUserName').value = user.name;
    document.getElementById('editUserEmail').value = user.email;
    document.getElementById('editUserType').value = user.user_type;
    document.getElementById('editSchoolName').value = user.schoolName || user.companyName || '';
    document.getElementById('editMajor').value = user.major || user.industry || '';
    document.getElementById('editGraduationYear').value = user.graduationYear || '';
    
    document.getElementById('editUserModal').style.display = 'block';
}
window.editUser = editUser;

// 회원 저장
function saveUser(event) {
    event.preventDefault();
    
    const userId = document.getElementById('editUserId').value;
    const index = users.findIndex(u => String(u.id) === String(userId));
    
    if (index === -1) return;
    
    const userType = document.getElementById('editUserType').value;
    
    users[index] = {
        ...users[index],
        name: document.getElementById('editUserName').value,
        email: document.getElementById('editUserEmail').value,
        user_type: userType,
        schoolName: userType === 'company' ? '' : document.getElementById('editSchoolName').value,
        companyName: userType === 'company' ? document.getElementById('editSchoolName').value : '',
        major: userType !== 'company' ? document.getElementById('editMajor').value : '',
        industry: userType === 'company' ? document.getElementById('editMajor').value : '',
        graduationYear: document.getElementById('editGraduationYear').value,
        updatedAt: new Date().toISOString()
    };
    
    localStorage.setItem('graduateNetwork_users', JSON.stringify(users));
    loadUsers();
    closeEditUserModal();
    alert('회원 정보가 수정되었습니다.');
}
window.saveUser = saveUser;

// 회원 탈퇴
function deleteUser(userId) {
    const user = users.find(u => String(u.id) === String(userId));
    if (!user) return;
    
    if (!confirm(`${user.name}(${user.email}) 회원을 탈퇴 처리하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`)) return;
    
    users = users.filter(u => String(u.id) !== String(userId));
    localStorage.setItem('graduateNetwork_users', JSON.stringify(users));
    loadUsers();
    alert('회원이 탈퇴 처리되었습니다.');
}
window.deleteUser = deleteUser;

// 검색 기능
function searchUsers() {
    const searchQuery = document.getElementById('searchUser').value.toLowerCase();
    const filtered = users.filter(user => {
        const name = user.name.toLowerCase();
        const email = user.email.toLowerCase();
        
        return name.includes(searchQuery) || email.includes(searchQuery);
    });
    
    displayUsers(filtered);
}
window.searchUsers = searchUsers;

// 필터 적용
function applyFilters() {
    const userType = document.getElementById('filterUserType').value;
    const searchQuery = document.getElementById('searchUser').value.toLowerCase();
    
    let filtered = users;
    
    // 유형 필터
    if (userType) {
        filtered = filtered.filter(u => u.user_type === userType);
    }
    
    // 검색어 필터
    if (searchQuery) {
        filtered = filtered.filter(user => {
            const name = user.name.toLowerCase();
            const email = user.email.toLowerCase();
            
            return name.includes(searchQuery) || email.includes(searchQuery);
        });
    }
    
    displayUsers(filtered);
}
window.applyFilters = applyFilters;

// 모달 닫기
function closeEditUserModal() {
    document.getElementById('editUserModal').style.display = 'none';
    editingUserId = null;
}
window.closeEditUserModal = closeEditUserModal;
