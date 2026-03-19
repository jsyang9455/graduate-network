// Counseling page functionality
document.addEventListener('DOMContentLoaded', function() {
    // Hide student-only menus for company users and redirect
    const user = auth.getCurrentUser();
    if (user && user.user_type === 'company') {
        alert('기업 계정은 진로 상담 서비스를 이용할 수 없습니다.');
        window.location.href = 'dashboard.html';
        return;
    }
    
    // Setup tab navigation
    setupTabNavigation();
    
    // Load teachers into dropdown and list
    loadTeachers();
    
    setupCounselingForm();
    setupCounselorBooking();
    setupHistoryActions();

    // Set minimum date to today
    const counselingDate = document.getElementById('counselingDate');
    if (counselingDate) {
        const today = new Date().toISOString().split('T')[0];
        counselingDate.min = today;
    }
    
    // Show/hide tabs based on user type
    if (user && user.user_type === 'teacher') {
        // Hide career menu for teacher
        const careerMenu = document.getElementById('careerMenu');
        if (careerMenu) careerMenu.style.display = 'none';
        
        document.getElementById('studentTabs').style.display = 'none';
        document.getElementById('teacherTabs').style.display = 'flex';
        document.getElementById('apply-tab').style.display = 'none';
        document.getElementById('requests-tab').style.display = 'block';
        document.getElementById('pageSubtitle').textContent = '학생들의 상담 요청을 관리하고 응답하세요';
        
        // Load counseling requests for teacher
        loadTeacherCounselingRequests();
    } else {
        // Load student's counseling requests
        loadMyCounselingRequests();
    }
});

function setupTabNavigation() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            
            // Update active button
            tabBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Update visible content
            document.querySelectorAll('.tab-content').forEach(content => {
                content.style.display = 'none';
            });
            
            const targetTab = document.getElementById(tabName + '-tab');
            if (targetTab) {
                targetTab.style.display = 'block';
            }
        });
    });
}

function loadTeachers() {
    // Get all users from localStorage
    const allUsers = JSON.parse(localStorage.getItem('graduateNetwork_users') || '[]');
    
    // Filter teachers
    const teachers = allUsers.filter(user => user.user_type === 'teacher');
    
    // Load into dropdown
    const counselorSelect = document.getElementById('counselor');
    if (counselorSelect) {
        counselorSelect.innerHTML = '<option value="">상담교사를 선택하세요</option>';
        teachers.forEach(teacher => {
            const option = document.createElement('option');
            option.value = teacher.id;
            option.textContent = `${teacher.name} 선생님 (${teacher.schoolName || '전북지역 졸업생 네트워크'})`;
            counselorSelect.appendChild(option);
        });
    }
    
    // Load into teachers list
    const teachersList = document.getElementById('teachersList');
    if (teachersList) {
        if (teachers.length === 0) {
            teachersList.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 2rem;">등록된 상담교사가 없습니다.</p>';
        } else {
            teachersList.innerHTML = teachers.map(teacher => `
                <div class="teacher-card">
                    <div class="teacher-avatar">
                        <span>${teacher.name ? teacher.name.charAt(0) : 'T'}</span>
                    </div>
                    <div class="teacher-info">
                        <h3>${teacher.name} 선생님</h3>
                        <p>🏫 ${teacher.schoolName || '전북지역 졸업생 네트워크'}</p>
                        <p>📧 ${teacher.email}</p>
                        <p>📚 전문 분야: ${teacher.subject || '종합 상담'}</p>
                    </div>
                    <div class="teacher-actions">
                        <button class="btn btn-primary" onclick="requestCounselingWithTeacher('${teacher.id}', '${teacher.name}')">상담 신청</button>
                        <button class="btn btn-secondary" onclick="sendMessageToTeacher('${teacher.id}', '${teacher.name}')">메시지 보내기</button>
                    </div>
                </div>
            `).join('');
        }
    }
}

function requestCounselingWithTeacher(teacherId, teacherName) {
    // Switch to apply tab
    document.querySelector('.tab-btn[data-tab="apply"]').click();
    
    // Pre-select the teacher
    const counselorSelect = document.getElementById('counselor');
    if (counselorSelect) {
        counselorSelect.value = teacherId;
    }
    
    // Scroll to form
    document.getElementById('counselingForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    alert(`${teacherName} 선생님과의 상담을 신청합니다.\n아래 양식을 작성해주세요.`);
}

function sendMessageToTeacher(teacherId, teacherName) {
    const message = prompt(`${teacherName} 선생님에게 보낼 메시지를 입력하세요:`);
    
    if (message && message.trim()) {
        const currentUser = auth.getCurrentUser();
        const messages = JSON.parse(localStorage.getItem('graduateNetwork_messages') || '[]');
        
        messages.push({
            id: Date.now().toString(),
            fromUserId: String(currentUser.id),
            fromUserName: currentUser.name,
            toUserId: String(teacherId),
            toUserName: teacherName,
            message: message.trim(),
            sentAt: new Date().toISOString(),
            read: false
        });
        
        localStorage.setItem('graduateNetwork_messages', JSON.stringify(messages));
        alert('메시지가 전송되었습니다!');
    }
}

window.requestCounselingWithTeacher = requestCounselingWithTeacher;
window.sendMessageToTeacher = sendMessageToTeacher;

function setupCounselingForm() {
    const form = document.getElementById('counselingForm');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();

            if (!auth.isLoggedIn()) {
                alert('로그인이 필요한 서비스입니다.');
                window.location.href = 'login.html';
                return;
            }

            const user = auth.getCurrentUser();
            const counselorId = document.getElementById('counselor').value;
            
            const formData = {
                type: document.getElementById('counselingType').value,
                counselorId: counselorId,
                title: document.getElementById('counselingTitle').value,
                content: document.getElementById('counselingContent').value,
                date: document.getElementById('counselingDate').value,
                time: document.getElementById('counselingTime').value
            };

            // Validate
            if (!formData.type || !formData.counselorId || !formData.title || !formData.content || 
                !formData.date || !formData.time) {
                alert('모든 필수 항목을 입력해주세요.');
                return;
            }

            // Get counselor name
            const users = JSON.parse(localStorage.getItem('graduateNetwork_users') || '[]');
            const counselor = users.find(u => String(u.id) === String(counselorId));
            const counselorName = counselor ? counselor.name : '선택한 선생님';

            // Save counseling request
            const counselings = JSON.parse(localStorage.getItem('counseling_requests') || '[]');
            counselings.push({
                id: Date.now().toString(),
                ...formData,
                studentId: user.id,
                studentName: user.name,
                counselorName: counselorName,
                createdAt: new Date().toISOString(),
                status: 'pending'
            });
            localStorage.setItem('counseling_requests', JSON.stringify(counselings));

            alert('상담 예약이 완료되었습니다!\n담당 선생님이 확인 후 연락드리겠습니다.');
            form.reset();
            
            // Reload student's counseling list if on my-tab
            if (document.getElementById('my-tab').style.display !== 'none') {
                loadMyCounselingRequests();
            }
        });
    }
}

function setupCounselorBooking() {
    const bookingBtns = document.querySelectorAll('.counselor-card .btn');
    bookingBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            if (!auth.isLoggedIn()) {
                alert('로그인이 필요한 서비스입니다.');
                window.location.href = 'login.html';
                return;
            }

            const card = this.closest('.counselor-card');
            const counselor = card.querySelector('h3').textContent;
            
            // Pre-fill form and scroll to it
            alert(`${counselor}와의 상담 예약을 진행합니다.\n아래 양식을 작성해주세요.`);
            document.getElementById('counselingForm').scrollIntoView({ behavior: 'smooth' });
        });
    });
}

function setupHistoryActions() {
    // Change button
    const changeBtns = document.querySelectorAll('.history-actions .btn-secondary');
    changeBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const card = this.closest('.history-card');
            const date = card.querySelector('.history-info p').textContent;
            
            if (confirm('예약을 변경하시겠습니까?')) {
                alert('예약 변경 페이지로 이동합니다.');
                // In production, this would open a modal or new page
            }
        });
    });

    // Cancel button
    const cancelBtns = document.querySelectorAll('.history-actions .btn-danger');
    cancelBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            if (confirm('정말 예약을 취소하시겠습니까?')) {
                const card = this.closest('.history-card');
                card.remove();
                alert('예약이 취소되었습니다.');
            }
        });
    });

    // Review button
    const reviewBtns = document.querySelectorAll('.history-actions .btn-primary');
    reviewBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const card = this.closest('.history-card');
            const counselor = card.querySelectorAll('.history-info p')[1].textContent;
            
            const rating = prompt('상담 만족도를 평가해주세요 (1-5):');
            if (rating && rating >= 1 && rating <= 5) {
                const review = prompt('상담 후기를 작성해주세요:');
                if (review) {
                    alert('후기가 등록되었습니다. 감사합니다!');
                    
                    // Save review
                    const reviews = JSON.parse(localStorage.getItem('counseling_reviews') || '[]');
                    reviews.push({
                        counselor: counselor,
                        rating: rating,
                        review: review,
                        reviewedAt: new Date().toISOString()
                    });
                    localStorage.setItem('counseling_reviews', JSON.stringify(reviews));
                }
            }
        });
    });
}

// Load teacher's counseling requests
function loadTeacherCounselingRequests() {
    const user = auth.getCurrentUser();
    if (!user || user.user_type !== 'teacher') return;

    const requests = JSON.parse(localStorage.getItem('counseling_requests') || '[]');
    const myRequests = requests.filter(r => String(r.counselorId) === String(user.id));

    const container = document.getElementById('counselingRequestsList');
    if (!container) return;

    if (myRequests.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 2rem;">상담 신청 내역이 없습니다.</p>';
        return;
    }

    const users = JSON.parse(localStorage.getItem('graduateNetwork_users') || '[]');
    
    container.innerHTML = myRequests.map(req => {
        // req.studentName 우선 사용 (API 로그인 사용자는 graduateNetwork_users 배열에 없을 수 있으므로)
        const student = users.find(u => String(u.id) === String(req.studentId));
        const studentName = req.studentName || (student ? student.name : '알 수 없음');
        const statusText = req.status === 'pending' ? '대기중' : req.status === 'approved' ? '승인됨' : '거절됨';
        const statusClass = req.status === 'pending' ? 'status-pending' : req.status === 'approved' ? 'status-approved' : 'status-rejected';
        
        return `
            <div class="request-card" data-request-id="${req.id}">
                <div class="request-header">
                    <div>
                        <h3>${studentName} 학생</h3>
                        <span class="request-type">${req.type}</span>
                        <span class="request-status ${statusClass}">${statusText}</span>
                    </div>
                    <div class="request-date">${new Date(req.createdAt).toLocaleDateString('ko-KR')}</div>
                </div>
                <div class="request-body">
                    <h4>${req.title}</h4>
                    <p>${req.content}</p>
                    <div class="request-info">
                        <span>📅 희망 날짜: ${req.date}</span>
                        <span>🕐 희망 시간: ${req.time}</span>
                    </div>
                </div>
                ${req.status === 'pending' ? `
                    <div class="request-actions">
                        <button class="btn btn-primary" onclick="approveCounselingRequest('${req.id}', '${studentName}')">✓ 승인</button>
                        <button class="btn btn-danger" onclick="rejectCounselingRequest('${req.id}', '${studentName}')">✗ 거절</button>
                    </div>
                ` : req.responseMessage ? `
                    <div class="request-response">
                        <strong>응답 메시지:</strong> ${req.responseMessage}
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

// Approve counseling request
function approveCounselingRequest(requestId, studentName) {
    const message = prompt(`${studentName} 학생의 상담 신청을 승인합니다.\n학생에게 전달할 메시지를 입력하세요:`, '상담 신청이 승인되었습니다. 지정하신 날짜와 시간에 만나요!');
    
    if (message === null) return; // Cancel clicked
    
    const user = auth.getCurrentUser();
    const requests = JSON.parse(localStorage.getItem('counseling_requests') || '[]');
    const requestIndex = requests.findIndex(r => r.id === requestId);
    
    if (requestIndex === -1) {
        alert('요청을 찾을 수 없습니다.');
        return;
    }
    
    // Update request status
    requests[requestIndex].status = 'approved';
    requests[requestIndex].responseMessage = message;
    requests[requestIndex].respondedAt = new Date().toISOString();
    localStorage.setItem('counseling_requests', JSON.stringify(requests));
    
    // Send message to student (networking.js 필드명과 통일)
    const messages = JSON.parse(localStorage.getItem('graduateNetwork_messages') || '[]');
    const req = requests[requestIndex];
    messages.push({
        id: Date.now().toString(),
        fromUserId: String(user.id),
        fromUserName: user.name,
        toUserId: String(req.studentId),
        toUserName: req.studentName || studentName,
        message: `[상담 승인] ${message}`,
        sentAt: new Date().toISOString(),
        read: false
    });
    localStorage.setItem('graduateNetwork_messages', JSON.stringify(messages));
    
    alert('상담 신청이 승인되었으며, 학생에게 메시지가 전송되었습니다.');
    loadTeacherCounselingRequests(); // Reload list
}

// Reject counseling request
function rejectCounselingRequest(requestId, studentName) {
    const message = prompt(`${studentName} 학생의 상담 신청을 거절합니다.\n학생에게 전달할 사유를 입력하세요:`, '죄송합니다. 해당 시간에 다른 일정이 있어 상담이 어렵습니다. 다른 날짜로 다시 신청해주세요.');
    
    if (message === null) return; // Cancel clicked
    
    const user = auth.getCurrentUser();
    const requests = JSON.parse(localStorage.getItem('counseling_requests') || '[]');
    const requestIndex = requests.findIndex(r => r.id === requestId);
    
    if (requestIndex === -1) {
        alert('요청을 찾을 수 없습니다.');
        return;
    }
    
    // Update request status
    requests[requestIndex].status = 'rejected';
    requests[requestIndex].responseMessage = message;
    requests[requestIndex].respondedAt = new Date().toISOString();
    localStorage.setItem('counseling_requests', JSON.stringify(requests));
    
    // Send message to student (networking.js 필드명과 통일)
    const messages = JSON.parse(localStorage.getItem('graduateNetwork_messages') || '[]');
    const req = requests[requestIndex];
    messages.push({
        id: Date.now().toString(),
        fromUserId: String(user.id),
        fromUserName: user.name,
        toUserId: String(req.studentId),
        toUserName: req.studentName || studentName,
        message: `[상담 거절] ${message}`,
        sentAt: new Date().toISOString(),
        read: false
    });
    localStorage.setItem('graduateNetwork_messages', JSON.stringify(messages));
    
    alert('상담 신청이 거절되었으며, 학생에게 메시지가 전송되었습니다.');
    loadTeacherCounselingRequests(); // Reload list
}

// Load student's counseling requests
function loadMyCounselingRequests() {
    const user = auth.getCurrentUser();
    if (!user || user.user_type === 'teacher') return;

    const requests = JSON.parse(localStorage.getItem('counseling_requests') || '[]');
    const myRequests = requests.filter(r => String(r.studentId) === String(user.id));

    const container = document.getElementById('myCounselingList');
    if (!container) return;

    if (myRequests.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 2rem;">신청한 상담 내역이 없습니다.</p>';
        return;
    }

    const users = JSON.parse(localStorage.getItem('graduateNetwork_users') || '[]');
    
    container.innerHTML = myRequests.map(req => {
        const teacher = users.find(u => String(u.id) === String(req.counselorId));
        const teacherName = req.counselorName || (teacher ? teacher.name : '알 수 없음');
        const statusText = req.status === 'pending' ? '대기중' : req.status === 'approved' ? '승인됨' : '거절됨';
        const statusClass = req.status === 'pending' ? 'status-pending' : req.status === 'approved' ? 'status-approved' : 'status-rejected';
        
        return `
            <div class="request-card">
                <div class="request-header">
                    <div>
                        <h3>${teacherName} 선생님</h3>
                        <span class="request-type">${req.type}</span>
                        <span class="request-status ${statusClass}">${statusText}</span>
                    </div>
                    <div class="request-date">${new Date(req.createdAt).toLocaleDateString('ko-KR')}</div>
                </div>
                <div class="request-body">
                    <h4>${req.title}</h4>
                    <p>${req.content}</p>
                    <div class="request-info">
                        <span>📅 희망 날짜: ${req.date}</span>
                        <span>🕐 희망 시간: ${req.time}</span>
                    </div>
                </div>
                ${req.responseMessage ? `
                    <div class="request-response ${req.status === 'approved' ? 'response-approved' : 'response-rejected'}">
                        <strong>${req.status === 'approved' ? '✓ 승인 메시지:' : '✗ 거절 사유:'}</strong> 
                        <p>${req.responseMessage}</p>
                        <small>${new Date(req.respondedAt).toLocaleString('ko-KR')}</small>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}
