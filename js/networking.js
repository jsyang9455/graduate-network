// Networking page functionality
let currentUser = null;
let allUsers = [];
let connections = [];
let messages = [];

document.addEventListener('DOMContentLoaded', function() {
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
        
        document.getElementById('userName').textContent = currentUser.name;
        
        loadConnections();
        loadMessages();
        loadAllUsers();
        updateStats();
        
        setupSearch();
        setupFilters();
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
function loadConnections() {
    const connectionsData = localStorage.getItem('graduateNetwork_connections');
    if (connectionsData) {
        connections = JSON.parse(connectionsData);
    } else {
        connections = [];
    }
}

// 메시지 로드
function loadMessages() {
    const messagesData = localStorage.getItem('graduateNetwork_messages');
    if (messagesData) {
        messages = JSON.parse(messagesData);
    } else {
        messages = [];
    }
}

// 모든 사용자 로드 (본인 제외)
function loadAllUsers() {
    const usersData = localStorage.getItem('graduateNetwork_users');
    if (usersData) {
        const users = JSON.parse(usersData);
        // 본인 제외하고 학생/졸업생만 표시
        allUsers = users.filter(u => 
            u.id !== currentUser.id && 
            (u.user_type === 'student' || u.user_type === 'graduate')
        );
    } else {
        allUsers = [];
    }
    
    displayAlumni(allUsers);
}

// 동문 목록 표시
function displayAlumni(users) {
    const alumniGrid = document.getElementById('alumniGrid');
    
    if (users.length === 0) {
        alumniGrid.innerHTML = '<p style="text-align: center; color: #999; padding: 40px; grid-column: 1/-1;">등록된 동문이 없습니다.</p>';
        return;
    }
    
    alumniGrid.innerHTML = users.map(user => {
        const isConnected = connections.some(c => 
            (c.userId === currentUser.id && c.connectedUserId === user.id) ||
            (c.connectedUserId === currentUser.id && c.userId === user.id)
        );
        
        const avatar = user.name.charAt(0);
        const graduationYear = user.graduationYear || '미상';
        const major = user.major || '전공 미상';
        const company = user.company || '정보 없음';
        const position = user.position || '직책 미상';
        
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
                    <h3>${user.name}</h3>
                    <p class="alumni-company">${company}</p>
                    <p class="alumni-position">${position}</p>
                    <div class="alumni-details">
                        <span class="detail-tag">📅 ${graduationYear}년 졸업</span>
                        <span class="detail-tag">🎓 ${major}</span>
                    </div>
                    <p class="alumni-bio">${user.email}</p>
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
function toggleConnection(userId) {
    // userId 타입 변환 처리
    const normalizedUserId = String(userId);
    const normalizedCurrentUserId = String(currentUser.id);
    
    const existingConnection = connections.findIndex(c => 
        (String(c.userId) === normalizedCurrentUserId && String(c.connectedUserId) === normalizedUserId) ||
        (String(c.connectedUserId) === normalizedCurrentUserId && String(c.userId) === normalizedUserId)
    );
    
    if (existingConnection !== -1) {
        // 연결 해제
        if (confirm('연결을 해제하시겠습니까?')) {
            connections.splice(existingConnection, 1);
            localStorage.setItem('graduateNetwork_connections', JSON.stringify(connections));
            loadAllUsers();
            updateStats();
            alert('연결이 해제되었습니다.');
        }
    } else {
        // 연결 추가
        connections.push({
            id: Date.now().toString(),
            userId: String(currentUser.id),
            connectedUserId: String(userId),
            connectedAt: new Date().toISOString()
        });
        localStorage.setItem('graduateNetwork_connections', JSON.stringify(connections));
        loadAllUsers();
        updateStats();
        alert('연결되었습니다!');
    }
}
window.toggleConnection = toggleConnection;

// 프로필 보기
function viewProfile(userId) {
    console.log('viewProfile called with userId:', userId, 'type:', typeof userId);
    console.log('allUsers:', allUsers);
    console.log('allUsers ids:', allUsers.map(u => ({ id: u.id, type: typeof u.id, name: u.name })));
    
    // userId를 문자열과 숫자 모두 비교
    const user = allUsers.find(u => u.id == userId || u.id === userId || String(u.id) === String(userId));
    console.log('Found user:', user);
    
    if (!user) {
        alert('사용자를 찾을 수 없습니다.');
        return;
    }
    
    const graduationYear = user.graduationYear || '미상';
    const major = user.major || '전공 미상';
    const company = user.company || '정보 없음';
    const position = user.position || '직책 미상';
    const schoolName = user.schoolName || '학교 미상';
    
    const profileInfo = `
========== 프로필 정보 ==========

이름: ${user.name}
이메일: ${user.email}
사용자 유형: ${user.user_type === 'student' ? '학생' : '졸업생'}

학력:
- 학교: ${schoolName}
- 전공: ${major}
- 졸업년도: ${graduationYear}

경력:
- 회사: ${company}
- 직책: ${position}

============================
    `;
    
    alert(profileInfo);
}
window.viewProfile = viewProfile;

// 메시지 보내기
function sendMessage(userId) {
    console.log('sendMessage called with userId:', userId, 'type:', typeof userId);
    
    // userId를 문자열과 숫자 모두 비교
    const user = allUsers.find(u => u.id == userId || u.id === userId || String(u.id) === String(userId));
    console.log('Found user:', user);
    
    if (!user) {
        alert('사용자를 찾을 수 없습니다.');
        return;
    }
    
    const message = prompt(`${user.name}님에게 보낼 메시지를 입력하세요:`);
    
    if (message && message.trim()) {
        const newMessage = {
            id: Date.now().toString(),
            fromUserId: String(currentUser.id),
            fromUserName: currentUser.name,
            toUserId: String(userId),
            toUserName: user.name,
            message: message.trim(),
            sentAt: new Date().toISOString(),
            read: false
        };
        
        console.log('Saving message:', newMessage);
        messages.push(newMessage);
        
        localStorage.setItem('graduateNetwork_messages', JSON.stringify(messages));
        console.log('All messages after save:', messages);
        updateStats();
        alert('메시지가 전송되었습니다!');
    }
}
window.sendMessage = sendMessage;

// 통계 업데이트
function updateStats() {
    console.log('updateStats called');
    console.log('currentUser:', currentUser);
    console.log('all messages:', messages);
    
    // 받은 메시지 수 (타입 일관성 확인)
    const receivedCount = messages.filter(m => {
        const match = String(m.toUserId) === String(currentUser.id);
        console.log(`Message toUserId: ${m.toUserId} (${typeof m.toUserId}), currentUser.id: ${currentUser.id} (${typeof currentUser.id}), match: ${match}`);
        return match;
    }).length;
    console.log('receivedCount:', receivedCount);
    
    const receivedElement = document.getElementById('receivedMessages');
    if (receivedElement) {
        receivedElement.textContent = `${receivedCount}건`;
    }
    
    // 보낸 메시지 수
    const sentCount = messages.filter(m => String(m.fromUserId) === String(currentUser.id)).length;
    console.log('sentCount:', sentCount);
    
    const sentElement = document.getElementById('sentMessages');
    if (sentElement) {
        sentElement.textContent = `${sentCount}건`;
    }
}

// 검색 설정
function setupSearch() {
    const searchInput = document.getElementById('searchAlumni');
    const searchBtn = document.querySelector('.btn-search');

    if (searchBtn) {
        searchBtn.addEventListener('click', function() {
            searchAlumni();
        });
    }
    
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchAlumni();
            }
        });
        
        // 실시간 검색
        searchInput.addEventListener('input', function() {
            searchAlumni();
        });
    }
}

// 동문 검색
function searchAlumni() {
    const searchInput = document.getElementById('searchAlumni');
    const query = searchInput.value.trim().toLowerCase();
    
    if (!query) {
        displayAlumni(allUsers);
        return;
    }
    
    const filtered = allUsers.filter(user => {
        const name = (user.name || '').toLowerCase();
        const email = (user.email || '').toLowerCase();
        const company = (user.company || '').toLowerCase();
        const position = (user.position || '').toLowerCase();
        const major = (user.major || '').toLowerCase();
        
        return name.includes(query) || 
               email.includes(query) || 
               company.includes(query) || 
               position.includes(query) ||
               major.includes(query);
    });
    
    displayAlumni(filtered);
}

// 필터 설정
function setupFilters() {
    const filters = ['filterGradYear', 'filterMajor', 'filterIndustry'];
    filters.forEach(filterId => {
        const element = document.getElementById(filterId);
        if (element) {
            element.addEventListener('change', function() {
                applyFilters();
            });
        }
    });
}

// 필터 적용
function applyFilters() {
    const gradYearFilter = document.getElementById('filterGradYear').value;
    const majorFilter = document.getElementById('filterMajor').value;
    
    let filtered = [...allUsers];
    
    // 졸업년도 필터
    if (gradYearFilter) {
        const [startYear, endYear] = gradYearFilter.split('-').map(Number);
        filtered = filtered.filter(user => {
            const gradYear = parseInt(user.graduationYear);
            return gradYear >= startYear && gradYear <= endYear;
        });
    }
    
    // 전공 필터
    if (majorFilter) {
        filtered = filtered.filter(user => {
            return (user.major || '').includes(majorFilter);
        });
    }
    
    // 검색어도 함께 적용
    const searchQuery = document.getElementById('searchAlumni').value.trim().toLowerCase();
    if (searchQuery) {
        filtered = filtered.filter(user => {
            const name = (user.name || '').toLowerCase();
            const email = (user.email || '').toLowerCase();
            const company = (user.company || '').toLowerCase();
            const position = (user.position || '').toLowerCase();
            const major = (user.major || '').toLowerCase();
            
            return name.includes(searchQuery) || 
                   email.includes(searchQuery) || 
                   company.includes(searchQuery) || 
                   position.includes(searchQuery) ||
                   major.includes(searchQuery);
        });
    }
    
    displayAlumni(filtered);
}

// 메시지함 표시
function showMessages(type) {
    console.log('showMessages called with type:', type);
    console.log('currentUser:', currentUser);
    console.log('all messages:', messages);
    
    const modal = document.getElementById('messageModal');
    const title = document.getElementById('messageModalTitle');
    const container = document.getElementById('messageListContainer');
    
    if (type === 'received') {
        title.textContent = '받은 메시지';
        const receivedMessages = messages.filter(m => {
            const match = String(m.toUserId) === String(currentUser.id);
            console.log('Checking message:', m, 'toUserId:', m.toUserId, 'currentUser.id:', currentUser.id, 'match:', match);
            return match;
        });
        console.log('receivedMessages:', receivedMessages);
        displayMessageList(receivedMessages, 'received');
    } else {
        title.textContent = '보낸 메시지';
        const sentMessages = messages.filter(m => {
            const match = String(m.fromUserId) === String(currentUser.id);
            console.log('Checking message:', m, 'fromUserId:', m.fromUserId, 'currentUser.id:', currentUser.id, 'match:', match);
            return match;
        });
        console.log('sentMessages:', sentMessages);
        displayMessageList(sentMessages, 'sent');
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
        const date = new Date(msg.sentAt);
        const formattedDate = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        const otherUser = type === 'received' ? msg.fromUserName : msg.toUserName;
        const preview = msg.message.length > 50 ? msg.message.substring(0, 50) + '...' : msg.message;
        const readClass = type === 'received' && !msg.read ? 'unread' : '';
        
        console.log('Creating message item:', msg.id, otherUser, readClass);
        
        return `
            <div class="message-item ${readClass}" onclick="showMessageDetail('${msg.id}', '${type}')">
                <div class="message-item-header">
                    <span class="message-user">${type === 'received' ? '보낸 사람' : '받는 사람'}: <strong>${otherUser}</strong></span>
                    <span class="message-date">${formattedDate}</span>
                </div>
                <div class="message-preview">${preview}</div>
                ${type === 'received' && !msg.read ? '<span class="new-badge">NEW</span>' : ''}
            </div>
        `;
    }).join('');
}

// 메시지 상세보기
function showMessageDetail(messageId, type) {
    const message = messages.find(m => m.id === messageId);
    if (!message) return;
    
    // 받은 메시지를 읽음으로 표시
    if (type === 'received' && !message.read) {
        message.read = true;
        localStorage.setItem('graduateNetwork_messages', JSON.stringify(messages));
        updateStats();
    }
    
    const modal = document.getElementById('messageDetailModal');
    const container = document.getElementById('messageDetailContainer');
    
    const date = new Date(message.sentAt);
    const formattedDate = `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    
    container.innerHTML = `
        <div class="message-detail">
            <div class="message-detail-header">
                <div class="message-detail-row">
                    <span class="message-label">보낸 사람:</span>
                    <span class="message-value">${message.fromUserName}</span>
                </div>
                <div class="message-detail-row">
                    <span class="message-label">받는 사람:</span>
                    <span class="message-value">${message.toUserName}</span>
                </div>
                <div class="message-detail-row">
                    <span class="message-label">보낸 시간:</span>
                    <span class="message-value">${formattedDate}</span>
                </div>
            </div>
            <div class="message-detail-body">
                <p>${message.message.replace(/\n/g, '<br>')}</p>
            </div>
            ${type === 'received' ? `
                <div class="message-detail-actions">
                    <button class="btn btn-primary" onclick="replyToMessage('${message.fromUserId}', '${message.fromUserName}')">답장하기</button>
                </div>
            ` : ''}
        </div>
    `;
    
    modal.style.display = 'block';
}
window.showMessageDetail = showMessageDetail;

// 답장하기
function replyToMessage(userId, userName) {
    closeMessageDetailModal();
    closeMessageModal();
    
    const message = prompt(`${userName}님에게 답장할 메시지를 입력하세요:`);
    
    if (message && message.trim()) {
        const newMessage = {
            id: Date.now().toString(),
            fromUserId: String(currentUser.id),
            fromUserName: currentUser.name,
            toUserId: String(userId),
            toUserName: userName,
            message: message.trim(),
            sentAt: new Date().toISOString(),
            read: false
        };
        
        messages.push(newMessage);
        localStorage.setItem('graduateNetwork_messages', JSON.stringify(messages));
        updateStats();
        alert('답장이 전송되었습니다!');
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