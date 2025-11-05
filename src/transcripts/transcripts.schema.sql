-- 성적표 메인 테이블
CREATE TABLE IF NOT EXISTS transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID, -- 향후 사용자 인증 추가 시 사용
  university VARCHAR(255) NOT NULL,
  student_name VARCHAR(100) NOT NULL,
  student_id VARCHAR(50) NOT NULL,
  major VARCHAR(255) NOT NULL,
  double_major VARCHAR(255),
  minor VARCHAR(255),
  total_credits INTEGER NOT NULL DEFAULT 0,
  gpa DECIMAL(3, 2) NOT NULL DEFAULT 0.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 과목별 상세 정보 테이블
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcript_id UUID NOT NULL REFERENCES transcripts(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  credits INTEGER NOT NULL DEFAULT 0,
  grade VARCHAR(10) NOT NULL,
  type VARCHAR(20) NOT NULL, -- 전공|교양|전필|전선|교필|교선|복수전공|일선
  semester VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_transcripts_user_id ON transcripts(user_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_student_id ON transcripts(student_id);
CREATE INDEX IF NOT EXISTS idx_subjects_transcript_id ON subjects(transcript_id);
CREATE INDEX IF NOT EXISTS idx_subjects_semester ON subjects(semester);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_transcripts_updated_at 
  BEFORE UPDATE ON transcripts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

