// Dashboard functionality
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    if (!auth.requireAuth()) {
        return;
    }

    // Display user name and customize dashboard based on user type
    const user = auth.getCurrentUser();
    const dashboardUserName = document.getElementById('dashboardUserName');
    if (dashboardUserName && user) {
        dashboardUserName.textContent = user.name;
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
    
    if (user && user.user_type === 'company') {
        showCompanyDashboard();
        hideStudentMenuItems();
    } else {
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
}

function hideStudentMenuItems() {
    // Hide counseling and career menu items for company users
    const counselingMenu = document.getElementById('counselingMenu');
    const careerMenu = document.getElementById('careerMenu');
    
    if (counselingMenu) counselingMenu.style.display = 'none';
    if (careerMenu) careerMenu.style.display = 'none';
}

function showCompanyDashboard() {
    const defaultDashboard = document.getElementById('defaultDashboard');
    const companyDashboard = document.getElementById('companyDashboard');
    
    if (defaultDashboard) defaultDashboard.style.display = 'none';
    if (companyDashboard) companyDashboard.style.display = 'block';
    
    // Load company dashboard data
    loadJobPostings();
    loadRecentApplicants();
    setupCompanyEventListeners();
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
                <div class="job-posting-title">${job.jobTitle}</div>
                <div class="job-posting-meta">
                    <span class="job-status ${job.status}">${job.status === 'active' ? '모집중' : '마감완료'}</span>
                    <span>지원자: ${job.applicants || 0}명</span>
                    <span>조회: ${job.views || 0}회</span>
                    <span>마감: ${job.deadline || '-'}</span>
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
    window.location.href = `job-detail.html?id=${jobId}`;
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
