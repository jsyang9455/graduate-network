// Counseling page functionality
document.addEventListener('DOMContentLoaded', function() {
    // Hide student-only menus for company users and redirect
    const user = auth.getCurrentUser();
    if (user && user.user_type === 'company') {
        alert('기업 계정은 진로 상담 서비스를 이용할 수 없습니다.');
        window.location.href = 'dashboard.html';
        return;
    }
    
    setupCounselingForm();
    setupCounselorBooking();
    setupHistoryActions();

    // Set minimum date to today
    const preferredDate = document.getElementById('preferredDate');
    if (preferredDate) {
        const today = new Date().toISOString().split('T')[0];
        preferredDate.min = today;
    }
});

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

            const formData = {
                type: document.getElementById('counselingType').value,
                date: document.getElementById('preferredDate').value,
                time: document.getElementById('preferredTime').value,
                method: document.getElementById('counselingMethod').value,
                topic: document.getElementById('counselingTopic').value,
                details: document.getElementById('counselingDetails').value,
                phone: document.getElementById('contactPhone').value
            };

            // Validate
            if (!formData.type || !formData.date || !formData.time || !formData.method || 
                !formData.topic || !formData.details || !formData.phone) {
                alert('모든 필수 항목을 입력해주세요.');
                return;
            }

            // Save counseling request
            const counselings = JSON.parse(localStorage.getItem('counseling_requests') || '[]');
            counselings.push({
                ...formData,
                user: auth.getCurrentUser().name,
                requestedAt: new Date().toISOString(),
                status: 'pending'
            });
            localStorage.setItem('counseling_requests', JSON.stringify(counselings));

            alert('상담 예약이 완료되었습니다!\n담당자 확인 후 연락드리겠습니다.');
            form.reset();
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
