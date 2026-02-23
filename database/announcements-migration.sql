-- AWS 서버 공지사항 테이블 마이그레이션
-- 실행 방법: docker exec -i graduate-network-db psql -U postgres -d graduate_network < database/announcements-migration.sql

-- 1. announcements 테이블 생성
CREATE TABLE IF NOT EXISTS announcements (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    organizer VARCHAR(100),
    description TEXT,
    event_date DATE,
    event_time VARCHAR(50),
    location VARCHAR(200),
    deadline DATE,
    capacity INTEGER DEFAULT 0,
    current_applicants INTEGER DEFAULT 0,
    fee VARCHAR(200),
    benefits TEXT[],
    requirements TEXT[],
    contact_phone VARCHAR(30),
    contact_email VARCHAR(100),
    tags TEXT[],
    rating DECIMAL(2,1) DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    image_url VARCHAR(500),
    detail_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 기존 컬럼 타입 보정 (이미 있는 경우)
DO $$
BEGIN
    -- updated_at 컬럼 추가 (없을 경우)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='announcements' AND column_name='updated_at'
    ) THEN
        ALTER TABLE announcements ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;

    -- is_active 컬럼 추가 (없을 경우)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='announcements' AND column_name='is_active'
    ) THEN
        ALTER TABLE announcements ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;

-- fee 컬럼 길이 확장 (VARCHAR(50) -> VARCHAR(200))
ALTER TABLE announcements ALTER COLUMN fee TYPE VARCHAR(200);
-- contact_phone 컬럼 길이 확장
ALTER TABLE announcements ALTER COLUMN contact_phone TYPE VARCHAR(30);

-- 3. announcement_applications 테이블 생성
CREATE TABLE IF NOT EXISTS announcement_applications (
    id SERIAL PRIMARY KEY,
    announcement_id INTEGER REFERENCES announcements(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    applicant_name VARCHAR(100) NOT NULL,
    applicant_phone VARCHAR(20) NOT NULL,
    applicant_email VARCHAR(100),
    message TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_applications_announcement ON announcement_applications(announcement_id);
CREATE INDEX IF NOT EXISTS idx_applications_user ON announcement_applications(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_applications_unique ON announcement_applications(announcement_id, user_id);
CREATE INDEX IF NOT EXISTS idx_announcements_type ON announcements(type);
CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(is_active);

-- 4. 공지사항 샘플 데이터 (없을 경우에만 삽입)
INSERT INTO announcements (type, title, organizer, description, event_date, event_time, location, deadline, capacity, current_applicants, fee, benefits, requirements, contact_phone, contact_email, tags, rating, review_count)
SELECT * FROM (VALUES
  ('job-fair'::varchar, '2026 전북지역 취업박람회', '전라북도', '전북지역 우수 기업 50개사 참여하는 대형 취업박람회. 현장 면접 및 채용 상담을 진행합니다.', '2026-03-15'::date, '10:00 - 17:00', '전주 한국소리문화의전당', '2026-03-10'::date, 500, 312, '무료', ARRAY['현장 채용 가능', '이력서 클리닉', '면접 컨설팅', '기업 상담'], ARRAY['이력서 2부 지참', '신분증 지참', '정장 착용 권장'], '063-280-3000', 'jobfair@jeonbuk.go.kr', ARRAY['취업', '면접', '전북'], 4.5::decimal(2,1), 128),
  ('job-fair'::varchar, '2026 스마트 제조 취업박람회', '전주시산업진흥원', '스마트 제조, 전기/전자, 기계 분야 전문 취업박람회. 지역 강소기업 30개사 참여.', '2026-04-02'::date, '09:00 - 16:00', '전주 중소기업지원센터', '2026-03-28'::date, 300, 175, '무료', ARRAY['현장 채용', '취업 컨설팅', '직무 교육 안내'], ARRAY['직무 관련 이력서', '포트폴리오(해당자)', '신분증'], '063-711-2000', 'smart@jeonjuipa.or.kr', ARRAY['제조업', '스마트팩토리', '취업'], 4.2::decimal(2,1), 85),
  ('job-fair'::varchar, '2026 공공기관 채용 설명회', '전북인재개발원', '전북 소재 공공기관 및 공기업 20여 개 기관 참여. 채용 절차 및 준비 방법 안내.', '2026-04-20'::date, '13:00 - 18:00', '전북인재개발원 대강당', '2026-04-15'::date, 200, 89, '무료', ARRAY['기관별 채용 안내', 'NCS 설명', '선배 멘토링'], ARRAY['신분증', '메모 도구'], '063-250-5000', 'recruit@jeonbuk.ac.kr', ARRAY['공공기관', '공기업', 'NCS'], 4.7::decimal(2,1), 56),
  ('industry-visit'::varchar, '현대중공업 군산 공장 견학', '현대중공업(주)', '현대중공업 군산 공장을 방문하여 조선·해양 생산 공정을 직접 체험하는 프로그램.', '2026-03-20'::date, '09:00 - 16:00', '현대중공업 군산공장', '2026-03-14'::date, 30, 22, '무료', ARRAY['점심 제공', '공장 투어', '현직자 강연', '기념품 증정'], ARRAY['안전화 착용', '긴 소매 의류', '카메라 반입 불가'], '063-440-1000', 'visit@hhi.co.kr', ARRAY['조선', '제조', '현장체험'], 4.8::decimal(2,1), 34),
  ('industry-visit'::varchar, 'LG전자 창원 스마트팩토리 견학', 'LG전자(주)', '스마트팩토리 자동화 라인 및 품질관리 프로세스 견학. AI/로봇 활용 현장 체험.', '2026-04-10'::date, '10:00 - 15:00', 'LG전자 창원 1공장', '2026-04-05'::date, 25, 18, '무료', ARRAY['현장 투어', '담당자 특강', '채용 연계 가능', '교통비 지원'], ARRAY['정장 또는 단정한 복장', '정보보안 서약서 제출'], '055-260-1114', 'factory.visit@lg.com', ARRAY['스마트팩토리', '전자', '자동화'], 4.6::decimal(2,1), 27),
  ('industry-visit'::varchar, '전북 농기계 클러스터 견학', '전라북도 농업기술원', '농기계 제조·수리 전문 클러스터 방문. 농업기계 산업 현황 및 취업 기회 탐색.', '2026-03-28'::date, '13:00 - 17:00', '전북 익산 농기계 클러스터', '2026-03-22'::date, 40, 15, '무료', ARRAY['현장 투어', '기업 담당자 면담', '채용 연계'], ARRAY['편한 복장', '운동화'], '063-290-6000', 'agri@jeonbuk.go.kr', ARRAY['농기계', '제조업', '클러스터'], 4.1::decimal(2,1), 19),
  ('certification'::varchar, '전기기사 시험 준비반 지원', '한국산업인력공단', '전기기사 국가기술자격 취득 지원. 학원 수강료 및 교재비 지원.', '2026-03-01'::date, '상시', '지원대상자 거주지 인근 학원', '2026-02-25'::date, 50, 38, '수강료 80% 지원', ARRAY['학원 수강료 최대 50만원 지원', '교재비 10만원 지원', '응시료 지원'], ARRAY['재학생 또는 졸업 2년 이내', '전기 관련 학과 전공'], '1644-8000', 'cert@hrdkorea.or.kr', ARRAY['전기기사', '국가자격증', '수강료지원'], 4.9::decimal(2,1), 203),
  ('certification'::varchar, '정보처리기사 취득 지원 프로그램', '한국정보화진흥원', 'IT 분야 핵심 자격증 취득 지원. 온라인 강의 및 모의고사 제공.', '2026-03-10'::date, '상시', '온라인(인터넷 강의)', '2026-03-05'::date, 100, 67, '전액 무료', ARRAY['온라인 강의 무료 제공', '모의고사 10회 제공', '스터디 매칭', '취업 연계'], ARRAY['IT 관련 학과 재학 또는 졸업', '이메일 인증 필요'], '02-2131-0114', 'it.cert@nia.or.kr', ARRAY['정보처리기사', 'IT', '무료지원'], 4.7::decimal(2,1), 156),
  ('certification'::varchar, '용접기능사 자격증 취득 과정', '폴리텍대학 전주캠퍼스', '용접기능사 자격증 취득을 위한 실기 위주 교육 과정. 훈련 수당 지급.', '2026-04-01'::date, '09:00 - 18:00', '폴리텍대학 전주캠퍼스 실습동', '2026-03-25'::date, 20, 12, '전액 무료 + 훈련수당', ARRAY['교육 전액 무료', '훈련수당 월 40만원', '실습재료 제공', '자격증 응시료 지원'], ARRAY['고졸 이상', '만 15세 이상', '건강보험 가입자'], '063-270-7000', 'weld@jeonju.kopo.ac.kr', ARRAY['용접기능사', '실기교육', '훈련수당'], 4.5::decimal(2,1), 87)
) AS v(type, title, organizer, description, event_date, event_time, location, deadline, capacity, current_applicants, fee, benefits, requirements, contact_phone, contact_email, tags, rating, review_count)
WHERE NOT EXISTS (SELECT 1 FROM announcements WHERE announcements.title = v.title);

-- 결과 확인
SELECT type, COUNT(*) FROM announcements GROUP BY type ORDER BY type;
