-- 학과명 중복 문제 해결: is_active=true인 경우에만 unique 체크
-- Migration for fixing duplicate major names after soft delete

-- Step 1: 기존 UNIQUE constraint 삭제
ALTER TABLE majors DROP CONSTRAINT IF EXISTS majors_name_key;

-- Step 2: Partial unique index 생성 (is_active=true인 경우에만 unique)
CREATE UNIQUE INDEX IF NOT EXISTS majors_name_active_unique 
ON majors (name) WHERE is_active = true;

-- 결과 확인
SELECT 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE tablename = 'majors' AND indexname = 'majors_name_active_unique';
