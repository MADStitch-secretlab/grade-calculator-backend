# 배포 체크리스트

## 주요 수정 사항

### 1. ✅ dotenv 패키지 추가
- `package.json`의 dependencies에 `dotenv` 추가
- 배포 환경에서도 정상 작동하도록 수정

### 2. ✅ .env 파일 로드 로직 개선
- `main.ts`에서 `.env` 파일이 없어도 작동하도록 수정
- 배포 환경에서는 환경 변수에서 직접 읽기

### 3. ✅ Health Check 엔드포인트 추가
- `GET /health` - 상세 헬스체크
- `GET /healthz` - 간단한 헬스체크 (배포 플랫폼용)

## 배포 설정

### 필수 환경 변수

배포 플랫폼에서 다음 환경 변수를 설정해야 합니다:

```
NODE_ENV=production
PORT=3001 (또는 원하는 포트)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key
OPENAI_API_KEY=sk-your-openai-api-key
GPA_SIMULATOR_URL=http://localhost:8000 (또는 Python 서버 URL)
```

### 빌드 명령어

```
npm ci
```

### 빌드 명령어

```
npm run build
```

### 시작 명령어

```
npm run start:prod
```

**참고**: 빌드된 파일은 `dist/src/main.js`에 생성됩니다. 시작 명령어는 자동으로 올바른 경로를 사용합니다.

### 포트 설정

- 기본값: `5000` (코드에서)
- 환경 변수 `PORT`로 설정 가능
- 배포 플랫폼에서 포트를 `3001`로 설정했다면, 환경 변수 `PORT=3001` 설정

### Health Check 경로

배포 플랫폼에서 Health Check 경로를 설정할 경우:
- 권장: `/health` 또는 `/healthz`
- 또는: `/` (루트 경로도 작동)

## 문제 해결

### 빌드 실패 시

1. **TypeScript 컴파일 에러**
   - `npm run build` 로컬에서 실행하여 에러 확인
   - TypeORM 관련 에러는 이미 해결됨 (entity 파일 삭제)

2. **의존성 설치 실패**
   - `npm ci` 대신 `npm install` 사용 시도
   - `package-lock.json` 확인

3. **환경 변수 누락**
   - 모든 필수 환경 변수가 설정되어 있는지 확인
   - 특히 `SUPABASE_URL`, `SUPABASE_KEY`, `OPENAI_API_KEY`

### 런타임 에러 시

1. **포트 바인딩 실패**
   - 환경 변수 `PORT`가 올바르게 설정되었는지 확인
   - 배포 플랫폼의 포트 설정 확인

2. **환경 변수 읽기 실패**
   - 배포 플랫폼의 환경 변수 설정 확인
   - 로그에서 "📋 .env 파일 없음 - 환경 변수에서 직접 읽기" 메시지 확인

3. **Supabase 연결 실패**
   - `SUPABASE_URL`과 `SUPABASE_KEY`가 올바른지 확인
   - Supabase 프로젝트의 Service Role Key 사용 확인

## 배포 후 확인

1. **Health Check**
   ```bash
   curl https://your-domain.com/health
   ```

2. **API 테스트**
   ```bash
   curl https://your-domain.com/api/gpa/health
   ```

3. **로그 확인**
   - 배포 플랫폼의 로그에서 에러 메시지 확인
   - 특히 환경 변수 로드 관련 로그 확인

