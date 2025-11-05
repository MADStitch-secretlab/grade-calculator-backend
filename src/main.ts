import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import { AppModule } from './app.module';

// .env 파일이 있으면 로드 (로컬 개발 환경), 배포 환경에서는 환경변수 사용
try {
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    // dotenv를 동적으로 로드 (optional dependency)
    const dotenv = require('dotenv');
    dotenv.config({ path: envPath, override: true });
    console.log('✅ .env 파일 로드 완료 (로컬 환경)');
  } else {
    console.log('📋 .env 파일 없음 - 환경 변수에서 직접 읽기 (배포 환경)');
  }
} catch (error) {
  // dotenv가 설치되지 않았거나 로드 실패해도 계속 진행 (배포 환경)
  console.log('📋 .env 파일 로드 스킵 - 환경 변수 사용');
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

  const port = process.env.PORT ?? 5000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();
