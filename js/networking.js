// Networking page functionality
let currentUser = null;
let allUsers = [];
let connections = [];
let messages = { inbox: [], sent: [] };
let isStudentView = false;

document.addEventListener('DOMContentLoaded', async function() {
    // Initialize auth and load data
    auth.requireAuth();
    currentUser = auth.getCurrentUser();
    
    if (currentUser) {
        // Hide student-only menus for company users
        if (currentUser.user_type === 'company') {
            hideStudentMenuItems();
        }
        // Hide career menu for teacher users
        if (currentUser.user_type === 'teacher') {
            hideCareerMenuForTeacher();
        }
        
        isStudentView = (currentUser.user_type === 'student');
        
        document.getElementById('userName').textContent = currentUser.name;
        
        await loadConnections();
        await loadMessages();
        
        // 학생은 검색 전 결과 없음 표시, 비학생은 전체 로드
        if (isStudentView) {
            showSearchPrompt();
        } else {
            await loadAllUsers();
        }
        
        updateStats();
        setupFilters();
        loadMajorFilter();
    }
});

function hideStudentMenuItems() {
    const counselingMenu = document.getElementById('counselingMenu');
    const careerMenu = document.getElementById('careerMenu');
    
    if (counselingMenu) counselingMenu.style.display = 'none';
    if (careerMenu) careerMenu.style.display = 'none';
}

function hideCareerMenuForTeacher() {
    const careerMenu = document.getElementById('careerMenu');
    if (careerMenu) careerMenu.style.display = 'none';
}

// 연결 정보 로드
async function loadConnections() {
    try {
        const data = await api.get('/networking/connections');
        connections = (data.connections || []).map(c => ({
            id: String(c.id),
            userId: String(c.requester_id || c.connection_id),
            connectedUserId: String(c.connection_id || c.receiver_id),
            raw: c
        }));
    } catch (err) {
        console.warn('Connections load failed:', err.message);
        connections = [];
    }
}

// 메시지 로드 (API)
async function loadMessages() {
    try {
        const [inboxData, sentData] = await Promise.all([
            api.get('/messages/inbox'),
            api.get('/messages/sent')
        ]);
        messages = {
            inbox: inboxData.messages || [],
            sent: sentData.messages || []
        };
    } catch (err) {
        console.warn('Messages load failed:', err.message);
        messages = { inbox: [], sent: [] };
    }
}

// 모든 사용자 로드 (비학생용 - 기본 전체 목록)
async function loadAllUsers() {
    try {
        const params = isStudentView ? 'user_type=graduate' : 'user_type=student,graduate';
        const excludeParam = '&exclude_user_id=' + currentUser.id;
        const data = await api.get('/users?' + params + excludeParam + '&limit=200');
        allUsers = data.users || [];
    } catch (err) {
        console.warn('Users load failed:', err.message);
        allUsers = [];
    }
    displayAlumni(allUsers);
}

// 이름 마스킹: 김재현 → 김*현
function maskName(name) {
    if (!name) return '이름 없음';
    if (name.length === 1) return name;
    if (name.length === 2) return name.charAt(0) + '*';
    return name.charAt(0) + '*'.repeat(name.length - 2) + name.charAt(name.length - 1);
}

// 검색 전 안내 메시지 표시
function showSearchPrompt() {
    const alumniGrid = document.getElementById('alumniGrid');
    alumniGrid.innerHTML = '<div style="text-align:center; color:#6b7280; padding:60px 20px; grid-column: 1/-1;"><p style="font-size:1.2rem; margin-bottom:8px;">🔍 졸업생을 검색하세요</p><p style="font-size:0.9rem;">졸업연도, 학교명, 전공을 입력 후 검색 버튼을 눌러주세요.</p></div>';
}

// 동문 목록 표시
function displayAlumni(users) {
    const alumniGrid = document.getElementById('alumniGrid');
    
    if (users.length === 0) {
        alumniGrid.innerHTML = '<p style="text-align: center; color: #999; padding: 40px; grid-column: 1/-1;">검색 결과가 없습니다.</p>';
        return;
    }
    
    alumniGrid.innerHTML = users.map(user => {
        const uid = String(user.id);
        const curUid = String(currentUser.id);
        const isConnected = connections.some(c =>
            (String(c.userId) === curUid && String(c.connectedUserId) === uid) ||
            (String(c.connectedUserId) === curUid && String(c.userId) === uid)
        );
        
        const displayName = isStudentView ? maskName(user.name) : (user.name || '이름 없음');
        const avatar = displayName.charAt(0);
        const graduationYear = user.graduation_year || user.gp_graduation_year || '미상';
        const major = user.gp_major || user.major || '전공 미상';
        const company = user.current_company || '정보 없음';
        const position = user.current_position || '직책 미상';
        
        return `
            <div class="alumni-card" data-user-id="${user.id}">
                <div class="alumni-header">
                    <div class="alumni-avatar">${avatar}</div>
                    <button class="btn-connect ${isConnected ? 'connected' : ''}" 
                            onclick="toggleConnection('${user.id}')">
                        ${isConnected ? '연결됨' : '연결하기'}
                    </button>
                </div>
                <div class="alumni-info">
                    <h3>${displayName}</h3>
                    <p class="alumni-company">${company}</p>
                    <p class="alumni-position">${position}</p>
                    <div class="alumni-details">
                        <span class="detail-tag">📅 ${graduationYear}년 졸업</span>
                        <span class="detail-tag">🎓 ${major}</span>
                    </div>
                </div>
                <div class="alumni-actions">
                    <button class="btn btn-secondary" onclick="viewProfile('${user.id}')">프로필 보기</button>
                    <button class="btn btn-primary" onclick="sendMessage('${user.id}')">메시지 보내기</button>
                </div>
            </div>
        `;
    }).join('');
}

// 연결 토글
async function toggleConnection(userId) {
    const uid = String(userId);
    const curUid = String(currentUser.id);

    const existingIdx = connections.findIndex(c =>
        (String(c.userId) === curUid && String(c.connectedUserId) === uid) ||
        (String(c.connectedUserId) === curUid && String(c.userId) === uid)
    );

    if (existingIdx !== -1) {
        if (!confirm('연결을 해제하시겠습니까?')) return;
        try {
            await api.delete('/networking/connect/' + userId);
            connections.splice(existingIdx, 1);
            displayAlumni(allUsers);
            updateStats();
            alert('연결이 해제되었습니다.');
        } catch (err) {
            alert('연결 해제 실패: ' + err.message);
        }
    } else {
        try {
            await api.post('/networking/connect/' + userId, {});
            await loadConnections();
            displayAlumni(allUsers);
            updateStats();
            alert('연결 요청이 전송되었습니다!');
        } catch (err) {
            if (err.message && err.message.includes('already exists')) {
                alert('이미 연결 요청을 보냈습니다.');
            } else {
                alert('연결 실패: ' + err.message);
            }
        }
    }
}
window.toggleConnection = toggleConnection;

// 프로필 보기
function viewProfile(userId) {
    const user = allUsers.find(u => String(u.id) === String(userId));
    
    if (!user) {
        alert('사용자를 찾을 수 없습니다.');
        return;
    }
    
    const displayName = isStudentView ? maskName(user.name) : (user.name || '이름 없음');
    const graduationYear = user.graduation_year || user.gp_graduation_year || '미상';
    const major = user.gp_major || user.major || '전공 미상';
    const company = user.current_company || '정보 없음';
    const position = user.current_position || '직책 미상';
    const schoolName = user.school_name || '학교 미상';
    
    const profileInfo = `
========== 프로필 정보 ==========

이름: ${displayName}
사용자 유형: 졸업생

학력:
- 학교: ${schoolName}
- 전공: ${major}
- 졸업년도: ${graduationYear}년

경력:
- 회사: ${company}
- 직책: ${position}

============================
    `;
    
    alert(profileInfo);
}
window.viewProfile = viewProfile;

// 메시지 보내기 (API)
async function sendMessage(userId) {
    const user = allUsers.find(u => String(u.id) === String(userId));
    if (!user) { alert('사용자를 찾을 수 없습니다.'); return; }

    const message = prompt(`${user.name}님에게 보낼 메시지를 입력하세요:`);
    if (message && message.trim()) {
        try {
            await api.post('/messages', { to_user_id: userId, message: message.trim() });
            await loadMessages();
            updateStats();
            alert('메시지가 전송되었습니다!');
        } catch (err) {
            alert('전송 실패: ' + (err.message || '오류가 발생했습니다.'));
        }
    }
}
window.sendMessage = sendMessage;

// 통계 업데이트
function updateStats() {
    const receivedCount = (messages.inbox || []).length;
    const sentCount = (messages.sent || []).length;

    const receivedElement = document.getElementById('receivedMessages');
    if (receivedElement) receivedElement.textContent = `${receivedCount}건`;

    const sentElement = document.getElementById('sentMessages');
    if (sentElement) sentElement.textContent = `${sentCount}건`;
}

// 검색 설정 (비학생 전용 실시간 검색 - 현재는 사용 안함)
function setupSearch() {
    // setupFilters()에서 통합 처리
}

// 졸업생 검색 (학생 전용 - 버튼 클릭 시)
async function searchGraduates() {
    const gradYear = document.getElementById('filterGradYear')?.value?.trim();
    const school = document.getElementById('filterSchool')?.value?.trim();
    const major = document.getElementById('filterMajor')?.value?.trim();

    // 학생의 경우 최소 하나의 조건 필요
    if (isStudentView && !gradYear && !school && !major) {
        alert('졸업연도, 학교명, 전공 중 하나 이상의 조건을 입력해 주세요.');
        return;
    }

    try {
        let params = 'user_type=graduate&exclude_user_id=' + currentUser.id + '&limit=200';
        if (gradYear) params += '&graduation_year=' + encodeURIComponent(gradYear);
        if (school) params += '&school_name=' + encodeURIComponent(school);
        if (major) params += '&major=' + encodeURIComponent(major);

        const data = await api.get('/users?' + params);
        allUsers = data.users || [];
        displayAlumni(allUsers);
    } catch (err) {
        console.warn('Graduate search failed:', err.message);
        allUsers = [];
        displayAlumni([]);
    }
}
window.searchGraduates = searchGraduates;

// 검색 초기화
function resetSearch() {
    const gradYearEl = document.getElementById('filterGradYear');
    const schoolEl = document.getElementById('filterSchool');
    const majorEl = document.getElementById('filterMajor');
    if (gradYearEl) gradYearEl.value = '';
    if (schoolEl) schoolEl.value = '';
    if (majorEl) majorEl.value = '';

    allUsers = [];
    if (isStudentView) {
        showSearchPrompt();
    } else {
        loadAllUsers();
    }
}
window.resetSearch = resetSearch;

// 전공 필터 옵션 동적 로드 (회원가입과 동일한 목록)
async function loadMajorFilter() {
    const majorSelect = document.getElementById('filterMajor');
    if (!majorSelect) return;

    try {
        const response = await api.get('/majors');
        const majors = response.majors || [];

        // 기존 옵션 제거 (첫 번째 "전공" 옵션 제외)
        while (majorSelect.options.length > 1) {
            majorSelect.remove(1);
        }

        majors.forEach(major => {
            const option = document.createElement('option');
            option.value = major.name;
            option.textContent = major.name;
            majorSelect.appendChild(option);
        });
    } catch (error) {
        console.error('전공 목록 로드 실패:', error);
        // API 실패 시 기본 학과 목록 사용
        const defaultMajors = ['기계과', '전기과', '전자과', '컴퓨터과', '건축과', '토목과'];
        while (majorSelect.options.length > 1) majorSelect.remove(1);
        defaultMajors.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            majorSelect.appendChild(option);
        });
    }
}

// 필터 설정 (Enter 키로도 검색)
function setupFilters() {
    const gradYearEl = document.getElementById('filterGradYear');
    const schoolEl = document.getElementById('filterSchool');
    const majorEl = document.getElementById('filterMajor');

    [gradYearEl, schoolEl].forEach(el => {
        if (el) {
            el.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') searchGraduates();
            });
        }
    });

    if (majorEl) {
        majorEl.addEventListener('change', function() {
            // 비학생은 전공 변경 시 자동 검색
            if (!isStudentView) searchGraduates();
        });
    }
}

// 기존 applyFilters 제거 (searchGraduates로 통합)

// 메시지함 표시
function showMessages(type) {
    const modal = document.getElementById('messageModal');
    const title = document.getElementById('messageModalTitle');

    if (type === 'received') {
        title.textContent = '받은 메시지';
        displayMessageList(messages.inbox || [], 'received');
    } else {
        title.textContent = '보낸 메시지';
        displayMessageList(messages.sent || [], 'sent');
    }

    modal.style.display = 'block';
}
window.showMessages = showMessages;

// 메시지 리스트 표시
function displayMessageList(messageList, type) {
    console.log('displayMessageList called with:', messageList.length, 'messages, type:', type);
    const container = document.getElementById('messageListContainer');
    
    if (messageList.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">메시지가 없습니다.</p>';
        return;
    }
    
    container.innerHTML = messageList.map(msg => {
        const date = new Date(msg.sent_at);
        const formattedDate = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        const otherUser = type === 'received' ? (msg.from_user_name || '알 수 없음') : (msg.to_user_name || '알 수 없음');
        const preview = (msg.message || '').length > 50 ? msg.message.substring(0, 50) + '...' : (msg.message || '');
        const readClass = type === 'received' && !msg.is_read ? 'unread' : '';

        return `
            <div class="message-item ${readClass}" onclick="showMessageDetail(${msg.id}, '${type}')">
                <div class="message-item-header">
                    <span class="message-user">${type === 'received' ? '보낸 사람' : '받는 사람'}: <strong>${otherUser}</strong></span>
                    <span class="message-date">${formattedDate}</span>
                </div>
                <div class="message-preview">${preview}</div>
                ${type === 'received' && !msg.is_read ? '<span class="new-badge">NEW</span>' : ''}
            </div>
        `;
    }).join('');
}

// 메시지 상세보기 (API)
async function showMessageDetail(messageId, type) {
    // 현재 로드된 메시지 목록에서 찾기
    const list = type === 'received' ? (messages.inbox || []) : (messages.sent || []);
    const message = list.find(m => m.id == messageId);
    if (!message) return;

    // 받은 메시지를 읽음으로 표시 (API)
    if (type === 'received' && !message.is_read) {
        try {
            await api.put(`/messages/${messageId}/read`, {});
            message.is_read = true;
        } catch (err) {
            console.warn('읽음 처리 실패:', err.message);
        }
    }

    const modal = document.getElementById('messageDetailModal');
    const container = document.getElementById('messageDetailContainer');

    const date = new Date(message.sent_at);
    const formattedDate = `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

    container.innerHTML = `
        <div class="message-detail">
            <div class="message-detail-header">
                <div class="message-detail-row">
                    <span class="message-label">보낸 사람:</span>
                    <span class="message-value">${message.from_user_name || '-'}</span>
                </div>
                <div class="message-detail-row">
                    <span class="message-label">받는 사람:</span>
                    <span class="message-value">${message.to_user_name || '-'}</span>
                </div>
                <div class="message-detail-row">
                    <span class="message-label">보낸 시간:</span>
                    <span class="message-value">${formattedDate}</span>
                </div>
            </div>
            <div class="message-detail-body">
                <p>${(message.message || '').replace(/\n/g, '<br>')}</p>
            </div>
            ${type === 'received' ? `
                <div class="message-detail-actions">
                    <button class="btn btn-primary" onclick="replyToMessage('${message.from_user_id}', '${message.from_user_name}')">답장하기</button>
                </div>
            ` : ''}
        </div>
    `;

    modal.style.display = 'block';
}
window.showMessageDetail = showMessageDetail;

// 답장하기 (API)
async function replyToMessage(userId, userName) {
    closeMessageDetailModal();
    closeMessageModal();

    const message = prompt(`${userName}님에게 답장할 메시지를 입력하세요:`);
    if (message && message.trim()) {
        try {
            await api.post('/messages', { to_user_id: userId, message: message.trim() });
            await loadMessages();
            updateStats();
            alert('답장이 전송되었습니다!');
        } catch (err) {
            alert('전송 실패: ' + (err.message || '오류가 발생했습니다.'));
        }
    }
}
window.replyToMessage = replyToMessage;

// 메시지 모달 닫기
function closeMessageModal() {
    document.getElementById('messageModal').style.display = 'none';
}
window.closeMessageModal = closeMessageModal;

// 메시지 상세 모달 닫기
function closeMessageDetailModal() {
    document.getElementById('messageDetailModal').style.display = 'none';
}
window.closeMessageDetailModal = closeMessageDetailModal;