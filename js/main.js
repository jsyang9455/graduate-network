// Main page functionality
document.addEventListener('DOMContentLoaded', function() {
    // Real-time stats update (1회만 실행)
    updateStats();

    // Smooth scroll
    setupSmoothScroll();

    // Fade-in animations
    setupScrollAnimations();
});

async function updateStats() {
    try {
        const stats = await api.get('/users/stats');

        const totalStudentsEl = document.getElementById('totalStudents');
        const activeMembersEl = document.getElementById('activeMembers');

        if (totalStudentsEl) {
            totalStudentsEl.textContent = parseInt(stats.total_students || 0).toLocaleString();
        }
        if (activeMembersEl) {
            activeMembersEl.textContent = parseInt(stats.total_members || 0).toLocaleString();
        }
    } catch (error) {
        // 조용히 실패 (콘솔 에러 스팸 방지)
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

// Navigate to service with authentication check
function navigateWithAuth(event, url) {
    event.preventDefault();
    event.stopPropagation();
    
    // Check if user is logged in
    if (!auth.isLoggedIn()) {
        alert('로그인이 필요한 서비스입니다.');
        window.location.href = `login.html?returnUrl=${encodeURIComponent(url)}`;
        return;
    }
    
    // User is logged in, navigate to the page
    window.location.href = url;
}
