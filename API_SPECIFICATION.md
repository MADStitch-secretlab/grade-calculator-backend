# Grade Calculator API 명세서

프론트엔드 개발자를 위한 API 명세서입니다.

## 기본 정보

- **Base URL**: `http://localhost:5001` (개발 환경)
- **Content-Type**: `application/json` (파일 업로드 제외)
- **인증**: 현재 미사용 (향후 추가 예정)

---

## 1. 성적표 OCR (PDF 업로드)

### `POST /api/transcripts/upload`

PDF 성적표를 업로드하여 OCR 분석 및 데이터베이스 저장을 수행합니다.

#### Request

**Headers:**
```
Content-Type: multipart/form-data
```

**Body (FormData):**
- `file` (File, required): PDF 파일
  - 최대 크기: 10MB
  - MIME 타입: `application/pdf`

#### Response

**성공 (200 OK):**
```json
{
  "success": true,
  "data": {
    "university": "공과대학",
    "student_name": "임동혁",
    "student_id": "12190584",
    "major": "조선해양공학",
    "double_major": null,
    "minor": null,
    "subjects": [
      {
        "name": "일반화학",
        "credits": 3,
        "grade": "C+",
        "type": "교필",
        "semester": "2019학년도 1학기"
      }
      // ... 더 많은 과목들
    ],
    "total_credits": 127,
    "gpa": 3.23,
    "db_save_result": {
      "success": true,
      "transcriptId": "uuid-string",
      "saved": 50,
      "errors": 0
    }
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

**실패 (400 Bad Request):**
```json
{
  "success": false,
  "error": "PDF 파일만 업로드 가능합니다.",
  "raw_result": "원본 GPT 응답 (있을 경우)"
}
```

#### 에러 케이스

| Status Code | 에러 메시지 | 설명 |
|------------|------------|------|
| 400 | "파일이 없습니다." | 파일이 전송되지 않음 |
| 400 | "PDF 파일만 업로드 가능합니다." | PDF가 아닌 파일 업로드 |
| 413 | "File too large" | 10MB 초과 |

#### 사용 예시

**JavaScript (Fetch API):**
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const response = await fetch('http://localhost:5000/api/transcripts/upload', {
  method: 'POST',
  body: formData
});

const result = await response.json();
```

**Axios:**
```javascript
const formData = new FormData();
formData.append('file', file);

const response = await axios.post(
  'http://localhost:5000/api/transcripts/upload',
  formData,
  {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  }
);
```

---

## 2. OCR 결과를 시뮬레이션 입력으로 변환

### `POST /api/transcripts/convert-to-simulation`

OCR 결과를 GPA 시뮬레이션 모델 입력 형식으로 변환합니다.

#### Request

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "transcriptData": {
    "university": "공과대학",
    "student_name": "임동혁",
    "student_id": "12190584",
    "major": "조선해양공학",
    "double_major": null,
    "minor": null,
    "subjects": [
      {
        "name": "일반화학",
        "credits": 3,
        "grade": "C+",
        "type": "교필",
        "semester": "2019학년도 1학기"
      }
    ],
    "total_credits": 127,
    "gpa": 3.23
  },
  "targetGpa": 4.2,
  "targetTotalCredits": 130,
  "scaleMax": 4.5,
  "futureTerms": [
    {
      "id": "S3",
      "type": "regular",
      "planned_credits": 18,
      "max_credits": 21
    }
  ]
}
```

**필드 설명:**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `transcriptData` | object | ✅ | OCR 결과 데이터 |
| `targetGpa` | number | ✅ | 목표 GPA (0.1 ~ 5.0) |
| `targetTotalCredits` | number | ✅ | 목표 총 학점 (1 이상) |
| `scaleMax` | number | ❌ | 최대 평점 (기본값: 4.5) |
| `futureTerms` | array | ❌ | 미래 학기 계획 (없으면 자동 생성) |

#### Response

**성공 (200 OK):**
```json
{
  "success": true,
  "data": {
    "scale_max": 4.5,
    "G_t": 4.2,
    "C_tot": 130,
    "history": [
      {
        "term_id": "S1",
        "credits": 18,
        "achieved_avg": 3.2
      },
      {
        "term_id": "S2",
        "credits": 18,
        "achieved_avg": 3.5
      }
    ],
    "terms": [
      {
        "id": "S3",
        "type": "regular",
        "planned_credits": 18,
        "max_credits": 21
      },
      {
        "id": "S4",
        "type": "regular",
        "planned_credits": 18,
        "max_credits": 21
      }
    ]
  }
}
```

**실패 (400 Bad Request):**
```json
{
  "success": false,
  "error": "transcriptData, targetGpa, targetTotalCredits는 필수입니다."
}
```

#### 사용 예시

```javascript
const response = await fetch('http://localhost:5000/api/transcripts/convert-to-simulation', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    transcriptData: ocrResult.data,
    targetGpa: 4.2,
    targetTotalCredits: 130,
    scaleMax: 4.5
  })
});

const result = await response.json();
```

---

## 3. GPA 시뮬레이션 실행

### `POST /api/gpa/simulate`

목표 GPA 달성을 위한 학기별 필요 평점을 계산합니다.

#### Request

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "scale_max": 4.5,
  "G_t": 4.2,
  "C_tot": 130,
  "history": [
    {
      "term_id": "S1",
      "credits": 18,
      "achieved_avg": 3.8
    },
    {
      "term_id": "S2",
      "credits": 18,
      "achieved_avg": 3.9
    }
  ],
  "terms": [
    {
      "id": "S3",
      "type": "regular",
      "planned_credits": 18,
      "max_credits": 21
    },
    {
      "id": "S4",
      "type": "regular",
      "planned_credits": 18,
      "max_credits": 21
    }
  ]
}
```

**필드 설명:**

| 필드 | 타입 | 필수 | 제약 | 설명 |
|------|------|------|------|------|
| `scale_max` | number | ✅ | >= 0.1 | 평점 최대값 (보통 4.5) |
| `G_t` | number | ✅ | 0.1 ~ 5.0 | 목표 GPA |
| `C_tot` | number | ✅ | >= 1 | 졸업 요구 총 학점 |
| `history` | array | ✅ | - | 이수 완료 학기 목록 |
| `history[].term_id` | string | ✅ | - | 학기 ID (예: "S1", "S2") |
| `history[].credits` | number | ✅ | >= 0.1 | 해당 학기 취득 학점 |
| `history[].achieved_avg` | number | ✅ | >= 0 | 해당 학기 평균 평점 |
| `terms` | array | ✅ | - | 남은 학기 목록 |
| `terms[].id` | string | ✅ | - | 학기 ID |
| `terms[].type` | string | ✅ | "regular" \| "summer" | 학기 유형 |
| `terms[].planned_credits` | number | ✅ | >= 0.1 | 계획된 학점 |
| `terms[].max_credits` | number | ❌ | >= 0.1 | 최대 수강 가능 학점 |

#### Response

**성공 (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "term_id": "S3",
      "credits": 18,
      "required_avg": 4.18
    },
    {
      "term_id": "S4",
      "credits": 18,
      "required_avg": 4.18
    }
  ],
  "message": "시뮬레이션이 완료되었습니다"
}
```

**실패 케이스:**

**1. 입력 검증 실패 (400 Bad Request):**
```json
{
  "success": false,
  "error": "INVALID_INPUT",
  "message": "G_t must not be greater than 5.0"
}
```

**2. 목표 달성 불가능 (422 Unprocessable Entity):**
```json
{
  "success": false,
  "error": "TARGET_IMPOSSIBLE",
  "message": "목표 GPA를 달성할 수 없습니다. 목표를 낮추거나 계절학기를 추가하세요.",
  "detail": "목표 GPA 4.5는 현재 학점으로는 달성 불가능합니다."
}
```

**3. 서버 오류 (500 Internal Server Error):**
```json
{
  "success": false,
  "error": "SERVER_ERROR",
  "message": "시뮬레이션 중 오류가 발생했습니다."
}
```

#### 에러 코드

| 에러 코드 | Status Code | 설명 |
|----------|------------|------|
| `INVALID_INPUT` | 400 | 입력값 검증 실패 |
| `TARGET_IMPOSSIBLE` | 422 | 목표 GPA 달성 불가능 |
| `SERVER_ERROR` | 500 | 서버 내부 오류 |

#### 사용 예시

```javascript
const response = await fetch('http://localhost:5000/api/gpa/simulate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    scale_max: 4.5,
    G_t: 4.2,
    C_tot: 130,
    history: [
      { term_id: "S1", credits: 18, achieved_avg: 3.8 }
    ],
    terms: [
      { id: "S2", type: "regular", planned_credits: 18, max_credits: 21 }
    ]
  })
});

const result = await response.json();

if (result.success) {
  result.data.forEach(term => {
    console.log(`${term.term_id}: ${term.required_avg}점 필요`);
  });
} else {
  console.error(result.error, result.message);
}
```

---

## 4. 헬스체크

### `GET /api/gpa/health`

GPA 시뮬레이터 서비스의 상태를 확인합니다.

#### Request

없음

#### Response

**성공 (200 OK):**
```json
{
  "service": "GPA Simulator",
  "status": "healthy"
}
```

**서비스 다운 시:**
```json
{
  "service": "GPA Simulator",
  "status": "unhealthy"
}
```

#### 사용 예시

```javascript
const response = await fetch('http://localhost:5000/api/gpa/health');
const result = await response.json();

if (result.status === 'healthy') {
  console.log('서비스 정상');
} else {
  console.log('서비스 오류');
}
```

---

## 전체 플로우 예시

### 1. PDF 업로드 → OCR 분석
```javascript
// 1단계: PDF 업로드 및 OCR
const formData = new FormData();
formData.append('file', pdfFile);

const uploadResponse = await fetch('/api/transcripts/upload', {
  method: 'POST',
  body: formData
});

const ocrResult = await uploadResponse.json();
// ocrResult.data에 성적표 데이터 포함
```

### 2. OCR 결과 변환
```javascript
// 2단계: 시뮬레이션 입력 형식으로 변환
const convertResponse = await fetch('/api/transcripts/convert-to-simulation', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    transcriptData: ocrResult.data,
    targetGpa: 4.2,
    targetTotalCredits: 130
  })
});

const simulationInput = await convertResponse.json();
// simulationInput.data에 변환된 데이터 포함
```

### 3. 시뮬레이션 실행
```javascript
// 3단계: GPA 시뮬레이션 실행
const simulateResponse = await fetch('/api/gpa/simulate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(simulationInput.data)
});

const simulationResult = await simulateResponse.json();
// simulationResult.data에 학기별 필요 평점 포함
```

---

## 타입 정의 (TypeScript)

```typescript
// OCR 결과 타입
interface TranscriptData {
  university: string;
  student_name: string;
  student_id: string;
  major: string;
  double_major: string | null;
  minor: string | null;
  subjects: Subject[];
  total_credits: number;
  gpa: number;
}

interface Subject {
  name: string;
  credits: number;
  grade: string;
  type: string;
  semester: string;
}

// 시뮬레이션 입력 타입
interface SimulationInput {
  scale_max: number;
  G_t: number;
  C_tot: number;
  history: HistoryItem[];
  terms: TermItem[];
}

interface HistoryItem {
  term_id: string;
  credits: number;
  achieved_avg: number;
}

interface TermItem {
  id: string;
  type: 'regular' | 'summer';
  planned_credits: number;
  max_credits?: number;
}

// 시뮬레이션 결과 타입
interface SimulationResult {
  term_id: string;
  credits: number;
  required_avg: number;
}
```

---

## 주의사항

1. **파일 크기 제한**: PDF 파일은 최대 10MB까지 업로드 가능
2. **파일 형식**: PDF 파일만 업로드 가능
3. **타임아웃**: 시뮬레이션 API는 5초 타임아웃
4. **에러 처리**: 모든 API는 `success` 필드로 성공/실패 여부 확인
5. **CORS**: 프론트엔드에서 사용 시 CORS 설정 확인 필요

---

## 변경 이력

- 2025-01-05: 초기 API 명세서 작성
  - PDF 업로드 API
  - OCR 결과 변환 API
  - GPA 시뮬레이션 API
  - 헬스체크 API

