// 전역 변수
let currentUser = null;
let posts = [];
let editingPostId = null;

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    // 인증 확인
    auth.requireAuth();
    currentUser = auth.getCurrentUser();
    
    // 관리자가 아니면 접근 불가
    if (!currentUser || currentUser.user_type !== 'admin') {
        alert('관리자만 접근할 수 있습니다.');
        window.location.href = 'dashboard.html';
        return;
    }
    
    document.getElementById('userName').textContent = currentUser.name;
    
    // 게시글 로드
    loadPosts();
    
    // 검색 입력 이벤트
    document.getElementById('searchPost').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchPosts();
        }
    });
});

// 게시글 로드
function loadPosts() {
    const postsData = localStorage.getItem('graduateNetwork_board');
    if (postsData) {
        posts = JSON.parse(postsData);
    } else {
        // 기본 데이터 생성
        posts = [
            {
                id: '1',
                category: '공지사항',
                title: '2026년 상반기 취업 지원 프로그램 안내',
                content: '2026년 상반기 취업 지원 프로그램을 다음과 같이 진행합니다.\n\n1. 이력서 작성 특강\n2. 모의 면접\n3. 취업 상담\n\n많은 참여 바랍니다.',
                author: currentUser.name,
                authorId: currentUser.id,
                views: 156,
                important: true,
                createdAt: new Date().toISOString()
            },
            {
                id: '2',
                category: '뉴스',
                title: '전공생, 전국기능경기대회 금메달 수상',
                content: '우리 학교 학생들이 전국기능경기대회에서 금메달을 수상하는 쾌거를 이루었습니다.',
                author: currentUser.name,
                authorId: currentUser.id,
                views: 89,
                important: false,
                createdAt: new Date(Date.now() - 86400000).toISOString()
            }
        ];
        localStorage.setItem('graduateNetwork_board', JSON.stringify(posts));
    }
    
    displayPosts(posts);
}

// 게시글 목록 표시
function displayPosts(postList) {
    const tbody = document.getElementById('postsTableBody');
    
    if (postList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #999; padding: 40px;">게시글이 없습니다.</td></tr>';
        return;
    }
    
    // 중요 공지를 상단에 배치
    const sortedPosts = [...postList].sort((a, b) => {
        if (a.important && !b.important) return -1;
        if (!a.important && b.important) return 1;
        return new Date(b.createdAt) - new Date(a.createdAt);
    });
    
    tbody.innerHTML = sortedPosts.map((post, index) => {
        const createdDate = new Date(post.createdAt).toLocaleDateString();
        const titlePrefix = post.important ? '<span class="badge badge-important">중요</span> ' : '';
        
        return `
            <tr ${post.important ? 'class="important-row"' : ''}>
                <td>${sortedPosts.length - index}</td>
                <td><span class="badge badge-category">${post.category}</span></td>
                <td style="text-align: left;">${titlePrefix}${post.title}</td>
                <td>${post.author}</td>
                <td>${post.views}</td>
                <td>${createdDate}</td>
                <td>
                    <button class="btn-small btn-primary" onclick="editPost('${post.id}')">수정</button>
                    <button class="btn-small btn-danger" onclick="deletePost('${post.id}')">삭제</button>
                </td>
            </tr>
        `;
    }).join('');
}

// 게시글 등록 모달 열기
function openAddPostModal() {
    editingPostId = null;
    document.getElementById('postModalTitle').textContent = '게시글 등록';
    document.getElementById('postForm').reset();
    document.getElementById('postId').value = '';
    document.getElementById('postModal').style.display = 'block';
}
window.openAddPostModal = openAddPostModal;

// 게시글 수정
function editPost(postId) {
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    
    editingPostId = postId;
    document.getElementById('postModalTitle').textContent = '게시글 수정';
    document.getElementById('postId').value = post.id;
    document.getElementById('postCategory').value = post.category;
    document.getElementById('postTitle').value = post.title;
    document.getElementById('postContent').value = post.content;
    document.getElementById('postImportant').checked = post.important || false;
    
    document.getElementById('postModal').style.display = 'block';
}
window.editPost = editPost;

// 게시글 저장
function savePost(event) {
    event.preventDefault();
    
    const postData = {
        category: document.getElementById('postCategory').value,
        title: document.getElementById('postTitle').value,
        content: document.getElementById('postContent').value,
        important: document.getElementById('postImportant').checked
    };
    
    if (editingPostId) {
        // 수정
        const index = posts.findIndex(p => p.id === editingPostId);
        if (index !== -1) {
            posts[index] = {
                ...posts[index],
                ...postData,
                updatedAt: new Date().toISOString()
            };
        }
    } else {
        // 신규 등록
        const newPost = {
            id: Date.now().toString(),
            ...postData,
            author: currentUser.name,
            authorId: currentUser.id,
            views: 0,
            createdAt: new Date().toISOString()
        };
        posts.push(newPost);
    }
    
    localStorage.setItem('graduateNetwork_board', JSON.stringify(posts));
    loadPosts();
    closePostModal();
    alert(editingPostId ? '게시글이 수정되었습니다.' : '게시글이 등록되었습니다.');
}
window.savePost = savePost;

// 게시글 삭제
function deletePost(postId) {
    if (!confirm('이 게시글을 삭제하시겠습니까?')) return;
    
    posts = posts.filter(p => p.id !== postId);
    localStorage.setItem('graduateNetwork_board', JSON.stringify(posts));
    loadPosts();
    alert('게시글이 삭제되었습니다.');
}
window.deletePost = deletePost;

// 검색 기능
function searchPosts() {
    const searchQuery = document.getElementById('searchPost').value.toLowerCase();
    const filtered = posts.filter(post => {
        const title = post.title.toLowerCase();
        const content = post.content.toLowerCase();
        
        return title.includes(searchQuery) || content.includes(searchQuery);
    });
    
    displayPosts(filtered);
}
window.searchPosts = searchPosts;

// 필터 적용
function applyFilters() {
    const category = document.getElementById('filterCategory').value;
    const searchQuery = document.getElementById('searchPost').value.toLowerCase();
    
    let filtered = posts;
    
    // 카테고리 필터
    if (category) {
        filtered = filtered.filter(p => p.category === category);
    }
    
    // 검색어 필터
    if (searchQuery) {
        filtered = filtered.filter(post => {
            const title = post.title.toLowerCase();
            const content = post.content.toLowerCase();
            
            return title.includes(searchQuery) || content.includes(searchQuery);
        });
    }
    
    displayPosts(filtered);
}
window.applyFilters = applyFilters;

// 모달 닫기
function closePostModal() {
    document.getElementById('postModal').style.display = 'none';
    editingPostId = null;
}
window.closePostModal = closePostModal;
