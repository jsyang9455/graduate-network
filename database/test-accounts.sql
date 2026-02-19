-- 각 사용자 타입별 테스트 계정 추가

-- 기존 테스트 계정이 있다면 삭제
DELETE FROM users WHERE email IN (
    'student@jjob.com',
    'graduate@jjob.com', 
    'teacher@jjob.com',
    'company@jjob.com',
    'admin@jjob.com'
);

-- 비밀번호: password123 (bcrypt 해시)
INSERT INTO users (email, password_hash, name, user_type, phone, is_active) VALUES
-- 재학생
('student@jjob.com', '$2b$10$rZ0HwKnIbZpYWzJQ/gWotuXp8kCVmH/k7dCLJW/RA7gx1i5YvYLVm', '김재학', 'student', '010-1111-1111', true),

-- 졸업생
('graduate@jjob.com', '$2b$10$rZ0HwKnIbZpYWzJQ/gWotuXp8kCVmH/k7dCLJW/RA7gx1i5YvYLVm', '이졸업', 'graduate', '010-2222-2222', true),

-- 교사
('teacher@jjob.com', '$2b$10$rZ0HwKnIbZpYWzJQ/gWotuXp8kCVmH/k7dCLJW/RA7gx1i5YvYLVm', '박선생', 'teacher', '010-3333-3333', true),

-- 기업
('company@jjob.com', '$2b$10$rZ0HwKnIbZpYWzJQ/gWotuXp8kCVmH/k7dCLJW/RA7gx1i5YvYLVm', 'JJOB채용담당', 'company', '010-4444-4444', true),

-- 관리자
('admin@jjob.com', '$2b$10$rZ0HwKnIbZpYWzJQ/gWotuXp8kCVmH/k7dCLJW/RA7gx1i5YvYLVm', 'JJOB관리자', 'admin', '010-5555-5555', true);

-- 졸업생 프로필 추가
INSERT INTO graduate_profiles (user_id, graduation_year, major, current_company, current_position, bio, skills, is_mentor, mentor_capacity)
SELECT id, 2022, '전자과', 'LG전자', '사원', '열심히 일하고 있는 졸업생입니다.', ARRAY['C++', 'Python', '전자회로'], false, 0
FROM users WHERE email = 'graduate@jjob.com';

-- 기업 프로필 추가
INSERT INTO company_profiles (user_id, company_name, industry, company_size, website, description, founded_year)
SELECT id, 'JJOB채용', 'IT/서비스', '스타트업', 'https://jjob.com', '전주공고 졸업생을 위한 채용 플랫폼', 2026
FROM users WHERE email = 'company@jjob.com';

-- 성공 메시지
SELECT '✅ 테스트 계정이 성공적으로 추가되었습니다!' as message;
SELECT '📧 이메일 형식: {타입}@jjob.com (예: student@jjob.com)' as info;
SELECT '🔑 모든 계정의 비밀번호: password123' as password;
