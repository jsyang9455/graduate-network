-- ============================================================
-- 마이그레이션: 상담일지 테이블 추가
-- 실행 방법: 기존 데이터에 전혀 영향 없음 (IF NOT EXISTS 사용)
-- ============================================================

CREATE TABLE IF NOT EXISTS counseling_journals (
    id          SERIAL PRIMARY KEY,
    teacher_id  INTEGER REFERENCES users(id) ON DELETE SET NULL,
    teacher_name VARCHAR(100) NOT NULL,
    student_id  INTEGER REFERENCES users(id) ON DELETE SET NULL,
    student_name VARCHAR(100) NOT NULL,
    counseling_date DATE NOT NULL,
    type        VARCHAR(30) NOT NULL CHECK (type IN ('진로상담', '취업상담', '심리상담', '학습상담', '기타')),
    title       VARCHAR(200) NOT NULL,
    content     TEXT NOT NULL,
    follow_up   TEXT,
    is_private  BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 (중복 생성 방지)
CREATE INDEX IF NOT EXISTS idx_journals_teacher   ON counseling_journals(teacher_id);
CREATE INDEX IF NOT EXISTS idx_journals_student   ON counseling_journals(student_id);
CREATE INDEX IF NOT EXISTS idx_journals_date      ON counseling_journals(counseling_date DESC);

-- updated_at 자동 갱신 트리거 (함수가 없으면 생성)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at'
    ) THEN
        EXECUTE $func$
            CREATE FUNCTION set_updated_at()
            RETURNS TRIGGER AS $trig$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END
            $trig$ LANGUAGE plpgsql;
        $func$;
    END IF;
END
$$;

DROP TRIGGER IF EXISTS trg_journals_updated_at ON counseling_journals;
CREATE TRIGGER trg_journals_updated_at
    BEFORE UPDATE ON counseling_journals
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
