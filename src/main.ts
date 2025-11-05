import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { AppModule } from './app.module';

// .env 파일이 있으면 로드 (로컬 개발 환경), 배포 환경에서는 환경변수 사용
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const result = dotenv.config({ path: envPath, override: true });
  if (result.error) {
    console.log('⚠️ .env 파일 로드 오류:', result.error.message);
    console.log('📋 환경 변수에서 직접 읽기 시도');
  } else {
    console.log('✅ .env 파일 로드 완료 (로컬 환경)');
    // 로드된 PORT 값 확인 (디버깅용)
    console.log(`📋 로드된 PORT 값: ${process.env.PORT || '(없음, 기본값 5000 사용)'}`);
  }
} else {
  console.log('📋 .env 파일 없음 - 환경 변수에서 직접 읽기 (배포 환경)');
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend communication
  app.enableCors();

  // Enable global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // PORT 값 읽기 (문자열이면 숫자로 변환)
  const portEnv = process.env.PORT;
  const port = portEnv ? parseInt(portEnv, 10) : 5000;
  
  console.log(`📋 사용할 PORT 값: ${port} (환경 변수: ${portEnv || '없음'})`);
  
  await app.listen(port);
  
  // 배포 환경에서는 localhost 대신 실제 포트만 표시
  if (process.env.NODE_ENV === 'production') {
    console.log(`🚀 Application is running on port ${port}`);
  } else {
    console.log(`Application is running on: http://localhost:${port}`);
  }
}
bootstrap();
