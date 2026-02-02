-- Create test accounts with proper bcrypt hashes
-- Password for all accounts: password123
-- Hash: $2b$10$AknqEf4ZBF0oo6hG5cfSZu1xgs4kzgdnhO/HXxMMGZGxeMGIi0WjG

INSERT INTO users (email, password_hash, name, user_type, phone, is_active) VALUES
('student@jjob.com', '$2b$10$AknqEf4ZBF0oo6hG5cfSZu1xgs4kzgdnhO/HXxMMGZGxeMGIi0WjG', '김재학', 'student', '010-1234-5678', true),
('graduate@jjob.com', '$2b$10$AknqEf4ZBF0oo6hG5cfSZu1xgs4kzgdnhO/HXxMMGZGxeMGIi0WjG', '이졸업', 'graduate', '010-2345-6789', true),
('teacher@jjob.com', '$2b$10$AknqEf4ZBF0oo6hG5cfSZu1xgs4kzgdnhO/HXxMMGZGxeMGIi0WjG', '박선생', 'teacher', '010-3456-7890', true),
('company@jjob.com', '$2b$10$AknqEf4ZBF0oo6hG5cfSZu1xgs4kzgdnhO/HXxMMGZGxeMGIi0WjG', '현대자동차', 'company', '02-1234-5678', true),
('admin@jjob.com', '$2b$10$AknqEf4ZBF0oo6hG5cfSZu1xgs4kzgdnhO/HXxMMGZGxeMGIi0WjG', '관리자', 'admin', '010-9999-9999', true);

-- Add graduate profile
INSERT INTO graduate_profiles (user_id, graduation_year, major, current_company, current_position)
SELECT id, 2020, '컴퓨터공학', '삼성전자', '소프트웨어 엔지니어'
FROM users WHERE email = 'graduate@jjob.com';

-- Add company profile
INSERT INTO company_profiles (user_id, company_name, business_number, industry, employee_count, company_address, website)
SELECT id, '현대자동차', '123-45-67890', '자동차 제조', '10000+', '서울시 강남구', 'https://www.hyundai.com'
FROM users WHERE email = 'company@jjob.com';
