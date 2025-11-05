/**
 * OCR 테스트 스크립트
 * 
 * 사용법:
 *   npm run test:ocr
 *   또는
 *   ts-node scripts/test-ocr.ts
 */

// .env 파일을 먼저 로드 (ConfigModule보다 먼저)
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from '../src/app.module';
import { OcrService } from '../src/transcripts/services/ocr.service';
import { TranscriptsService } from '../src/transcripts/transcripts.service';
import { TranscriptsRepository } from '../src/transcripts/repositories/transcripts.repository';

// 프로젝트 루트의 .env 파일 로드
const envPath = path.join(__dirname, '../.env');
console.log('📁 .env 파일 경로:', envPath);

// .env 파일 존재 확인
if (!fs.existsSync(envPath)) {
  console.error('❌ .env 파일을 찾을 수 없습니다:', envPath);
  console.error('   프로젝트 루트에 .env 파일을 생성해주세요.');
  process.exit(1);
}

// 기존 환경 변수 확인 (로드 전)
const beforeLoad = process.env.OPENAI_API_KEY;
console.log('📋 dotenv 로드 전 OPENAI_API_KEY:', beforeLoad || '(없음)');

// .env 파일 로드
const result = dotenv.config({ path: envPath, override: true });
if (result.error) {
  console.error('❌ .env 파일 로드 실패:', result.error);
  process.exit(1);
}

// 로드된 환경 변수 확인
const afterLoad = process.env.OPENAI_API_KEY;
console.log('📋 dotenv 로드 후 OPENAI_API_KEY:', afterLoad ? afterLoad.substring(0, 15) + '...' : '(없음)');

// .env 파일 내용 직접 읽기 (디버깅용)
try {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const apiKeyLine = envContent
    .split('\n')
    .find((line) => line.trim().startsWith('OPENAI_API_KEY='));
  if (apiKeyLine) {
    const keyValue = apiKeyLine.split('=')[1]?.trim();
    console.log('📄 .env 파일에서 직접 읽은 값:', keyValue ? keyValue.substring(0, 15) + '...' : '(없음)');
  }
} catch (err) {
  console.warn('⚠️  .env 파일 직접 읽기 실패:', err);
}

// 환경 변수 확인
if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.includes('your_ope')) {
  console.error('\n❌ OPENAI_API_KEY가 올바르게 설정되지 않았습니다.');
  console.error('   .env 파일에 다음 형식으로 설정해주세요:');
  console.error('   OPENAI_API_KEY=sk-실제키값');
  console.error('   (공백이나 따옴표 없이)');
  console.error('\n   현재 로드된 값:', process.env.OPENAI_API_KEY || '(없음)');
  process.exit(1);
}

console.log('✅ 환경 변수 로드 완료');
console.log('   OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 10) + '...' : '(없음)');
console.log('   SUPABASE_URL:', process.env.SUPABASE_URL ? process.env.SUPABASE_URL.substring(0, 30) + '...' : '(없음)');
console.log('   SUPABASE_KEY:', process.env.SUPABASE_KEY ? process.env.SUPABASE_KEY.substring(0, 15) + '...' : '(없음)');

// Supabase 환경 변수 확인
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.warn('\n⚠️  Supabase 환경 변수가 설정되지 않았습니다:');
  console.warn('   SUPABASE_URL:', process.env.SUPABASE_URL ? '설정됨' : '❌ 없음');
  console.warn('   SUPABASE_KEY:', process.env.SUPABASE_KEY ? '설정됨' : '❌ 없음');
  console.warn('   DB 저장 기능은 작동하지 않지만 OCR 테스트는 계속 진행됩니다.');
}

async function testOcr() {
  console.log('=== OCR 테스트 시작 ===\n');

  // PDF 파일 경로
  const pdfPath = path.join(__dirname, '../data/임동혁 성적증명서.pdf');

  // PDF 파일 존재 확인
  if (!fs.existsSync(pdfPath)) {
    console.error('❌ PDF 파일을 찾을 수 없습니다:', pdfPath);
    process.exit(1);
  }

  console.log('📄 PDF 파일:', pdfPath);
  const pdfBuffer = fs.readFileSync(pdfPath);
  console.log('📊 파일 크기:', (pdfBuffer.length / 1024).toFixed(2), 'KB\n');

  // NestJS 앱 초기화
  console.log('\n🔧 NestJS 앱 초기화 중...');
  const app = await NestFactory.createApplicationContext(AppModule);
  
  // ConfigService로 환경 변수 확인
  try {
    const configService = app.get(ConfigService);
    const configApiKey = configService.get<string>('OPENAI_API_KEY');
    console.log('📋 ConfigService에서 읽은 OPENAI_API_KEY:', configApiKey ? configApiKey.substring(0, 15) + '...' : '(없음)');
  } catch (err) {
    console.warn('⚠️  ConfigService 확인 실패:', err);
  }
  
  const ocrService = app.get(OcrService);
  const transcriptsService = app.get(TranscriptsService);
  const transcriptsRepository = app.get(TranscriptsRepository);
  
  // 테스트용 userId (실제 사용 시에는 인증된 사용자 ID 사용)
  const testUserId = 'test-user-' + Date.now();
  console.log('👤 테스트 사용자 ID:', testUserId);

  // Mock 파일 객체 생성
  const mockFile: Express.Multer.File = {
    fieldname: 'file',
    originalname: '임동혁 성적증명서.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    buffer: pdfBuffer,
    size: pdfBuffer.length,
    destination: '',
    filename: '',
    path: '',
    stream: null as any,
  };

  try {
    console.log('🚀 OCR 분석 시작...\n');
    
    // 방법 1: OCR만 테스트
    const ocrOnly = process.argv.includes('--ocr-only');
    
    let result;
    if (ocrOnly) {
      // OCR만 테스트
      result = await ocrService.analyzePdf(mockFile);
    } else {
      // OCR + DB 저장 테스트
      console.log('📦 OCR + DB 저장 테스트 모드\n');
      const uploadResult = await transcriptsService.analyzeTranscript(mockFile, testUserId);
      result = {
        success: uploadResult.success,
        data: uploadResult.data,
        performance: uploadResult.performance,
        error: uploadResult.error,
        raw_result: uploadResult.raw_result,
      };
    }

    console.log('\n=== OCR 결과 ===');
    console.log('성공:', result.success ? '✅' : '❌');

    if (result.success && result.data) {
      console.log('\n📋 학생 정보:');
      console.log('  대학교:', result.data.university);
      console.log('  학생명:', result.data.student_name);
      console.log('  학번:', result.data.student_id);
      console.log('  전공:', result.data.major);
      console.log('  복수전공:', result.data.double_major || '없음');
      console.log('  부전공:', result.data.minor || '없음');
      console.log('  총 학점:', result.data.total_credits);
      console.log('  GPA:', result.data.gpa);

      console.log('\n📚 과목 정보:');
      console.log('  총 과목 수:', result.data.subjects.length);
      console.log('\n  모든 과목:');
      result.data.subjects.forEach((subject, idx) => {
        console.log(
          `  ${idx + 1}. ${subject.name} - ${subject.grade} (${subject.credits}학점, ${subject.type}, ${subject.semester})`,
        );
      });

      if (result.performance) {
        console.log('\n⏱️  성능 측정:');
        console.log(
          '  전체 처리 시간:',
          result.performance.total_time,
          'ms',
        );
        console.log(
          '  Buffer 변환:',
          result.performance.buffer_time,
          'ms',
        );
        console.log(
          '  File 객체 생성:',
          result.performance.file_create_time,
          'ms',
        );
        console.log(
          '  OpenAI 업로드:',
          result.performance.upload_time,
          'ms',
        );
        console.log(
          '  GPT 분석:',
          result.performance.gpt_analysis_time,
          'ms',
        );
        console.log(
          '  JSON 파싱:',
          result.performance.json_parse_time,
          'ms',
        );
      }

      // JSON 파일로 저장
      const outputPath = path.join(__dirname, '../data/ocr-result.json');
      fs.writeFileSync(
        outputPath,
        JSON.stringify(result.data, null, 2),
        'utf-8',
      );
      console.log('\n💾 결과가 저장되었습니다:', outputPath);
      
      // DB 저장 테스트 (--ocr-only가 아닌 경우)
      if (!ocrOnly && result.data.db_save_result) {
        console.log('\n=== 데이터베이스 저장 결과 ===');
        console.log('  성공:', result.data.db_save_result.success ? '✅' : '❌');
        console.log('  Transcript ID:', result.data.db_save_result.transcriptId || '(없음)');
        console.log('  저장된 과목 수:', result.data.db_save_result.saved);
        console.log('  실패한 과목 수:', result.data.db_save_result.errors);
        
        // 저장된 데이터 조회 테스트
        if (result.data.db_save_result.success && result.data.db_save_result.transcriptId) {
          console.log('\n🔍 저장된 데이터 조회 테스트...');
          const savedTranscript = await transcriptsRepository.getTranscript(testUserId);
          
          if (savedTranscript) {
            console.log('✅ 저장된 데이터 조회 성공!');
            console.log('  대학교:', savedTranscript.university);
            console.log('  학생명:', savedTranscript.student_name);
            console.log('  학번:', savedTranscript.student_id);
            console.log('  전공:', savedTranscript.major);
            console.log('  총 학점:', savedTranscript.total_credits);
            console.log('  GPA:', savedTranscript.gpa);
            console.log('  저장된 과목 수:', savedTranscript.subjects.length);
            
            // 저장된 과목 수와 OCR 결과 비교
            if (savedTranscript.subjects.length === result.data.subjects.length) {
              console.log('✅ 과목 수 일치:', savedTranscript.subjects.length);
            } else {
              console.warn('⚠️  과목 수 불일치:');
              console.warn('  OCR 결과:', result.data.subjects.length);
              console.warn('  DB 저장:', savedTranscript.subjects.length);
            }
          } else {
            console.error('❌ 저장된 데이터를 조회할 수 없습니다.');
          }
        }
      }
    } else {
      console.error('\n❌ OCR 실패:');
      console.error('  에러:', result.error);
      if (result.raw_result) {
        console.error('  원본 결과:', result.raw_result);
      }
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ 테스트 중 에러 발생:');
    console.error(error);
    process.exit(1);
  } finally {
    await app.close();
  }

  console.log('\n✅ 테스트 완료!');
}

// 스크립트 실행
testOcr().catch((error) => {
  console.error('테스트 실행 실패:', error);
  process.exit(1);
});

