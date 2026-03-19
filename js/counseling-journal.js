// 상담일지 페이지 JavaScript
// localStorage key: counseling_journals

document.addEventListener('DOMContentLoaded', () => {
    initJournalPage();
});

let currentUser = null;
const STORAGE_KEY = 'counseling_journals';

function initJournalPage() {
    // 로그인 체크
    const userStr = localStorage.getItem('currentUser');
    if (!userStr) {
        alert('로그인이 필요합니다.');
        window.location.href = 'login.html';
        return;
    }
    currentUser = JSON.parse(userStr);

    // 헤더 사용자 이름
    const userNameEl = document.getElementById('userName');
    if (userNameEl) userNameEl.textContent = currentUser.name || currentUser.username || '';

    // 관리자 메뉴
    if (currentUser.role === 'admin') {
        const adminSection = document.getElementById('adminMenuSection');
        if (adminSection) adminSection.style.display = 'block';
    }

    // 교사만 작성 버튼 표시
    if (currentUser.role === 'teacher' || currentUser.role === 'admin') {
        const addBtn = document.getElementById('addJournalBtn');
        if (addBtn) addBtn.style.display = '';
    }

    // 학생 부제목
    if (currentUser.role === 'student') {
        const subtitle = document.getElementById('pageSubtitle');
        if (subtitle) subtitle.textContent = '나의 상담 내용을 확인합니다.';
    }

    renderJournals();
}

// ─── localStorage CRUD ────────────────────────────────────────

function getJournals() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
        return [];
    }
}

function saveJournals(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

// ─── 목록 렌더링 ──────────────────────────────────────────────

function renderJournals() {
    const container = document.getElementById('journalList');
    if (!container) return;

    let list = getJournals();

    // 권한 필터: 학생은 본인 일지 + 비공개 아닌 것만
    if (currentUser.role === 'student') {
        list = list.filter(j => {
            const isMyJournal = String(j.studentId) === String(currentUser.id) ||
                               j.studentName === (currentUser.name || currentUser.username);
            return isMyJournal && !j.isPrivate;
        });
    } else if (currentUser.role === 'teacher') {
        // 교사: 본인이 작성한 일지만
        list = list.filter(j => String(j.teacherId) === String(currentUser.id));
    }
    // admin: 전체 조회

    // 유형 필터
    const typeFilter = document.getElementById('filterType')?.value || '';
    if (typeFilter) list = list.filter(j => j.type === typeFilter);

    // 검색 필터
    const searchText = (document.getElementById('filterSearch')?.value || '').trim().toLowerCase();
    if (searchText) {
        list = list.filter(j =>
            (j.studentName || '').toLowerCase().includes(searchText) ||
            (j.title || '').toLowerCase().includes(searchText)
        );
    }

    // 최신순 정렬
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (list.length === 0) {
        container.innerHTML = `<div class="empty-state"><p>📭 등록된 상담일지가 없습니다.</p></div>`;
        return;
    }

    const isTeacherOrAdmin = currentUser.role === 'teacher' || currentUser.role === 'admin';

    container.innerHTML = list.map(j => {
        const dateStr = j.counselingDate ? formatDate(j.counselingDate) : '-';
        const contentPreview = (j.content || '').length > 80
            ? j.content.substring(0, 80) + '...'
            : (j.content || '');

        const actionBtns = isTeacherOrAdmin && (
            currentUser.role === 'admin' || String(j.teacherId) === String(currentUser.id)
        ) ? `
            <div class="journal-card-actions">
                <button class="btn btn-secondary btn-sm" onclick="openJournalModal('${j.id}')">수정</button>
                <button class="btn btn-danger btn-sm" onclick="deleteJournal('${j.id}')">삭제</button>
            </div>` : '';

        const privateBadge = j.isPrivate ? `<span class="privacy-badge">🔒 비공개</span>` : '';

        return `
        <div class="journal-card">
            <div class="journal-card-header">
                <div>
                    <div style="display:flex; align-items:center; gap:0.6rem;">
                        <span class="journal-type-badge">${escHtml(j.type || '기타')}</span>
                        ${privateBadge}
                    </div>
                    <div class="journal-card-title" style="margin-top:0.5rem;">${escHtml(j.title || '')}</div>
                    <div class="journal-card-meta">
                        <span>📅 ${dateStr}</span>
                        <span>👤 학생: ${escHtml(j.studentName || '-')}</span>
                        <span>👩‍🏫 교사: ${escHtml(j.teacherName || '-')}</span>
                    </div>
                </div>
                <button class="btn btn-outline btn-sm" onclick="openDetailModal('${j.id}')">상세보기</button>
            </div>
            <div class="journal-card-body">${escHtml(contentPreview)}</div>
            ${j.followUp ? `<div class="journal-card-followup">📌 후속조치: ${escHtml(j.followUp)}</div>` : ''}
            ${actionBtns}
        </div>`;
    }).join('');
}

// ─── 모달: 작성/수정 ──────────────────────────────────────────

function openJournalModal(id) {
    document.getElementById('journalForm').reset();
    document.getElementById('journalId').value = '';
    document.getElementById('journalModalTitle').textContent = '상담일지 작성';

    if (id) {
        // 수정 모드
        const journals = getJournals();
        const j = journals.find(x => x.id === id);
        if (!j) return;

        document.getElementById('journalModalTitle').textContent = '상담일지 수정';
        document.getElementById('journalId').value = j.id;
        document.getElementById('journalDate').value = j.counselingDate || '';
        document.getElementById('journalType').value = j.type || '';
        document.getElementById('journalStudentName').value = j.studentName || '';
        document.getElementById('journalStudentId').value = j.studentId || '';
        document.getElementById('journalTitle').value = j.title || '';
        document.getElementById('journalContent').value = j.content || '';
        document.getElementById('journalFollowUp').value = j.followUp || '';
        document.getElementById('journalPrivate').checked = !!j.isPrivate;
    } else {
        // 오늘 날짜 기본값
        document.getElementById('journalDate').value = new Date().toISOString().slice(0, 10);
    }

    document.getElementById('journalModal').classList.add('open');
}

function closeJournalModal() {
    document.getElementById('journalModal').classList.remove('open');
}

function saveJournal(event) {
    event.preventDefault();

    const id = document.getElementById('journalId').value;
    const now = new Date().toISOString();
    const journals = getJournals();

    const data = {
        id: id || String(Date.now()),
        teacherId: currentUser.id,
        teacherName: currentUser.name || currentUser.username || '',
        studentId: document.getElementById('journalStudentId').value || '',
        studentName: document.getElementById('journalStudentName').value.trim(),
        counselingDate: document.getElementById('journalDate').value,
        type: document.getElementById('journalType').value,
        title: document.getElementById('journalTitle').value.trim(),
        content: document.getElementById('journalContent').value.trim(),
        followUp: document.getElementById('journalFollowUp').value.trim(),
        isPrivate: document.getElementById('journalPrivate').checked,
        updatedAt: now,
    };

    if (id) {
        // 수정
        const idx = journals.findIndex(j => j.id === id);
        if (idx !== -1) {
            data.createdAt = journals[idx].createdAt;
            journals[idx] = data;
        }
    } else {
        // 신규
        data.createdAt = now;
        journals.push(data);
    }

    saveJournals(journals);
    closeJournalModal();
    renderJournals();
    showToast(id ? '상담일지가 수정되었습니다.' : '상담일지가 저장되었습니다.');
}

// ─── 삭제 ─────────────────────────────────────────────────────

function deleteJournal(id) {
    if (!confirm('이 상담일지를 삭제하시겠습니까?')) return;
    let journals = getJournals();
    journals = journals.filter(j => j.id !== id);
    saveJournals(journals);
    renderJournals();
    showToast('상담일지가 삭제되었습니다.');
}

// ─── 상세 모달 ────────────────────────────────────────────────

function openDetailModal(id) {
    const journals = getJournals();
    const j = journals.find(x => x.id === id);
    if (!j) return;

    document.getElementById('detailTitle').textContent = j.title || '상담일지 상세';

    const isTeacherOrAdmin = currentUser.role === 'teacher' || currentUser.role === 'admin';
    const canEdit = isTeacherOrAdmin && (
        currentUser.role === 'admin' || String(j.teacherId) === String(currentUser.id)
    );

    document.getElementById('journalDetailBody').innerHTML = `
        <table style="width:100%; border-collapse:collapse; font-size:0.9rem;">
            <tr><td style="padding:0.6rem; color:#6b7280; width:120px;">상담 날짜</td><td style="padding:0.6rem;">${formatDate(j.counselingDate)}</td></tr>
            <tr><td style="padding:0.6rem; color:#6b7280;">상담 유형</td><td style="padding:0.6rem;"><span class="journal-type-badge">${escHtml(j.type || '')}</span></td></tr>
            <tr><td style="padding:0.6rem; color:#6b7280;">학생</td><td style="padding:0.6rem;">${escHtml(j.studentName || '-')}</td></tr>
            <tr><td style="padding:0.6rem; color:#6b7280;">담당 교사</td><td style="padding:0.6rem;">${escHtml(j.teacherName || '-')}</td></tr>
        </table>
        <div style="margin-top:1rem;">
            <p style="font-weight:600; margin-bottom:0.5rem; color:#1f2937;">상담 내용</p>
            <div style="padding:0.9rem; background:#f9fafb; border-radius:6px; line-height:1.7; white-space:pre-wrap;">${escHtml(j.content || '')}</div>
        </div>
        ${j.followUp ? `
        <div style="margin-top:1rem;">
            <p style="font-weight:600; margin-bottom:0.5rem; color:#15803d;">후속 조치 / 다음 상담 계획</p>
            <div style="padding:0.9rem; background:#f0fdf4; border-radius:6px; line-height:1.7; white-space:pre-wrap; border-left:3px solid #16a34a;">${escHtml(j.followUp)}</div>
        </div>` : ''}
        ${j.isPrivate ? `<p style="margin-top:1rem; font-size:0.82rem; color:#92400e;">🔒 이 일지는 비공개로 설정되어 있습니다.</p>` : ''}
        ${canEdit ? `
        <div style="display:flex; gap:0.5rem; margin-top:1.5rem;">
            <button class="btn btn-secondary btn-sm" onclick="closeDetailModal(); openJournalModal('${j.id}')">수정</button>
            <button class="btn btn-danger btn-sm" onclick="closeDetailModal(); deleteJournal('${j.id}')">삭제</button>
        </div>` : ''}
    `;

    document.getElementById('journalDetailModal').classList.add('open');
}

function closeDetailModal() {
    document.getElementById('journalDetailModal').classList.remove('open');
}

// ─── 유틸 ─────────────────────────────────────────────────────

function escHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    try {
        const d = new Date(dateStr);
        return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
    } catch {
        return dateStr;
    }
}

function showToast(msg) {
    let toast = document.getElementById('journalToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'journalToast';
        toast.style.cssText = 'position:fixed; bottom:2rem; right:2rem; background:#1e3a8a; color:#fff; padding:0.8rem 1.4rem; border-radius:8px; font-size:0.9rem; z-index:9999; opacity:0; transition:opacity 0.3s;';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = '1';
    setTimeout(() => { toast.style.opacity = '0'; }, 2500);
}

// ─── Escape key close ─────────────────────────────────────────
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        closeJournalModal();
        closeDetailModal();
    }
});
