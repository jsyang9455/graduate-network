// Jobs page functionality
let allJobs = [];
let filteredJobs = [];

document.addEventListener('DOMContentLoaded', function() {
    // Hide student-only menus for company users
    const user = auth.getCurrentUser();
    if (user && user.user_type === 'company') {
        hideStudentMenuItems();
    }
    if (user && user.user_type === 'teacher') {
        hideCareerMenuForTeacher();
    }
    
    // Load jobs data
    loadJobs();
    
    setupSearch();
    setupFilters();
    setupJobApplications();
    setupJobCreateForm();
    setupJobEditForm();
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

function loadJobs() {
    // localStorage에서 채용 공고 가져오기
    let jobs = JSON.parse(localStorage.getItem('jobPostings') || '[]');
    
    // 샘플 데이터가 없으면 생성
    if (jobs.length === 0) {
        jobs = [
            {
                id: 1,
                company: '현대자동차',
                companyType: '대기업',
                position: '전기차 배터리 시스템 엔지니어',
                description: '차세대 전기차 배터리 시스템 개발 및 테스트',
                experience: '신입',
                location: '서울',
                salary: '4,500만원 이상',
                deadline: '2026-02-15',
                recruitCount: '5명',
                status: 'active',
                views: 234,
                applicants: 12
            },
            {
                id: 2,
                company: '삼성전자',
                companyType: '대기업',
                position: '반도체 공정 엔지니어',
                description: '반도체 제조 공정 관리 및 최적화',
                experience: '1-3년',
                location: '경기',
                salary: '5,000만원 이상',
                deadline: '2026-02-28',
                recruitCount: '10명',
                status: 'active',
                views: 456,
                applicants: 23
            },
            {
                id: 3,
                company: 'LG화학',
                companyType: '대기업',
                position: '화학공정 설계 엔지니어',
                description: '화학 플랜트 공정 설계 및 시뮬레이션',
                experience: '신입',
                location: '전북',
                salary: '4,000만원 이상',
                deadline: '2026-03-10',
                recruitCount: '3명',
                status: 'active',
                views: 189,
                applicants: 8
            },
            {
                id: 4,
                company: '포스코',
                companyType: '대기업',
                position: '제철 공정 관리',
                description: '제철소 생산 공정 모니터링 및 품질 관리',
                experience: '3-5년',
                location: '전북',
                salary: '4,000만원 이상',
                deadline: '2026-02-20',
                recruitCount: '7명',
                status: 'active',
                views: 312,
                applicants: 15
            }
        ];
        localStorage.setItem('jobPostings', JSON.stringify(jobs));
    }
    
    allJobs = jobs;
    filteredJobs = jobs;
    displayJobs(filteredJobs);
}

function displayJobs(jobs) {
    const container = document.querySelector('.jobs-container');
    if (!container) return;
    
    if (jobs.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 3rem; color: #6b7280;">검색 결과가 없습니다.</p>';
        return;
    }
    
    container.innerHTML = jobs.map(job => {
        const daysLeft = Math.ceil((new Date(job.deadline) - new Date()) / (1000 * 60 * 60 * 24));
        return `
            <div class="job-card" data-job-id="${job.id}">
                <div class="job-card-header">
                    <div class="job-title-section">
                        <span class="company-badge">${job.companyType}</span>
                        <h2>${job.company}</h2>
                        <h3>${job.position}</h3>
                    </div>
                </div>
                <div class="job-card-body">
                    <div class="job-info-grid">
                        <div class="info-item">
                            <span class="info-label">🎯 경력</span>
                            <span class="info-value">${job.experience}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">📍 지역</span>
                            <span class="info-value">${job.location}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">💰 연봉</span>
                            <span class="info-value">${job.salary}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">📅 마감일</span>
                            <span class="info-value">${job.deadline} (D-${daysLeft})</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">👥 채용인원</span>
                            <span class="info-value">${job.recruitCount}</span>
                        </div>
                    </div>
                    <p class="job-description">${job.description}</p>
                </div>
                <div class="job-card-footer">
                    <button class="btn btn-secondary" onclick="viewJobDetail(${job.id})">상세보기</button>
                    <button class="btn btn-primary" onclick="applyJob(${job.id})">지원하기</button>
                </div>
            </div>
        `;
    }).join('');
}

function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.querySelector('.btn-search');

    if (searchBtn) {
        searchBtn.addEventListener('click', function() {
            const query = searchInput.value.trim();
            filterJobs(query);
        });
    }

    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const query = this.value.trim();
                filterJobs(query);
            }
        });
        
        // 실시간 검색
        searchInput.addEventListener('input', function() {
            const query = this.value.trim();
            if (query.length >= 2 || query.length === 0) {
                filterJobs(query);
            }
        });
    }
}

function setupFilters() {
    const filterBtn = document.querySelector('.btn-filter');
    const filterSelects = ['filterCompany', 'filterExperience', 'filterLocation'];
    
    if (filterBtn) {
        filterBtn.addEventListener('click', applyCurrentFilters);
    }
    
    // 필터 변경 시 자동 적용
    filterSelects.forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            select.addEventListener('change', applyCurrentFilters);
        }
    });
}

function applyCurrentFilters() {
    const company = document.getElementById('filterCompany').value;
    const experience = document.getElementById('filterExperience').value;
    const location = document.getElementById('filterLocation').value;
    const searchQuery = document.getElementById('searchInput').value.trim();
    
    applyFilters(company, experience, location, searchQuery);
}

function filterJobs(query) {
    const company = document.getElementById('filterCompany')?.value || '';
    const experience = document.getElementById('filterExperience')?.value || '';
    const location = document.getElementById('filterLocation')?.value || '';
    
    applyFilters(company, experience, location, query);
}

function applyFilters(companyType, experience, location, searchQuery = '') {
    let filtered = allJobs;
    
    // 검색어 필터
    if (searchQuery) {
        const lowerQuery = searchQuery.toLowerCase();
        filtered = filtered.filter(job => 
            job.company.toLowerCase().includes(lowerQuery) ||
            job.position.toLowerCase().includes(lowerQuery) ||
            job.description.toLowerCase().includes(lowerQuery)
        );
    }
    
    // 기업 유형 필터
    if (companyType) {
        filtered = filtered.filter(job => job.companyType === companyType);
    }
    
    // 경력 필터
    if (experience) {
        filtered = filtered.filter(job => job.experience === experience);
    }
    
    // 지역 필터
    if (location) {
        filtered = filtered.filter(job => job.location === location);
    }
    
    filteredJobs = filtered;
    displayJobs(filteredJobs);
    
    // 결과 메시지
    const resultCount = filtered.length;
    console.log(`검색 결과: ${resultCount}건`);
}

function viewJobDetail(jobId) {
    const job = allJobs.find(j => j.id === jobId);
    if (!job) return;

    const daysLeft = Math.ceil((new Date(job.deadline) - new Date()) / (1000 * 60 * 60 * 24));
    const deadlineText = daysLeft > 0 ? `${job.deadline} (D-${daysLeft})` : `${job.deadline} (마감)`;
    const deadlineColor = daysLeft > 7 ? '#166534' : daysLeft > 0 ? '#854d0e' : '#ef4444';

    document.getElementById('jdCompanyType').textContent = job.companyType || '';
    document.getElementById('jdCompany').textContent = job.company || '';
    document.getElementById('jdPosition').textContent = job.position || '';

    document.getElementById('jdContent').innerHTML = `
        ${job.description ? `<p style="color:#374151; font-size:0.95rem; line-height:1.7; margin:0 0 1.5rem; padding:1rem; background:#f8fafc; border-radius:8px; border-left:3px solid #3b82f6;">${job.description}</p>` : ''}
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-bottom:1.5rem;">
            <div style="background:#f0f4ff; padding:0.9rem; border-radius:8px;">
                <div style="font-size:0.75rem; color:#6b7280; margin-bottom:0.25rem;">💼 경력</div>
                <div style="font-weight:600; color:#1e3a8a;">${job.experience || '-'}</div>
            </div>
            <div style="background:#f0f4ff; padding:0.9rem; border-radius:8px;">
                <div style="font-size:0.75rem; color:#6b7280; margin-bottom:0.25rem;">📍 근무지</div>
                <div style="font-weight:600; color:#1e3a8a;">${job.location || '-'}</div>
            </div>
            <div style="background:#fefce8; padding:0.9rem; border-radius:8px;">
                <div style="font-size:0.75rem; color:#6b7280; margin-bottom:0.25rem;">💰 연봉</div>
                <div style="font-weight:600; color:#854d0e;">${job.salary || '-'}</div>
            </div>
            <div style="background:#f0fdf4; padding:0.9rem; border-radius:8px;">
                <div style="font-size:0.75rem; color:#6b7280; margin-bottom:0.25rem;">👥 채용인원</div>
                <div style="font-weight:600; color:#166534;">${job.recruitCount || '-'}</div>
            </div>
            <div style="background:#fff1f2; padding:0.9rem; border-radius:8px; grid-column:1/-1;">
                <div style="font-size:0.75rem; color:#6b7280; margin-bottom:0.25rem;">📅 지원 마감</div>
                <div style="font-weight:600; color:${deadlineColor};">${deadlineText}</div>
            </div>
        </div>
        ${job.requirements ? `<div style="margin-bottom:1.25rem;">
            <strong style="color:#1e40af; display:block; margin-bottom:0.6rem; font-size:0.95rem;">📋 지원 자격</strong>
            <div style="font-size:0.9rem; color:#374151; line-height:1.7; padding:0.75rem; background:#f8fafc; border-radius:8px;">${job.requirements}</div>
        </div>` : ''}
        <div style="display:flex; gap:0.75rem; margin-top:1.5rem;">
            <button onclick="closeJobDetailModal()" style="flex:1; padding:0.875rem; background:#f3f4f6; border:none; border-radius:8px; font-size:1rem; cursor:pointer; color:#374151; font-weight:600;">닫기</button>
            <button onclick="closeJobDetailModal(); applyJob(${job.id})" style="flex:2; padding:0.875rem; background:#1e40af; color:white; border:none; border-radius:8px; font-size:1rem; cursor:pointer; font-weight:600;">지원하기</button>
        </div>
    `;

    document.getElementById('jobDetailModal').style.display = 'flex';
}

function applyJob(jobId) {
    if (!auth.isLoggedIn()) {
        alert('로그인이 필요한 서비스입니다.');
        window.location.href = 'login.html';
        return;
    }
    
    const user = auth.getCurrentUser();
    const job = allJobs.find(j => j.id === jobId);
    
    if (!job) return;
    
    if (confirm(`${job.company}의 ${job.position} 포지션에 지원하시겠습니까?`)) {
        // Store application
        const applications = JSON.parse(localStorage.getItem('job_applications') || '[]');
        applications.push({
            jobId: job.id,
            userId: user.id,
            company: job.company,
            position: job.position,
            appliedAt: new Date().toISOString(),
            status: 'pending'
        });
        localStorage.setItem('job_applications', JSON.stringify(applications));
        
        // Update job applicants count
        job.applicants = (job.applicants || 0) + 1;
        const jobs = JSON.parse(localStorage.getItem('jobPostings') || '[]');
        const jobIndex = jobs.findIndex(j => j.id === jobId);
        if (jobIndex !== -1) {
            jobs[jobIndex] = job;
            localStorage.setItem('jobPostings', JSON.stringify(jobs));
        }

        alert('지원이 완료되었습니다!');
        loadJobs(); // 화면 갱신
    }
}

function setupJobApplications() {
    // 동적으로 생성되는 버튼은 이벤트 위임 방식으로 처리
    // applyJob과 viewJobDetail 함수로 대체
}

function setupJobCreateForm() {
    const form = document.getElementById('jobCreateForm');
    if (!form) return;

    form.addEventListener('submit', function(e) {
        e.preventDefault();

        if (!auth.isLoggedIn()) {
            alert('로그인이 필요한 서비스입니다.');
            window.location.href = 'login.html';
            return;
        }

        const user = auth.getCurrentUser();
        
        const jobData = {
            id: Date.now(),
            companyId: user.id,
            companyName: user.name,
            jobTitle: document.getElementById('title').value,
            description: document.getElementById('description').value,
            type: document.getElementById('type').value,
            location: document.getElementById('location').value || '미정',
            salary: document.getElementById('salary').value || '협의',
            deadline: document.getElementById('deadline').value || '상시채용',
            headcount: document.getElementById('headcount')?.value ? parseInt(document.getElementById('headcount').value) : null,
            status: 'active',
            createdAt: new Date().toISOString(),
            views: 0,
            applicants: 0
        };

        // Save to localStorage
        const jobs = JSON.parse(localStorage.getItem('jobPostings') || '[]');
        jobs.push(jobData);
        localStorage.setItem('jobPostings', JSON.stringify(jobs));

        alert('채용 공고가 성공적으로 등록되었습니다!');
        window.location.href = 'dashboard.html';
    });
}

function setupJobEditForm() {
    const form = document.getElementById('jobEditForm');
    if (!form) return;

    // Load job data for editing
    const urlParams = new URLSearchParams(window.location.search);
    const jobId = urlParams.get('id');

    if (jobId) {
        const jobs = JSON.parse(localStorage.getItem('jobPostings') || '[]');
        const job = jobs.find(j => j.id == jobId);

        if (job) {
            document.getElementById('jobId').value = job.id;
            document.getElementById('title').value = job.jobTitle;
            document.getElementById('description').value = job.description;
            document.getElementById('type').value = job.type;
            document.getElementById('location').value = job.location;
            document.getElementById('salary').value = job.salary;
            document.getElementById('deadline').value = job.deadline;
            if (document.getElementById('headcount')) {
                document.getElementById('headcount').value = job.headcount || '';
            }
            if (document.getElementById('status')) {
                document.getElementById('status').value = job.status;
            }
        }
    }

    form.addEventListener('submit', function(e) {
        e.preventDefault();

        if (!auth.isLoggedIn()) {
            alert('로그인이 필요한 서비스입니다.');
            window.location.href = 'login.html';
            return;
        }

        const jobId = document.getElementById('jobId').value;
        const jobs = JSON.parse(localStorage.getItem('jobPostings') || '[]');
        const jobIndex = jobs.findIndex(j => j.id == jobId);

        if (jobIndex !== -1) {
            jobs[jobIndex].jobTitle = document.getElementById('title').value;
            jobs[jobIndex].description = document.getElementById('description').value;
            jobs[jobIndex].type = document.getElementById('type').value;
            jobs[jobIndex].location = document.getElementById('location').value;
            jobs[jobIndex].salary = document.getElementById('salary').value;
            jobs[jobIndex].deadline = document.getElementById('deadline').value;
            if (document.getElementById('headcount')) {
                const hc = document.getElementById('headcount').value;
                jobs[jobIndex].headcount = hc ? parseInt(hc) : null;
            }
            if (document.getElementById('status')) {
                jobs[jobIndex].status = document.getElementById('status').value;
            }

            localStorage.setItem('jobPostings', JSON.stringify(jobs));

            alert('채용 공고가 성공적으로 수정되었습니다!');
            window.location.href = 'dashboard.html';
        }
    });
}
