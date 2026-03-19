// Certificates page functionality
document.addEventListener('DOMContentLoaded', function() {
    setupCertificateSelection();
    setupCertificateForm();
    setupCostCalculation();
    setupHistoryActions();
    loadCertificateHistory();
});

function selectCertType(type) {
    const certTypeSelect = document.getElementById('certType');
    if (certTypeSelect) {
        certTypeSelect.value = type;
        document.getElementById('certificateForm').scrollIntoView({ behavior: 'smooth' });
        calculateCost();
    }
}

function setupCertificateSelection() {
    const certCards = document.querySelectorAll('.cert-type-card');
    certCards.forEach(card => {
        card.addEventListener('click', function() {
            certCards.forEach(c => c.classList.remove('selected'));
            this.classList.add('selected');
        });
    });
}

function setupCertificateForm() {
    const form = document.getElementById('certificateForm');
    if (!form) return;

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        if (!auth.isLoggedIn()) {
            alert('로그인이 필요한 서비스입니다.');
            window.location.href = 'login.html';
            return;
        }

        const formData = {
            certType:       document.getElementById('certType').value,
            name:           document.getElementById('applicantName').value,
            graduationYear: document.getElementById('graduationYear').value,
            studentId:      document.getElementById('studentId').value,
            birthDate:      document.getElementById('birthDate').value,
            purpose:        document.getElementById('purpose').value,
            copies:         document.getElementById('copies').value,
            deliveryMethod: document.getElementById('deliveryMethod').value,
            address:        document.getElementById('address').value,
            phone:          document.getElementById('contactPhone').value
        };

        // Validate
        if (!formData.certType || !formData.name || !formData.graduationYear ||
            !formData.studentId || !formData.birthDate || !formData.purpose ||
            !formData.copies || !formData.deliveryMethod || !formData.phone) {
            alert('모든 필수 항목을 입력해주세요.');
            return;
        }

        if (formData.deliveryMethod === '우편' && !formData.address) {
            alert('수령 주소를 입력해주세요.');
            return;
        }

        const totalCost = document.getElementById('totalCost').textContent;

        try {
            await api.post('/certificates', {
                certificate_type: formData.certType,
                purpose: formData.purpose
            });
            alert(`증명서 신청이 완료되었습니다!\n총 비용: ${totalCost}`);
            form.reset();
            calculateCost();
            await loadCertificateHistory();
        } catch (err) {
            alert('신청 실패: ' + err.message);
        }
    });
}

async function loadCertificateHistory() {
    if (!auth.isLoggedIn()) return;

    const tbody = document.querySelector('.history-table tbody');
    if (!tbody) return;

    try {
        const data = await api.get('/certificates');
        const certs = data.certificates || [];

        if (certs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#888;">신청 내역이 없습니다.</td></tr>';
            return;
        }

        const statusLabel = { pending: '처리중', issued: '발급완료', rejected: '반려' };
        tbody.innerHTML = certs.map(c => `
            <tr>
                <td>${new Date(c.requested_at).toLocaleDateString('ko-KR')}</td>
                <td>${c.certificate_type || ''}</td>
                <td>-</td>
                <td><span class="status-badge status-${c.status}">${statusLabel[c.status] || c.status}</span></td>
                <td><button class="btn-detail btn btn-sm btn-outline" onclick="alert('신청일: ${new Date(c.requested_at).toLocaleDateString('ko-KR')}\\n증명서: ${c.certificate_type}\\n상태: ${statusLabel[c.status] || c.status}')">상세</button></td>
            </tr>`).join('');
    } catch (err) {
        console.warn('증명서 내역 로드 실패:', err.message);
    }
}

function toggleAddressField() {
    const deliveryMethod = document.getElementById('deliveryMethod').value;
    const addressField = document.getElementById('addressField');

    if (addressField) {
        if (deliveryMethod === '우편') {
            addressField.style.display = 'block';
        } else {
            addressField.style.display = 'none';
        }
    }

    calculateCost();
}

function setupCostCalculation() {
    const certTypeSelect = document.getElementById('certType');
    const copiesSelect = document.getElementById('copies');
    const deliveryMethodSelect = document.getElementById('deliveryMethod');

    [certTypeSelect, copiesSelect, deliveryMethodSelect].forEach(element => {
        if (element) {
            element.addEventListener('change', calculateCost);
        }
    });
}

function calculateCost() {
    const certType = document.getElementById('certType').value;
    const copies = parseInt(document.getElementById('copies').value) || 0;
    const deliveryMethod = document.getElementById('deliveryMethod').value;

    let certPrice = 0;
    if (certType === '졸업' || certType === '성적' || certType === '재학') {
        certPrice = 500;
    } else if (certType === '추천') {
        certPrice = 1000;
    }

    let deliveryPrice = 0;
    if (deliveryMethod === '우편') {
        deliveryPrice = 3000;
    } else if (deliveryMethod === '이메일') {
        deliveryPrice = 0;
    }

    const certCost = certPrice * copies;
    const totalCost = certCost + deliveryPrice;

    document.getElementById('certCost').textContent = certCost.toLocaleString() + '원';
    document.getElementById('deliveryCost').textContent = deliveryPrice.toLocaleString() + '원';
    document.getElementById('totalCost').textContent = totalCost.toLocaleString() + '원';
}

function setupHistoryActions() {
    const detailBtns = document.querySelectorAll('.btn-detail');
    detailBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const row = this.closest('tr');
            const certType = row.cells[1].textContent;
            const date = row.cells[0].textContent;
            const status = row.querySelector('.status-badge').textContent;

            if (status === '발급완료' && certType.includes('이메일')) {
                alert('증명서 다운로드를 시작합니다...');
                // In production, this would download the actual certificate
            } else {
                alert(`신청일: ${date}\n증명서: ${certType}\n상태: ${status}`);
            }
        });
    });
}
