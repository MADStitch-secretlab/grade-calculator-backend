import { SubjectDto } from './subject.dto';

export class HistoryItemDto {
  term_id: string; // 학기 ID (예: "2024-1", "S1", "2023-2")
  credits: number; // 해당 학기 취득 학점
  achieved_avg: number; // 해당 학기 평균 성적
}

export class TermItemDto {
  id: string; // 학기 ID (예: "2025-1", "S3")
  type: 'regular' | 'summer'; // 학기 유형
  planned_credits: number; // 계획된 학점
  max_credits?: number; // 최대 수강 가능 학점
}

// OCR 프롬프트 응답 구조 (89-90 라인 프롬프트 결과)
export interface TranscriptDataDto {
  // 학생 기본 정보
  university: string;
  student_name: string;
  student_id: string;
  major: string;
  double_major?: string | null;
  minor?: string | null;

  // 과목별 상세 정보 (course_grades 테이블에 저장)
  subjects: SubjectDto[];

  // 총합 정보
  total_credits: number;
  gpa: number;
}
