# GPA Path - Backend Server

NestJS 기반 백엔드 서버로, PDF 성적표 분석 및 목표 GPA 달성을 위한 학기별 필요 평점을 계산하는 서비스입니다.

## 서비스 개요

**서비스명:** GPA Path
**목표:** 사용자가 PDF 성적표를 업로드하면 OCR과 분석 모델을 통해 목표 GPA 달성을 위해 각 남은 학기별로 받아야 하는 평균 학점을 계산·시각화하는 웹 서비스

## 아키텍처

```
User → Frontend (Next.js) → NestJS Backend → Python Model Server (FastAPI)
                                ↓
                           Supabase DB
```

- **Backend (이 저장소):** NestJS - API 게이트웨이, OCR·파싱 호출, 모델 통신
- **Model Server:** Python FastAPI - 데이터 분석 모델 구동
- **DB:** Supabase (Postgres) - 사용자/성적/계획 데이터 관리

## 프로젝트 구조

```
src/
├── app.module.ts           # 메인 애플리케이션 모듈
├── main.ts                 # 애플리케이션 진입점
├── gpa/                    # GPA 시뮬레이션 모듈
│   ├── dto/
│   │   ├── simulation-input.dto.ts   # 입력 DTO
│   │   └── simulation-result.dto.ts  # 결과 DTO
│   ├── gpa.module.ts       # GPA 모듈
│   ├── gpa.controller.ts   # API 컨트롤러
│   └── gpa.service.ts      # 비즈니스 로직
└── transcripts/            # PDF 성적표 OCR 모듈
    ├── dto/
    │   ├── subject.dto.ts           # 과목 DTO
    │   ├── transcript-data.dto.ts   # 성적표 데이터 DTO
    │   └── upload-response.dto.ts   # 업로드 응답 DTO
    ├── transcripts.module.ts        # Transcripts 모듈
    ├── transcripts.controller.ts    # 업로드 컨트롤러
    └── transcripts.service.ts       # OpenAI OCR 서비스
```

## 환경 설정

### 환경 변수 (.env)

```bash
# GPA Simulator Python Model Server URL
GPA_SIMULATOR_URL=http://localhost:8000

# Server Port
PORT=3000

# OpenAI API Key (PDF OCR용)
OPENAI_API_KEY=your_openai_api_key_here
```

**환경별 설정:**
- 로컬 개발: `GPA_SIMULATOR_URL=http://localhost:8000`
- Docker 환경: `GPA_SIMULATOR_URL=http://gpa-simulator:8000`
- **필수**: OpenAI API 키 설정 ([발급 방법](https://platform.openai.com/api-keys))

## 설치 및 실행

### 1. 패키지 설치

```bash
npm install
```

### 2. 환경 변수 설정

```bash
cp .env.example .env
# .env 파일을 열어 필요한 값 수정
```

### 3. 개발 모드 실행

```bash
# 개발 모드 (watch mode)
npm run start:dev

# 일반 모드
npm run start

# 프로덕션 모드
npm run start:prod
```

서버는 `http://localhost:3000`에서 실행됩니다.

## API 엔드포인트

### 1. PDF 성적표 업로드 및 분석

```bash
POST /api/transcripts/upload
Content-Type: multipart/form-data
```

**요청:**
- Field name: `file`
- File type: `application/pdf`
- Max size: 10MB

**응답 예시:**
```json
{
  "success": true,
  "data": {
    "university": "서울대학교",
    "student_name": "홍길동",
    "student_id": "2020-12345",
    "major": "컴퓨터공학과",
    "subjects": [...],
    "total_credits": 120,
    "gpa": 4.2
  },
  "performance": {
    "total_time": 4354
  }
}
```

자세한 내용은 [OCR_GUIDE.md](./OCR_GUIDE.md) 참고

### 2. Health Check

```bash
GET /api/gpa/health
```

**응답:**
```json
{
  "service": "GPA Simulator",
  "status": "healthy"
}
```

### 3. GPA 시뮬레이션

```bash
POST /api/gpa/simulate
Content-Type: application/json
```

**요청 예시:**
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

**응답 예시:**
```json
{
  "success": true,
  "data": [
    {
      "term_id": "S3",
      "credits": 18.0,
      "required_avg": 4.33
    },
    {
      "term_id": "S4",
      "credits": 18.0,
      "required_avg": 4.33
    }
  ],
  "message": "시뮬레이션이 완료되었습니다"
}
```

## Docker 사용

### Docker Compose로 실행

```bash
# 개발 모드로 실행
docker-compose up

# 백그라운드 실행
docker-compose up -d

# 로그 확인
docker-compose logs -f

# 중지
docker-compose down
```

### Dockerfile 빌드

```bash
# 개발용 빌드
docker build --target development -t gpa-backend:dev .

# 프로덕션 빌드
docker build --target production -t gpa-backend:prod .

# 실행
docker run -p 3000:3000 --env-file .env gpa-backend:dev
```

## 테스트

```bash
# 단위 테스트
npm run test

# e2e 테스트
npm run test:e2e

# 테스트 커버리지
npm run test:cov
```

## Python 모델 서버 연동

이 백엔드는 Python FastAPI 기반 분석 모델 서버와 통신합니다.

Python 모델 서버가 실행 중이어야 합니다:
```bash
# Python 모델 서버 실행 (별도 터미널)
cd ../analysis-model
python -m uvicorn main:app --reload --port 8000
```

모델 서버 엔드포인트:
- `GET /health` - 헬스체크
- `POST /simulate` - GPA 시뮬레이션

## 에러 처리

| HTTP 코드 | 의미 | 설명 |
|----------|------|------|
| 200 | OK | 시뮬레이션 성공 |
| 400 | Bad Request | 입력 데이터 검증 실패 |
| 422 | Unprocessable Entity | 목표 GPA 달성 불가능 |
| 500 | Internal Server Error | 서버 내부 오류 |
| 503 | Service Unavailable | Python 모델 서버 연결 실패 |

## 개발

### 코드 포맷팅

```bash
# 코드 포맷팅
npm run format

# 린트 검사
npm run lint
```

### 빌드

```bash
npm run build
```

빌드된 파일은 `dist/` 디렉토리에 생성됩니다.

## 문서

- [servicePRD.md](./servicePRD.md) - 전체 서비스 아키텍처 및 플로우
- [modelPRD.md](./modelPRD.md) - Python 분석 모델 서버 상세 스펙
- [api-requirement.md](./api-requirement.md) - NestJS ↔ Python 통신 가이드
- [OCR_GUIDE.md](./OCR_GUIDE.md) - PDF 성적표 OCR 상세 가이드
- [TESTING.md](./TESTING.md) - 테스트 가이드

## 기술 스택

- **Framework:** NestJS 11
- **Language:** TypeScript 5.7
- **HTTP Client:** @nestjs/axios
- **Validation:** class-validator, class-transformer
- **Configuration:** @nestjs/config
- **File Upload:** Multer
- **AI/ML:** OpenAI GPT-4o-mini
- **Container:** Docker

## 라이선스

UNLICENSED
# grade-calculator-backend
