-- ============================================
-- Supabase/PostgreSQL 기존 테이블 구조 확인 명령어
-- ============================================

-- 1. 모든 테이블 목록 확인
SELECT 
  table_schema,
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY table_schema, table_name;

-- 2. 특정 테이블의 상세 구조 확인 (컬럼 정보)
SELECT 
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'transcripts'  -- 테이블명 변경 가능
ORDER BY ordinal_position;

-- 3. 모든 테이블의 컬럼 정보 전체 확인
SELECT 
  table_name,
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default,
  ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- 4. 외래키 관계 확인
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- 5. 인덱스 확인
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 6. 테이블별 요약 정보 (컬럼 수, 행 수 등)
SELECT 
  t.table_name,
  COUNT(c.column_name) AS column_count,
  pg_size_pretty(pg_total_relation_size(quote_ident(t.table_schema)||'.'||quote_ident(t.table_name))) AS table_size
FROM information_schema.tables t
LEFT JOIN information_schema.columns c 
  ON t.table_name = c.table_name 
  AND t.table_schema = c.table_schema
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
GROUP BY t.table_name, t.table_schema
ORDER BY t.table_name;

-- 7. 전체 스키마 DDL 출력 (테이블 생성 스크립트)
-- pg_dump를 사용하거나, Supabase Dashboard의 SQL Editor에서 실행:
SELECT 
  'CREATE TABLE ' || table_name || ' (' || E'\n' ||
  string_agg(
    '  ' || column_name || ' ' || 
    CASE 
      WHEN data_type = 'character varying' THEN 'VARCHAR(' || character_maximum_length || ')'
      WHEN data_type = 'character' THEN 'CHAR(' || character_maximum_length || ')'
      WHEN data_type = 'numeric' THEN 'NUMERIC(' || numeric_precision || ',' || numeric_scale || ')'
      WHEN data_type = 'timestamp without time zone' THEN 'TIMESTAMP'
      WHEN data_type = 'timestamp with time zone' THEN 'TIMESTAMPTZ'
      ELSE UPPER(data_type)
    END ||
    CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
    CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END,
    ',' || E'\n'
    ORDER BY ordinal_position
  ) || E'\n);' AS create_table_statement
FROM information_schema.columns
WHERE table_schema = 'public'
GROUP BY table_name
ORDER BY table_name;

