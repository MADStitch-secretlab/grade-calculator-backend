// OCR 결과에서 받는 과목 정보 (프롬프트 응답 구조)
export class SubjectDto {
  name: string; // course_name으로 매핑
  credits: number;
  grade: string;
  type: string; // 전공|교양|전필|전선|교필|교선|복수전공|일선 -> course_type으로 매핑
  semester: string; // "2024-1" 형식에서 year와 semester 추출
}

// DB 저장용 DTO (course_grades 테이블 구조)
export class CourseGradeDto {
  id?: string; // UUID
  transcript_id?: string | null; // UUID
  user_id?: string | null; // UUID
  course_name: string; // NOT NULL
  course_code?: string | null;
  credits?: number | null;
  grade?: string | null;
  grade_point?: number | null; // GPA 계산용 (null 가능: P/NP 등)
  semester?: string | null; // "2024-1" 형식
  year?: number | null; // semester에서 추출
  course_type?: string | null; // 전공|교양|전필|전선|교필|교선|복수전공|일선
  professor?: string | null;
  created_at?: Date;
}
