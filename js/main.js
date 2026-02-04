// Main page functionality
document.addEventListener('DOMContentLoaded', function() {
    // Real-time stats update
    updateStats();
    setInterval(updateStats, 5000);

    // Smooth scroll
    setupSmoothScroll();

    // Fade-in animations
    setupScrollAnimations();
});

async function updateStats() {
    try {
        // API에서 실제 데이터 가져오기
        const response = await api.get('/users?limit=1000');
        const users = response.users || [];
        
        // 학생 수 카운트 (student + graduate)
        const totalStudents = users.filter(u => u.user_type === 'student' || u.user_type === 'graduate').length;
        // 활동 회원 수 (전체 회원 수)
        const activeMembers = users.length;
        
        const totalStudentsEl = document.getElementById('totalStudents');
        const activeMembersEl = document.getElementById('activeMembers');
        
        if (totalStudentsEl) {
            totalStudentsEl.textContent = totalStudents.toLocaleString();
        }
        
        if (activeMembersEl) {
            activeMembersEl.textContent = activeMembers.toLocaleString();
        }
    } catch (error) {
        console.error('통계 업데이트 실패:', error);
        // API 실패 시 localStorage fallback
        const usersData = localStorage.getItem('graduateNetwork_users');
        if (usersData) {
            const users = JSON.parse(usersData);
            const totalStudents = users.filter(u => u.user_type === 'student' || u.user_type === 'graduate').length;
            const activeMembers = users.length;
            
            const totalStudentsEl = document.getElementById('totalStudents');
            const activeMembersEl = document.getElementById('activeMembers');
            
            if (totalStudentsEl) totalStudentsEl.textContent = totalStudents.toLocaleString();
            if (activeMembersEl) activeMembersEl.textContent = activeMembers.toLocaleString();
        }
    }
}

function setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

function setupScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in-up');
            }
        });
    }, observerOptions);

    document.querySelectorAll('.service-card, .story-card').forEach(el => {
        observer.observe(el);
    });
}
