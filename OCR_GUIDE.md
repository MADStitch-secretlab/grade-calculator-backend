# PDF 성적표 OCR 가이드

## 개요

GPT-4o-mini 모델을 사용하여 PDF 성적표에서 학생 정보와 과목별 성적을 자동으로 추출하는 기능입니다.

## 특징

- **자동 정보 추출**: 학생명, 학번, 전공, 복수전공, 부전공 자동 인식
- **과목별 성적 파싱**: 과목명, 학점, 성적, 이수 구분, 학기 정보 추출
- **성능 모니터링**: 각 처리 단계별 소요 시간 추적
- **에러 처리**: 상세한 에러 로깅 및 원본 결과 반환

## API 엔드포인트

### POST /api/transcripts/upload

PDF 성적표를 업로드하여 분석합니다.

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Field name: `file`
- File type: `application/pdf`
- Max size: 10MB

**Response:**

성공 시:
```json
{
  "success": true,
  "data": {
    "university": "서울대학교",
    "student_name": "홍길동",
    "student_id": "2020-12345",
    "major": "컴퓨터공학과",
    "double_major": null,
    "minor": null,
    "subjects": [
      {
        "name": "자료구조",
        "credits": 3,
        "grade": "A+",
        "type": "전필",
        "semester": "2020-1"
      },
      {
        "name": "알고리즘",
        "credits": 3,
        "grade": "A0",
        "type": "전선",
        "semester": "2020-2"
      }
    ],
    "total_credits": 120,
    "gpa": 4.2
  },
  "performance": {
    "buffer_time": 2,
    "file_create_time": 1,
    "upload_time": 850,
    "gpt_analysis_time": 3500,
    "json_parse_time": 1,
    "total_time": 4354
  }
}
```

실패 시:
```json
{
  "success": false,
  "error": "JSON 파싱 실패",
  "raw_result": "원본 GPT 응답"
}
```

## 사용 방법

### 1. 환경 설정

`.env` 파일에 OpenAI API 키를 설정합니다:

```bash
OPENAI_API_KEY=sk-your-api-key-here
```

### 2. cURL을 사용한 테스트

```bash
curl -X POST http://localhost:3000/api/transcripts/upload \
  -F "file=@/path/to/transcript.pdf"
```

### 3. httpie를 사용한 테스트

```bash
http --form POST localhost:3000/api/transcripts/upload \
  file@/path/to/transcript.pdf
```

### 4. Postman을 사용한 테스트

1. **새 Request 생성**
   - Method: `POST`
   - URL: `http://localhost:3000/api/transcripts/upload`

2. **Body 설정**
   - Body → form-data 선택
   - Key: `file` (타입: File로 변경)
   - Value: PDF 파일 선택

3. **Send 클릭**

### 5. JavaScript/TypeScript 코드 예제

```typescript
const formData = new FormData();
formData.append('file', pdfFile);

const response = await fetch('http://localhost:3000/api/transcripts/upload', {
  method: 'POST',
  body: formData,
});

const result = await response.json();
console.log(result);
```

## 추출되는 정보

### 학생 정보
- `university`: 학교명
- `student_name`: 학생 이름
- `student_id`: 학번
- `major`: 주전공
- `double_major`: 복수전공 (있는 경우)
- `minor`: 부전공 (있는 경우)

### 성적 정보
- `subjects`: 과목 배열
  - `name`: 과목명
  - `credits`: 학점
  - `grade`: 성적 (A+, A0, B+, ...)
  - `type`: 이수 구분 (전필, 전선, 교필, 교선, 복수전공, 일선)
  - `semester`: 수강 학기
- `total_credits`: 총 이수 학점
- `gpa`: 평점

### 성능 메트릭스
- `buffer_time`: Buffer 변환 시간 (ms)
- `file_create_time`: File 객체 생성 시간 (ms)
- `upload_time`: OpenAI 파일 업로드 시간 (ms)
- `gpt_analysis_time`: GPT 분석 시간 (ms)
- `json_parse_time`: JSON 파싱 시간 (ms)
- `total_time`: 전체 처리 시간 (ms)

## 에러 처리

### 파일 없음
```json
{
  "message": "파일이 없습니다.",
  "error": "Bad Request",
  "statusCode": 400
}
```

### PDF가 아닌 파일
```json
{
  "message": "PDF 파일만 업로드 가능합니다.",
  "error": "Bad Request",
  "statusCode": 400
}
```

### 파일 크기 초과
```json
{
  "message": "File too large",
  "error": "Payload Too Large",
  "statusCode": 413
}
```

### OpenAI API 에러
```json
{
  "success": false,
  "error": "OpenAI API error message"
}
```

## 로깅

서비스는 각 처리 단계별로 상세한 로그를 출력합니다:

```
[TranscriptsService] === PDF 파일 업로드 완료 ===
[TranscriptsService] 파일명: transcript.pdf, 크기: 245678 bytes
[TranscriptsService] === OpenAI에 PDF 직접 업로드 중 ===
[TranscriptsService] ⏱️ Buffer 변환 시간: 2ms
[TranscriptsService] ⏱️ File 객체 생성 시간: 1ms
[TranscriptsService] OpenAI 파일 업로드 완료: file-abc123
[TranscriptsService] ⏱️ OpenAI 업로드 시간: 850ms
[TranscriptsService] === GPT 분석 시작 ===
[TranscriptsService] ⏱️ GPT 분석 시간: 3500ms
[TranscriptsService] === GPT 응답 결과 ===
[TranscriptsService] {...}
[TranscriptsService] === GPT 응답 완료 ===
[TranscriptsService] ⏱️ JSON 파싱 시간: 1ms
[TranscriptsService] === JSON 파싱 결과 ===
[TranscriptsService] {...}
[TranscriptsService] ⏱️ 전체 처리 시간: 4354ms
[TranscriptsService] === 최종 처리 완료 ===
```

## 성능 최적화 팁

1. **파일 크기**: 최대한 작은 PDF 파일 사용 (3-5MB 이하 권장)
2. **이미지 품질**: PDF 내 이미지가 너무 고해상도일 필요 없음
3. **페이지 수**: 필요한 페이지만 포함된 PDF 사용
4. **캐싱**: 동일한 파일은 결과를 캐싱하여 재사용 권장

## 지원하는 성적표 형식

- 대부분의 한국 대학교 성적표 형식
- 학생 정보와 과목별 성적이 명확히 구분된 PDF
- 스캔된 성적표 (텍스트 레이어가 있는 경우 더 정확)

## 주의사항

1. **개인정보 보호**: 성적표는 민감한 개인정보이므로 안전하게 처리
2. **API 비용**: OpenAI API 사용에 따른 비용 발생
3. **처리 시간**: PDF 분석에 3-5초 정도 소요
4. **정확도**: GPT 모델의 응답이므로 100% 정확도를 보장하지 않음

## 트러블슈팅

### OpenAI API 키 오류
```
OPENAI_API_KEY is not configured
```
**해결**: `.env` 파일에 유효한 API 키 설정

### PDF 파싱 실패
**원인**: PDF 형식이 특이하거나 텍스트 레이어가 없는 경우
**해결**: PDF를 다시 생성하거나 OCR 처리된 PDF 사용

### JSON 파싱 에러
**원인**: GPT 응답이 예상한 형식과 다른 경우
**해결**: `raw_result` 확인하여 GPT 응답 검토

## 향후 개선 계획

- [ ] 다양한 대학교 성적표 형식 지원
- [ ] 멀티 페이지 PDF 처리 개선
- [ ] 추출 정확도 향상
- [ ] 처리 속도 최적화
- [ ] 배치 처리 기능
- [ ] 결과 검증 및 수정 UI

## 관련 문서

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [GPT-4o-mini Model](https://platform.openai.com/docs/models/gpt-4o-mini)
- [File Upload Best Practices](https://platform.openai.com/docs/guides/files)
