// 전역 변수
let currentUser = null;
let programs = [];
let editingProgramId = null;

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    // 인증 확인
    auth.requireAuth();
    currentUser = auth.getCurrentUser();
    
    if (currentUser) {
        document.getElementById('userName').textContent = currentUser.name;
        
        // 관리자/교사인 경우 관리 기능 표시
        if (currentUser.user_type === 'admin' || currentUser.user_type === 'teacher') {
            document.getElementById('adminActions').style.display = 'block';
        }
        
        // 관리자인 경우 관리자 메뉴 표시
        if (currentUser.user_type === 'admin') {
            const adminMenuSection = document.getElementById('adminMenuSection');
            if (adminMenuSection) {
                adminMenuSection.style.display = 'block';
            }
        }
        
        // 학생이 아닌 경우 경력 관리 메뉴 숨기기
        const careerMenu = document.getElementById('careerMenu');
        if (careerMenu && currentUser.user_type !== 'student' && currentUser.user_type !== 'graduate') {
            careerMenu.style.display = 'none';
        }
    }
    
    // 프로그램 로드
    loadPrograms();
    
    // 검색 입력 이벤트
    document.getElementById('searchProgram').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchPrograms();
        }
    });
});

// 프로그램 로드
function loadPrograms() {
    const programsData = localStorage.getItem('graduateNetwork_programs');
    if (programsData) {
        programs = JSON.parse(programsData);
    } else {
        // 기본 데이터 생성
        programs = [
            {
                id: '1',
                title: 'AI 기초 과정',
                category: 'IT',
                type: '온라인',
                duration: '4주',
                description: '인공지능의 기초 개념과 실무 활용 방법을 배우는 과정입니다. 머신러닝, 딥러닝의 기본 원리를 이해하고 Python을 활용한 실습을 진행합니다.',
                instructor: 'OO 대학교',
                cost: '무료',
                link: '',
                createdAt: new Date().toISOString(),
                createdBy: 'admin'
            },
            {
                id: '2',
                title: '스마트 공장 자동화',
                category: '제조',
                type: '오프라인',
                duration: '6주',
                description: '4차 산업혁명 시대의 공장 자동화 기술을 배우는 과정입니다. IoT, 빅데이터, AI를 활용한 스마트 제조 시스템 구축 방법을 학습합니다.',
                instructor: '한국생산기술연구원',
                cost: '50만원',
                link: '',
                createdAt: new Date().toISOString(),
                createdBy: 'admin'
            },
            {
                id: '3',
                title: '전기기사 자격증 대비반',
                category: '자격증',
                type: '혼합',
                duration: '8주',
                description: '전기기사 자격증 취득을 위한 이론 및 실기 준비 과정입니다. 전기이론, 전력공학, 전기설비 등 핵심 과목을 집중 학습합니다.',
                instructor: 'OO 교육원',
                cost: '80만원',
                link: '',
                createdAt: new Date().toISOString(),
                createdBy: 'admin'
            }
        ];
        localStorage.setItem('graduateNetwork_programs', JSON.stringify(programs));
    }
    
    displayPrograms(programs);
}

// 프로그램 목록 표시
function displayPrograms(programList) {
    const grid = document.getElementById('programsGrid');
    
    if (programList.length === 0) {
        grid.innerHTML = '<p style="text-align: center; color: #999; padding: 40px; grid-column: 1/-1;">등록된 프로그램이 없습니다.</p>';
        return;
    }
    
    grid.innerHTML = programList.map(program => {
        const isAdmin = currentUser && (currentUser.user_type === 'admin' || currentUser.user_type === 'teacher');
        
        return `
            <div class="program-card">
                <div class="program-header">
                    <span class="program-category">${program.category}</span>
                    <span class="program-type">${program.type}</span>
                </div>
                <h3 class="program-title">${program.title}</h3>
                <p class="program-description">${program.description.length > 100 ? program.description.substring(0, 100) + '...' : program.description}</p>
                <div class="program-meta">
                    <span>📅 ${program.duration}</span>
                    ${program.instructor ? `<span>👨‍🏫 ${program.instructor}</span>` : ''}
                    ${program.cost ? `<span>💰 ${program.cost}</span>` : ''}
                </div>
                <div class="program-actions">
                    <button class="btn btn-secondary" onclick="viewProgramDetail('${program.id}')">상세보기</button>
                    ${isAdmin ? `
                        <button class="btn btn-primary" onclick="editProgram('${program.id}')">수정</button>
                        <button class="btn btn-danger" onclick="deleteProgram('${program.id}')">삭제</button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// 프로그램 등록 모달 열기
function openAddProgramModal() {
    editingProgramId = null;
    document.getElementById('programModalTitle').textContent = '프로그램 등록';
    document.getElementById('programForm').reset();
    document.getElementById('programId').value = '';
    document.getElementById('programModal').style.display = 'block';
}
window.openAddProgramModal = openAddProgramModal;

// 프로그램 수정
function editProgram(programId) {
    const program = programs.find(p => p.id === programId);
    if (!program) return;
    
    editingProgramId = programId;
    document.getElementById('programModalTitle').textContent = '프로그램 수정';
    document.getElementById('programId').value = program.id;
    document.getElementById('programTitle').value = program.title;
    document.getElementById('programCategory').value = program.category;
    document.getElementById('programType').value = program.type;
    document.getElementById('programDuration').value = program.duration;
    document.getElementById('programDescription').value = program.description;
    document.getElementById('programInstructor').value = program.instructor || '';
    document.getElementById('programCost').value = program.cost || '';
    document.getElementById('programLink').value = program.link || '';
    
    document.getElementById('programModal').style.display = 'block';
}
window.editProgram = editProgram;

// 프로그램 저장
function saveProgram(event) {
    event.preventDefault();
    
    const programData = {
        title: document.getElementById('programTitle').value,
        category: document.getElementById('programCategory').value,
        type: document.getElementById('programType').value,
        duration: document.getElementById('programDuration').value,
        description: document.getElementById('programDescription').value,
        instructor: document.getElementById('programInstructor').value,
        cost: document.getElementById('programCost').value,
        link: document.getElementById('programLink').value
    };
    
    if (editingProgramId) {
        // 수정
        const index = programs.findIndex(p => p.id === editingProgramId);
        if (index !== -1) {
            programs[index] = {
                ...programs[index],
                ...programData,
                updatedAt: new Date().toISOString(),
                updatedBy: currentUser.id
            };
        }
    } else {
        // 신규 등록
        const newProgram = {
            id: Date.now().toString(),
            ...programData,
            createdAt: new Date().toISOString(),
            createdBy: currentUser.id
        };
        programs.push(newProgram);
    }
    
    localStorage.setItem('graduateNetwork_programs', JSON.stringify(programs));
    displayPrograms(programs);
    closeProgramModal();
    alert(editingProgramId ? '프로그램이 수정되었습니다.' : '프로그램이 등록되었습니다.');
}
window.saveProgram = saveProgram;

// 프로그램 삭제
function deleteProgram(programId) {
    if (!confirm('이 프로그램을 삭제하시겠습니까?')) return;
    
    programs = programs.filter(p => p.id !== programId);
    localStorage.setItem('graduateNetwork_programs', JSON.stringify(programs));
    displayPrograms(programs);
    alert('프로그램이 삭제되었습니다.');
}
window.deleteProgram = deleteProgram;

// 프로그램 상세보기
function viewProgramDetail(programId) {
    const program = programs.find(p => p.id === programId);
    if (!program) return;
    
    const container = document.getElementById('programDetailContainer');
    const createdDate = new Date(program.createdAt);
    const formattedDate = `${createdDate.getFullYear()}년 ${createdDate.getMonth() + 1}월 ${createdDate.getDate()}일`;
    
    container.innerHTML = `
        <div class="program-detail">
            <div class="program-detail-header">
                <div class="program-badges">
                    <span class="badge badge-category">${program.category}</span>
                    <span class="badge badge-type">${program.type}</span>
                </div>
                <h3>${program.title}</h3>
            </div>
            
            <div class="program-detail-body">
                <div class="detail-section">
                    <h4>📋 프로그램 소개</h4>
                    <p>${program.description}</p>
                </div>
                
                <div class="detail-section">
                    <h4>ℹ️ 프로그램 정보</h4>
                    <div class="detail-info-grid">
                        <div class="info-item">
                            <span class="info-label">교육 기간</span>
                            <span class="info-value">${program.duration}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">교육 유형</span>
                            <span class="info-value">${program.type}</span>
                        </div>
                        ${program.instructor ? `
                            <div class="info-item">
                                <span class="info-label">강사/기관</span>
                                <span class="info-value">${program.instructor}</span>
                            </div>
                        ` : ''}
                        ${program.cost ? `
                            <div class="info-item">
                                <span class="info-label">교육 비용</span>
                                <span class="info-value">${program.cost}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                ${program.link ? `
                    <div class="detail-section">
                        <a href="${program.link}" target="_blank" class="btn btn-primary btn-block">
                            🔗 신청 페이지로 이동
                        </a>
                    </div>
                ` : ''}
                
                <div class="detail-footer">
                    <small>등록일: ${formattedDate}</small>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('programDetailModal').style.display = 'block';
}
window.viewProgramDetail = viewProgramDetail;

// 검색 기능
function searchPrograms() {
    const searchQuery = document.getElementById('searchProgram').value.toLowerCase();
    const filtered = programs.filter(program => {
        const title = program.title.toLowerCase();
        const description = program.description.toLowerCase();
        const instructor = (program.instructor || '').toLowerCase();
        
        return title.includes(searchQuery) || 
               description.includes(searchQuery) || 
               instructor.includes(searchQuery);
    });
    
    displayPrograms(filtered);
}
window.searchPrograms = searchPrograms;

// 필터 적용
function applyFilters() {
    const category = document.getElementById('filterCategory').value;
    const type = document.getElementById('filterType').value;
    const searchQuery = document.getElementById('searchProgram').value.toLowerCase();
    
    let filtered = programs;
    
    // 카테고리 필터
    if (category) {
        filtered = filtered.filter(p => p.category === category);
    }
    
    // 유형 필터
    if (type) {
        filtered = filtered.filter(p => p.type === type);
    }
    
    // 검색어 필터
    if (searchQuery) {
        filtered = filtered.filter(program => {
            const title = program.title.toLowerCase();
            const description = program.description.toLowerCase();
            const instructor = (program.instructor || '').toLowerCase();
            
            return title.includes(searchQuery) || 
                   description.includes(searchQuery) || 
                   instructor.includes(searchQuery);
        });
    }
    
    displayPrograms(filtered);
}
window.applyFilters = applyFilters;

// 모달 닫기
function closeProgramModal() {
    document.getElementById('programModal').style.display = 'none';
    editingProgramId = null;
}
window.closeProgramModal = closeProgramModal;

function closeProgramDetailModal() {
    document.getElementById('programDetailModal').style.display = 'none';
}
window.closeProgramDetailModal = closeProgramDetailModal;
