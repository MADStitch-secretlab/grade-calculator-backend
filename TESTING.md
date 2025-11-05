# 테스트 가이드

## 테스트 개요

이 프로젝트는 3가지 유형의 테스트를 제공합니다:
1. **단위 테스트 (Unit Tests)** - 컨트롤러와 서비스의 개별 기능 테스트
2. **E2E 테스트 (End-to-End Tests)** - 전체 API 통합 테스트
3. **수동 API 테스트** - cURL 또는 HTTP 클라이언트를 사용한 실제 API 테스트

## 테스트 결과

```
Test Suites: 3 passed, 3 total
Tests:       20 passed, 20 total
```

---

## 1. 단위 테스트 실행

### 모든 테스트 실행
```bash
npm test
```

### 특정 파일만 테스트
```bash
# 컨트롤러 테스트
npm test -- gpa.controller.spec.ts

# 서비스 테스트
npm test -- gpa.service.spec.ts
```

### 테스트 커버리지 확인
```bash
npm run test:cov
```

### Watch 모드 (개발 중)
```bash
npm run test:watch
```

### 테스트 파일 구조
```
src/
├── app.controller.spec.ts        # App 컨트롤러 테스트
├── gpa/
│   ├── gpa.controller.spec.ts    # GPA 컨트롤러 테스트 (9개 테스트)
│   └── gpa.service.spec.ts       # GPA 서비스 테스트 (10개 테스트)
```

---

## 2. E2E 테스트 실행

### E2E 테스트 실행
```bash
npm run test:e2e
```

### E2E 테스트 특징
- 실제 애플리케이션 인스턴스를 생성하여 테스트
- HTTP 요청/응답 전체 플로우 검증
- 입력 검증 (Validation) 테스트
- data/sample.json을 사용한 실제 데이터 테스트 포함

### E2E 테스트 파일
```
test/
├── gpa.e2e-spec.ts               # GPA API E2E 테스트
└── app.e2e-spec.ts               # App E2E 테스트
```

---

## 3. 수동 API 테스트

### 사전 준비

#### 1) NestJS 백엔드 서버 실행
```bash
npm run start:dev
```
서버가 `http://localhost:3000`에서 실행됩니다.

#### 2) Python 모델 서버 실행 (선택 사항)
Python 모델 서버가 실행 중이지 않으면 503 에러가 발생합니다.
```bash
# 별도 터미널에서
cd ../analysis-model
python -m uvicorn main:app --reload --port 8000
```

### 헬스체크 테스트

```bash
# NestJS 백엔드 헬스체크
curl http://localhost:3000/api/gpa/health

# 예상 응답 (Python 서버가 실행 중일 때)
{
  "service": "GPA Simulator",
  "status": "healthy"
}

# 예상 응답 (Python 서버가 중지된 경우)
{
  "service": "GPA Simulator",
  "status": "unhealthy"
}
```

### sample.json을 사용한 시뮬레이션 테스트

#### cURL 사용
```bash
curl -X POST http://localhost:3000/api/gpa/simulate \
  -H "Content-Type: application/json" \
  -d @data/sample.json
```

#### httpie 사용 (설치: `brew install httpie`)
```bash
http POST localhost:3000/api/gpa/simulate < data/sample.json
```

#### 예상 성공 응답 (Python 서버 실행 중)
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
    // ... 추가 학기
  ],
  "message": "시뮬레이션이 완료되었습니다"
}
```

#### 예상 실패 응답 (Python 서버 중지)
```json
{
  "success": false,
  "error": "SERVER_ERROR",
  "message": "시뮬레이션 중 오류가 발생했습니다."
}
```

### 다양한 시나리오 테스트

프로젝트에는 3가지 테스트 시나리오가 준비되어 있습니다:

#### 1) 기본 시나리오 (data/sample.json)
2학기 완료, 6학기 남음
```bash
curl -X POST http://localhost:3000/api/gpa/simulate \
  -H "Content-Type: application/json" \
  -d @data/sample.json
```

#### 2) 신입생 시나리오 (test-requests/freshman-request.json)
이수 이력 없음, 8학기 남음
```bash
curl -X POST http://localhost:3000/api/gpa/simulate \
  -H "Content-Type: application/json" \
  -d @test-requests/freshman-request.json
```

#### 3) 계절학기 포함 (test-requests/with-summer-request.json)
1학기 완료, 계절학기 포함 8학기 남음
```bash
curl -X POST http://localhost:3000/api/gpa/simulate \
  -H "Content-Type: application/json" \
  -d @test-requests/with-summer-request.json
```

### 입력 검증 테스트

#### 잘못된 scale_max (음수)
```bash
curl -X POST http://localhost:3000/api/gpa/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "scale_max": -1,
    "G_t": 4.2,
    "C_tot": 130,
    "history": [],
    "terms": []
  }'
```
**예상 응답: 400 Bad Request**

#### 목표 GPA가 최대 평점 초과
```bash
curl -X POST http://localhost:3000/api/gpa/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "scale_max": 4.5,
    "G_t": 6.0,
    "C_tot": 130,
    "history": [],
    "terms": []
  }'
```
**예상 응답: 400 Bad Request**

#### 잘못된 term type
```bash
curl -X POST http://localhost:3000/api/gpa/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "scale_max": 4.5,
    "G_t": 4.2,
    "C_tot": 130,
    "history": [],
    "terms": [
      {
        "id": "S1",
        "type": "invalid_type",
        "planned_credits": 18,
        "max_credits": 21
      }
    ]
  }'
```
**예상 응답: 400 Bad Request**

---

## 4. Postman을 사용한 테스트

### Postman Collection 만들기

1. **새 Request 생성**
   - Method: `POST`
   - URL: `http://localhost:3000/api/gpa/simulate`

2. **Headers 설정**
   ```
   Content-Type: application/json
   ```

3. **Body 설정**
   - Body → raw → JSON 선택
   - data/sample.json의 내용 복사 붙여넣기

4. **Send 클릭**

### Postman Environment 변수

```json
{
  "base_url": "http://localhost:3000",
  "python_server": "http://localhost:8000"
}
```

---

## 5. 디버깅 모드 테스트

### 디버그 모드로 테스트 실행
```bash
npm run test:debug
```

### VSCode에서 디버깅
1. `.vscode/launch.json` 설정:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Jest Debug",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--runInBand"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

2. 브레이크포인트 설정 후 F5 실행

---

## 6. 테스트 데이터 설명

### data/sample.json
```json
{
  "scale_max": 4.5,          // 최대 평점
  "G_t": 4.2,                // 목표 GPA
  "C_tot": 130,              // 졸업 요구 총 학점
  "history": [               // 이수 완료 학기
    {
      "term_id": "S1",
      "credits": 18,
      "achieved_avg": 3.8
    }
  ],
  "terms": [                 // 남은 학기
    {
      "id": "S3",
      "type": "regular",     // regular 또는 summer
      "planned_credits": 18,
      "max_credits": 21
    }
  ]
}
```

---

## 7. 에러 처리 테스트

### 테스트 가능한 에러 케이스

| HTTP 코드 | 에러 타입 | 발생 상황 |
|----------|----------|----------|
| 400 | Bad Request | 입력 검증 실패 (잘못된 타입, 범위 등) |
| 422 | Unprocessable Entity | 목표 GPA 달성 불가능 |
| 500 | Internal Server Error | Python 서버 내부 오류 |
| 503 | Service Unavailable | Python 서버 연결 실패 |

---

## 8. 테스트 체크리스트

### 단위 테스트
- [✓] GpaController 정의 확인
- [✓] healthCheck 성공/실패 케이스
- [✓] simulate 성공 케이스
- [✓] 400 에러 처리
- [✓] 422 에러 처리
- [✓] 500 에러 처리
- [✓] 신입생 시나리오
- [✓] 계절학기 시나리오
- [✓] GpaService 정의 확인
- [✓] 모든 HTTP 에러 처리

### E2E 테스트
- [✓] 헬스체크 API
- [✓] 유효한 입력 시뮬레이션
- [✓] 입력 검증 (scale_max)
- [✓] 입력 검증 (G_t)
- [✓] 필수 필드 누락
- [✓] 잘못된 term type
- [✓] 신입생 시나리오
- [✓] 계절학기 시나리오
- [✓] sample.json 데이터 테스트

### 수동 API 테스트
- [ ] 헬스체크 (Python 서버 실행 중)
- [ ] 헬스체크 (Python 서버 중지)
- [ ] data/sample.json 시뮬레이션
- [ ] 신입생 시나리오
- [ ] 계절학기 시나리오
- [ ] 잘못된 입력 테스트

---

## 9. 트러블슈팅

### 테스트 실패 시

#### "Cannot find module" 에러
```bash
npm install
npm run build
```

#### E2E 테스트 타임아웃
```bash
# jest-e2e.json에서 타임아웃 증가
{
  "testTimeout": 10000
}
```

#### Python 서버 연결 실패
```bash
# Python 서버 상태 확인
curl http://localhost:8000/health

# 서버가 중지되어 있다면
cd ../analysis-model
python -m uvicorn main:app --reload --port 8000
```

#### 포트 충돌
```bash
# 3000번 포트를 사용 중인 프로세스 확인
lsof -ti:3000

# 프로세스 종료
kill -9 $(lsof -ti:3000)
```

---

## 10. CI/CD 통합

### GitHub Actions 예시
```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
      - run: npm test
      - run: npm run test:e2e
```

---

## 참고 문서

- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest](https://github.com/visionmedia/supertest)
