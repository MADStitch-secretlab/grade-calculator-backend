# 데이터베이스 저장 설정 가이드

## 1. Supabase 클라이언트 패키지 설치

```bash
npm install @supabase/supabase-js
```

## 2. 환경 변수 설정 (.env)

```bash
# Supabase 설정
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-key
# 또는
# SUPABASE_ANON_KEY=your-anon-key
```

## 3. 사용 방법

### API 호출
```bash
POST /api/transcripts/upload
Content-Type: multipart/form-data

file: [PDF 파일]
```

### 응답 예시
```json
{
  "success": true,
  "data": {
    "university": "서울대학교",
    "student_name": "홍길동",
    "student_id": "2024001234",
    "major": "컴퓨터공학부",
    "double_major": null,
    "minor": null,
    "subjects": [...],
    "total_credits": 130,
    "gpa": 4.2,
    "db_save_result": {
      "saved": 45,
      "errors": 0
    }
  },
  "performance": {...}
}
```

## 4. 데이터베이스 구조

OCR 결과는 `course_grades` 테이블에 저장됩니다:

- `course_name`: 과목명 (NOT NULL)
- `credits`: 학점
- `grade`: 성적 (A+, A, B+ 등)
- `grade_point`: GPA 점수 (자동 계산)
- `semester`: 학기 (예: "2024-1")
- `year`: 연도 (semester에서 자동 추출)
- `course_type`: 과목 유형 (전공, 교양, 전필, 전선 등)
- `user_id`: 사용자 ID (선택적)
- `transcript_id`: 성적표 ID (향후 transcripts 테이블 생성 시 사용)

## 5. 성적 변환 표

| 성적 | GPA 점수 |
|------|----------|
| A+   | 4.5      |
| A    | 4.0      |
| A-   | 3.7      |
| B+   | 3.5      |
| B    | 3.0      |
| B-   | 2.7      |
| C+   | 2.5      |
| C    | 2.0      |
| C-   | 1.7      |
| D+   | 1.5      |
| D    | 1.0      |
| D-   | 0.7      |
| F    | 0.0      |

P, NP, S, U 등은 학점 미포함으로 처리됩니다.

