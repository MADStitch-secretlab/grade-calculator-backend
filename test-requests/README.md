# 테스트 요청 예시

이 디렉토리에는 API 테스트를 위한 샘플 요청 JSON 파일들이 포함되어 있습니다.

## 사용 방법

### cURL 사용

```bash
# 기본 시나리오 테스트
curl -X POST http://localhost:3000/api/gpa/simulate \
  -H "Content-Type: application/json" \
  -d @test-requests/sample-request.json

# 신입생 시나리오 테스트
curl -X POST http://localhost:3000/api/gpa/simulate \
  -H "Content-Type: application/json" \
  -d @test-requests/freshman-request.json

# 계절학기 포함 시나리오 테스트
curl -X POST http://localhost:3000/api/gpa/simulate \
  -H "Content-Type: application/json" \
  -d @test-requests/with-summer-request.json
```

### httpie 사용

```bash
# 기본 시나리오
http POST localhost:3000/api/gpa/simulate < test-requests/sample-request.json

# 신입생 시나리오
http POST localhost:3000/api/gpa/simulate < test-requests/freshman-request.json

# 계절학기 포함
http POST localhost:3000/api/gpa/simulate < test-requests/with-summer-request.json
```

### Postman 사용

1. Postman을 실행합니다
2. POST 요청을 생성합니다
3. URL: `http://localhost:3000/api/gpa/simulate`
4. Headers에 `Content-Type: application/json` 추가
5. Body → raw → JSON 선택
6. 원하는 JSON 파일의 내용을 복사하여 붙여넣기

## 파일 설명

### sample-request.json
기본 시나리오: 2학기 이수 완료, 6학기 남음

### freshman-request.json
신입생 시나리오: 이수 이력 없음, 8학기 남음

### with-summer-request.json
계절학기 포함 시나리오: 1학기 이수 완료, 계절학기 포함하여 8학기 남음

## 헬스체크

```bash
curl http://localhost:3000/api/gpa/health
```

예상 응답:
```json
{
  "service": "GPA Simulator",
  "status": "healthy"
}
```
