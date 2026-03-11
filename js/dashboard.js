// Dashboard functionality
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    if (!auth.requireAuth()) {
        return;
    }

    // Display user name and customize dashboard based on user type
    const user = auth.getCurrentUser();
    
    // Update welcome message
    const welcomeMessage = document.getElementById('welcomeMessage');
    const welcomeSubtext = document.getElementById('welcomeSubtext');
    if (welcomeMessage && user) {
        welcomeMessage.textContent = `환영합니다, ${user.name}님!`;
        
        const hour = new Date().getHours();
        let greeting = '좋은 하루 되세요';
        if (hour < 12) greeting = '좋은 아침입니다';
        else if (hour < 18) greeting = '좋은 오후입니다';
        else greeting = '좋은 저녁입니다';
        
        if (welcomeSubtext) {
            welcomeSubtext.textContent = greeting;
        }
    }

    // Show admin menu if user is admin
    if (user && user.user_type === 'admin') {
        const adminMenuSection = document.getElementById('adminMenuSection');
        if (adminMenuSection) {
            adminMenuSection.style.display = 'block';
        }
    }

    // Show appropriate dashboard based on user type
    console.log('Current user:', user);
    console.log('User type:', user ? user.user_type : 'none');
    
    if (user && user.user_type === 'admin') {
        showAdminDashboard();
    } else if (user && user.user_type === 'company') {
        showCompanyDashboard();
        hideStudentMenuItems();
    } else if (user && user.user_type === 'teacher') {
        showTeacherDashboard();
    } else {
        // student, graduate, or other types
        showDefaultDashboard();
    }

    // Setup event listeners
    setupJobApplications();
});

function showDefaultDashboard() {
    const defaultDashboard = document.getElementById('defaultDashboard');
    const companyDashboard = document.getElementById('companyDashboard');
    
    if (defaultDashboard) defaultDashboard.style.display = 'block';
    if (companyDashboard) companyDashboard.style.display = 'none';
    
    // Load student/graduate dashboard data
    loadStudentStats();
    loadRecommendedJobs();
    loadRecentNews();
    loadEducationPrograms();
}

function hideStudentMenuItems() {
    // Hide counseling and career menu items for company users
    const counselingMenu = document.getElementById('counselingMenu');
    const careerMenu = document.getElementById('careerMenu');
    
    if (counselingMenu) counselingMenu.style.display = 'none';
    if (careerMenu) careerMenu.style.display = 'none';
}

function hideCareerMenuForTeacher() {
    // Hide career menu for teacher users
    const careerMenu = document.getElementById('careerMenu');
    if (careerMenu) careerMenu.style.display = 'none';
}

function showTeacherDashboard() {
    hideCareerMenuForTeacher();
    const defaultDashboard = document.getElementById('defaultDashboard');
    const companyDashboard = document.getElementById('companyDashboard');
    
    // Show company dashboard for teachers (same as company users)
    if (defaultDashboard) defaultDashboard.style.display = 'none';
    if (companyDashboard) {
        companyDashboard.style.display = 'block';
        
        // Customize welcome message for teachers
        const welcomeMessage = document.getElementById('welcomeMessage');
        if (welcomeMessage) {
            const user = auth.getCurrentUser();
            welcomeMessage.textContent = `환영합니다, ${user.name} 선생님!`;
        }
    }
    
    // Load company dashboard data (job postings and applicants)
    loadCompanyStats();
    loadCompanyJobPostings();
    loadRecentApplicants();
    loadTeacherCounselingRequests();
    loadRecentNewsForCompany();
    loadEducationProgramsForCompany();
    setupCompanyEventListeners();
}

function showAdminDashboard() {
    const defaultDashboard = document.getElementById('defaultDashboard');
    const companyDashboard = document.getElementById('companyDashboard');
    
    // Show default dashboard for admins
    if (defaultDashboard) defaultDashboard.style.display = 'block';
    if (companyDashboard) companyDashboard.style.display = 'none';
    
    // Customize welcome message for admin
    const welcomeMessage = document.getElementById('welcomeMessage');
    if (welcomeMessage) {
        const user = auth.getCurrentUser();
        welcomeMessage.textContent = `환영합니다, ${user.name} 관리자님!`;
    }
    
    // Load admin dashboard data
    loadAdminStats();
    loadRecommendedJobs();
    loadRecentNews();
    loadEducationPrograms();
}

function loadAdminStats() {
    const user = auth.getCurrentUser();
    if (!user) return;
    
    // Load total users count
    const users = JSON.parse(localStorage.getItem('graduateNetwork_users') || '[]');
    const totalUsersElement = document.getElementById('networkCount');
    if (totalUsersElement) {
        totalUsersElement.textContent = users.length;
    }
    
    // Load total job postings count
    const jobPostings = JSON.parse(localStorage.getItem('jobPostings') || '[]');
    const totalJobsElement = document.getElementById('appliedJobsCount');
    if (totalJobsElement) {
        totalJobsElement.textContent = jobPostings.length;
    }
    
    // Load counseling requests count
    const counselingRequests = JSON.parse(localStorage.getItem('counseling_requests') || '[]');
    const counselingCountElement = document.getElementById('savedJobsCount');
    if (counselingCountElement) {
        counselingCountElement.textContent = counselingRequests.length;
    }
}

function loadTeacherStats() {
    const user = auth.getCurrentUser();
    if (!user) return;
    
    // Load counseling requests (mock data for now)
    const newJobCount = document.getElementById('newJobCount');
    if (newJobCount) {
        newJobCount.textContent = '5';
    }
    
    // Load application count (students counseled)
    const applicationCount = document.getElementById('applicationCount');
    if (applicationCount) {
        applicationCount.textContent = '12';
        // Change label for teacher
        const parent = applicationCount.parentElement;
        if (parent) {
            const label = parent.querySelector('p');
            if (label) label.textContent = '상담 요청';
        }
    }
    
    // Load network connections
    const connections = JSON.parse(localStorage.getItem('graduateNetwork_connections') || '[]');
    const myConnections = connections.filter(c => 
        String(c.userId) === String(user.id) || String(c.connectedUserId) === String(user.id)
    );
    const networkCount = document.getElementById('networkCount');
    if (networkCount) {
        networkCount.textContent = myConnections.length;
    }
    
    // Load messages
    const messages = JSON.parse(localStorage.getItem('graduateNetwork_messages') || '[]');
    const unreadMessages = messages.filter(m => 
        String(m.toUserId) === String(user.id) && !m.read
    );
    const messageCount = document.getElementById('messageCount');
    if (messageCount) {
        messageCount.textContent = unreadMessages.length;
    }
}

function loadStudentStats() {
    const user = auth.getCurrentUser();
    if (!user) return;
    
    // Load jobs
    const jobs = JSON.parse(localStorage.getItem('jobPostings') || '[]');
    const activeJobs = jobs.filter(j => j.status === 'active');
    const newJobCount = document.getElementById('newJobCount');
    if (newJobCount) {
        newJobCount.textContent = activeJobs.length;
    }
    
    // Load applications (mock data)
    const applicationCount = document.getElementById('applicationCount');
    if (applicationCount) {
        applicationCount.textContent = Math.floor(Math.random() * 5);
    }
    
    // Load network connections
    const connections = JSON.parse(localStorage.getItem('graduateNetwork_connections') || '[]');
    const myConnections = connections.filter(c => 
        String(c.userId) === String(user.id) || String(c.connectedUserId) === String(user.id)
    );
    const networkCount = document.getElementById('networkCount');
    if (networkCount) {
        networkCount.textContent = myConnections.length;
    }
    
    // Load messages
    const messages = JSON.parse(localStorage.getItem('graduateNetwork_messages') || '[]');
    const unreadMessages = messages.filter(m => 
        String(m.toUserId) === String(user.id) && !m.read
    );
    const messageCount = document.getElementById('messageCount');
    if (messageCount) {
        messageCount.textContent = unreadMessages.length;
    }
}

function loadRecommendedJobs() {
    const recommendedJobsContainer = document.getElementById('recommendedJobs');
    if (!recommendedJobsContainer) return;
    
    const jobs = JSON.parse(localStorage.getItem('jobPostings') || '[]');
    const activeJobs = jobs.filter(j => j.status === 'active').slice(0, 3);
    
    if (activeJobs.length === 0) {
        recommendedJobsContainer.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 2rem;">추천 채용공고가 없습니다.</p>';
        return;
    }
    
    recommendedJobsContainer.innerHTML = activeJobs.map(job => `
        <div class="job-card">
            <div class="job-card-header">
                <h3>${job.companyName || '회사명'}</h3>
                <span class="job-badge">${job.status === 'active' ? '모집중' : '마감'}</span>
            </div>
            <div class="job-card-body">
                <h4>${job.jobTitle || job.title}</h4>
                <div class="job-meta">
                    <span>📍 ${job.location || '위치 미정'}</span>
                    <span>💰 ${job.salary || '협의'}</span>
                    <span>📅 ${job.deadline || '상시채용'}</span>
                </div>
                <p class="job-description">${(job.description || '').substring(0, 80)}...</p>
            </div>
            <div class="job-card-footer">
                <button class="btn btn-primary btn-sm" onclick="location.href='jobs.html'">지원하기</button>
                <button class="btn btn-secondary btn-sm" onclick="location.href='jobs.html'">자세히보기</button>
            </div>
        </div>
    `).join('');
}

function showCompanyDashboard() {
    const defaultDashboard = document.getElementById('defaultDashboard');
    const companyDashboard = document.getElementById('companyDashboard');
    
    if (defaultDashboard) defaultDashboard.style.display = 'none';
    if (companyDashboard) companyDashboard.style.display = 'block';
    
    // Load company dashboard data
    loadCompanyStats();
    loadCompanyJobPostings();
    loadRecentApplicants();
    setupCompanyEventListeners();
}

function loadCompanyStats() {
    const user = auth.getCurrentUser();
    if (!user) return;
    
    const jobs = JSON.parse(localStorage.getItem('jobPostings') || '[]');
    const myJobs = jobs.filter(job => job.companyId === user.id);
    
    const activeJobs = myJobs.filter(j => j.status === 'active').length;
    const totalApplicants = myJobs.reduce((sum, j) => sum + (j.applicants || 0), 0);
    const totalViews = myJobs.reduce((sum, j) => sum + (j.views || 0), 0);
    
    const activeJobCount = document.getElementById('activeJobCount');
    const totalApplicantsEl = document.getElementById('totalApplicants');
    const totalViewsEl = document.getElementById('totalViews');
    
    if (activeJobCount) activeJobCount.textContent = activeJobs;
    if (totalApplicantsEl) totalApplicantsEl.textContent = totalApplicants;
    if (totalViewsEl) totalViewsEl.textContent = totalViews;
}

function loadCompanyJobPostings() {
    loadJobPostings();
}

function loadJobPostings() {
    const jobPostingsList = document.getElementById('jobPostingsList');
    if (!jobPostingsList) return;
    
    const user = auth.getCurrentUser();
    
    // Load from localStorage
    let jobs = JSON.parse(localStorage.getItem('jobPostings') || '[]');
    
    // Filter by company
    jobs = jobs.filter(job => job.companyId === user.id);
    
    if (jobs.length === 0) {
        jobPostingsList.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 2rem;">등록된 채용 공고가 없습니다.</p>';
        return;
    }
    
    jobPostingsList.innerHTML = jobs.map(job => `
        <div class="job-posting-item">
            <div class="job-posting-info">
                <div class="job-posting-title">${job.jobTitle || job.title || job.position || '제목 없음'}</div>
                <div class="job-posting-meta">
                    <span class="job-status ${job.status}">${job.status === 'active' ? '모집중' : '마감완료'}</span>
                    <span>지원자: ${job.applicants || 0}명</span>
                    <span>조회: ${job.views || 0}회</span>
                    <span>마감: ${job.deadline || '-'}</span>
                    ${job.headcount ? `<span>모집인원: ${job.headcount}명</span>` : ''}
                </div>
            </div>
            <div class="job-posting-actions">
                <button class="btn btn-secondary" onclick="viewJob('${job.id}')">보기</button>
                ${job.status === 'active' ? `<button class="btn btn-primary" onclick="editJob('${job.id}')">수정</button>` : ''}
            </div>
        </div>
    `).join('');
    
    // Update stats
    const activeJobs = jobs.filter(j => j.status === 'active').length;
    const totalApplicants = jobs.reduce((sum, j) => sum + (j.applicants || 0), 0);
    const totalViews = jobs.reduce((sum, j) => sum + (j.views || 0), 0);
    
    if (document.getElementById('activeJobCount')) {
        document.getElementById('activeJobCount').textContent = activeJobs;
    }
    if (document.getElementById('totalApplicants')) {
        document.getElementById('totalApplicants').textContent = totalApplicants;
    }
    if (document.getElementById('totalViews')) {
        document.getElementById('totalViews').textContent = totalViews;
    }
}

function viewJob(jobId) {
    // job-detail.html 대신 jobs.html로 이동 (상세 페이지는 추후 구현)
    window.location.href = 'jobs.html';
}

function editJob(jobId) {
    window.location.href = `job-edit.html?id=${jobId}`;
}

function loadRecentApplicants() {
    const applicantsList = document.getElementById('recentApplicantsList');
    if (!applicantsList) return;
    
    // Sample applicants data
    const applicants = [
        {
            id: '1',
            name: '김OO',
            position: '프론트엔드 개발자',
            status: 'applied',
            statusText: '지원중',
            appliedDate: '2024-09-30',
            email: 'kim@example.com',
            phone: '010-1234-5678'
        },
        {
            id: '2',
            name: '이OO',
            position: '백엔드 개발자',
            status: 'interview',
            statusText: '면접완료',
            appliedDate: '2024-09-29',
            email: 'lee@example.com',
            phone: '010-2345-6789'
        }
    ];
    
    applicantsList.innerHTML = applicants.map(applicant => `
        <div class="applicant-item">
            <div class="applicant-info">
                <h4>${applicant.name}</h4>
                <p>${applicant.position}</p>
                <span class="applicant-status ${applicant.status}">${applicant.statusText}</span>
                <p style="margin-top: 0.5rem; font-size: 0.85rem;">신청일: ${applicant.appliedDate}</p>
            </div>
            <div class="applicant-actions">
                <button class="btn btn-secondary" onclick="viewResume('${applicant.id}')">이력서</button>
                <button class="btn btn-primary" onclick="manageApplicant('${applicant.id}')">관리</button>
            </div>
        </div>
    `).join('');
}

function viewResume(applicantId) {
    alert('이력서 보기 기능은 준비중입니다.');
}

function manageApplicant(applicantId) {
    window.location.href = `applicant-detail.html?id=${applicantId}`;
}

function setupCompanyEventListeners() {
    // Create job button
    const createJobBtn = document.getElementById('createJobBtn');
    if (createJobBtn) {
        createJobBtn.addEventListener('click', function() {
            window.location.href = 'job-create.html';
        });
    }
    
    // Quick action buttons with specific IDs
    const quickJobCreate = document.getElementById('quickJobCreate');
    if (quickJobCreate) {
        quickJobCreate.addEventListener('click', function() {
            window.location.href = 'job-create.html';
        });
    }
    
    const quickApplicantManage = document.getElementById('quickApplicantManage');
    if (quickApplicantManage) {
        quickApplicantManage.addEventListener('click', function() {
            window.location.href = 'jobs.html';
        });
    }
    
    const quickTalentPool = document.getElementById('quickTalentPool');
    if (quickTalentPool) {
        quickTalentPool.addEventListener('click', function() {
            alert('인재풀 기능은 준비중입니다.');
        });
    }
    
    const quickAnalytics = document.getElementById('quickAnalytics');
    if (quickAnalytics) {
        quickAnalytics.addEventListener('click', function() {
            alert('분석 기능은 준비중입니다.');
        });
    }
}

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
    
    // Show only the 5 most recent requests
    const recentRequests = myRequests.slice(-5).reverse();
    
    container.innerHTML = recentRequests.map(req => {
        const student = users.find(u => String(u.id) === String(req.studentId));
        const studentName = student ? student.name : '알 수 없음';
        const statusText = req.status === 'pending' ? '대기중' : req.status === 'approved' ? '승인됨' : '거절됨';
        const statusClass = req.status === 'pending' ? 'status-pending' : req.status === 'approved' ? 'status-approved' : 'status-rejected';
        const date = new Date(req.createdAt).toLocaleDateString('ko-KR');
        
        return `
            <div class="counseling-request-item">
                <div class="request-info">
                    <h4>${studentName} 학생</h4>
                    <p class="request-title">${req.title}</p>
                    <div class="request-meta">
                        <span class="request-type-badge">${req.type}</span>
                        <span class="request-date">${date}</span>
                        <span class="request-status ${statusClass}">${statusText}</span>
                    </div>
                </div>
                <a href="counseling.html" class="btn btn-sm btn-secondary">상세보기</a>
            </div>
        `;
    }).join('');
}

function setupJobApplications() {
    const applyButtons = document.querySelectorAll('.btn-apply');
    applyButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const jobCard = this.closest('.job-item');
            const company = jobCard.querySelector('h3').textContent;
            const position = jobCard.querySelector('p').textContent;

            if (confirm(`${company}의 ${position} 포지션에 지원하시겠습니까?`)) {
                alert('지원이 완료되었습니다!');
                // Here you would normally send the application to a server
            }
        });
    });
}

// 최근 소식 로드
function loadRecentNews() {
    const newsContainer = document.getElementById('recentNews');
    if (!newsContainer) return;
    
    const news = JSON.parse(localStorage.getItem('recentNews') || '[]');
    const recentNews = news.slice(0, 3); // 최근 3개만 표시
    
    if (recentNews.length === 0) {
        newsContainer.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 2rem;">등록된 소식이 없습니다.</p>';
        return;
    }
    
    newsContainer.innerHTML = recentNews.map(item => `
        <div class="news-item" onclick="showNewsDetail(${item.id})" style="cursor: pointer;">
            <div class="news-date">${new Date(item.createdAt).toLocaleDateString('ko-KR')}</div>
            <div class="news-content">
                <h4>${item.title}</h4>
                <p>${(item.content || '').substring(0, 80)}${item.content && item.content.length > 80 ? '...' : ''}</p>
            </div>
        </div>
    `).join('');
}

// 최근 소식 상세보기
function showNewsDetail(newsId) {
    const news = JSON.parse(localStorage.getItem('recentNews') || '[]');
    const item = news.find(n => n.id === newsId);
    
    if (!item) return;
    
    document.getElementById('newsDetailTitle').textContent = item.title;
    document.getElementById('newsDetailDate').textContent = new Date(item.createdAt).toLocaleDateString('ko-KR');
    document.getElementById('newsDetailContent').textContent = item.content;
    document.getElementById('newsDetailModal').style.display = 'flex';
}

function closeNewsDetailModal() {
    document.getElementById('newsDetailModal').style.display = 'none';
}

// 교육프로그램 로드
function loadEducationPrograms() {
    const eduContainer = document.getElementById('educationPrograms');
    if (!eduContainer) return;
    
    const programs = JSON.parse(localStorage.getItem('educationPrograms') || '[]');
    const recentPrograms = programs.slice(0, 3); // 최근 3개만 표시
    
    if (recentPrograms.length === 0) {
        eduContainer.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 2rem;">등록된 교육프로그램이 없습니다.</p>';
        return;
    }
    
    eduContainer.innerHTML = recentPrograms.map(program => `
        <div class="news-item" onclick="showEducationDetail(${program.id})" style="cursor: pointer;">
            <div class="news-date">${program.deadline}</div>
            <div class="news-content">
                <h4>${program.title}</h4>
                <p>기간: ${program.startDate} ~ ${program.endDate} | 수강료: ${program.fee}</p>
            </div>
        </div>
    `).join('');
}

// 교육프로그램 상세보기
function showEducationDetail(programId) {
    const programs = JSON.parse(localStorage.getItem('educationPrograms') || '[]');
    const program = programs.find(p => p.id === programId);
    
    if (!program) return;
    
    document.getElementById('educationDetailTitle').textContent = program.title;
    document.getElementById('educationDetailPeriod').textContent = `${program.startDate} ~ ${program.endDate}`;
    document.getElementById('educationDetailDeadline').textContent = program.deadline;
    document.getElementById('educationDetailFee').textContent = program.fee;
    document.getElementById('educationDetailDescription').textContent = program.description;
    document.getElementById('educationDetailModal').style.display = 'flex';
}

function closeEducationDetailModal() {
    document.getElementById('educationDetailModal').style.display = 'none';
}

// 회사/선생님 대시보드용 최근 소식 로드
function loadRecentNewsForCompany() {
    const newsContainer = document.getElementById('recentNewsCompany');
    if (!newsContainer) return;
    
    const news = JSON.parse(localStorage.getItem('recentNews') || '[]');
    const recentNews = news.slice(0, 3); // 최근 3개만 표시
    
    if (recentNews.length === 0) {
        newsContainer.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 2rem;">등록된 소식이 없습니다.</p>';
        return;
    }
    
    newsContainer.innerHTML = recentNews.map(item => `
        <div class="news-item" onclick="showNewsDetail(${item.id})" style="cursor: pointer;">
            <div class="news-date">${new Date(item.createdAt).toLocaleDateString('ko-KR')}</div>
            <div class="news-content">
                <h4>${item.title}</h4>
                <p>${(item.content || '').substring(0, 80)}${item.content && item.content.length > 80 ? '...' : ''}</p>
            </div>
        </div>
    `).join('');
}

// 회사/선생님 대시보드용 교육프로그램 로드
function loadEducationProgramsForCompany() {
    const eduContainer = document.getElementById('educationProgramsCompany');
    if (!eduContainer) return;
    
    const programs = JSON.parse(localStorage.getItem('educationPrograms') || '[]');
    const recentPrograms = programs.slice(0, 3); // 최근 3개만 표시
    
    if (recentPrograms.length === 0) {
        eduContainer.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 2rem;">등록된 교육프로그램이 없습니다.</p>';
        return;
    }
    
    eduContainer.innerHTML = recentPrograms.map(program => `
        <div class="news-item" onclick="showEducationDetail(${program.id})" style="cursor: pointer;">
            <div class="news-date">${program.deadline}</div>
            <div class="news-content">
                <h4>${program.title}</h4>
                <p>기간: ${program.startDate} ~ ${program.endDate} | 수강료: ${program.fee}</p>
            </div>
        </div>
    `).join('');
}
