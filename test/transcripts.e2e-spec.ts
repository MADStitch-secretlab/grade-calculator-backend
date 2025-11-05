import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import * as fs from 'fs';
import * as path from 'path';

describe('Transcripts OCR E2E Test', () => {
  let app: INestApplication;
  const testPdfPath = path.join(
    __dirname,
    '../data/임동혁 성적증명서.pdf',
  );

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('PDF 파일이 존재하는지 확인', () => {
    expect(fs.existsSync(testPdfPath)).toBe(true);
  });

  it('POST /api/transcripts/upload - PDF OCR 테스트', async () => {
    const pdfBuffer = fs.readFileSync(testPdfPath);

    const response = await request(app.getHttpServer())
      .post('/api/transcripts/upload')
      .attach('file', pdfBuffer, '임동혁 성적증명서.pdf')
      .expect(200);

    expect(response.body).toHaveProperty('success');
    expect(response.body.success).toBe(true);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('university');
    expect(response.body.data).toHaveProperty('student_name');
    expect(response.body.data).toHaveProperty('student_id');
    expect(response.body.data).toHaveProperty('major');
    expect(response.body.data).toHaveProperty('subjects');
    expect(Array.isArray(response.body.data.subjects)).toBe(true);
    expect(response.body.data).toHaveProperty('total_credits');
    expect(response.body.data).toHaveProperty('gpa');
    expect(response.body).toHaveProperty('performance');

    // 결과 출력
    console.log('\n=== OCR 테스트 결과 ===');
    console.log('성공:', response.body.success);
    console.log('대학교:', response.body.data.university);
    console.log('학생명:', response.body.data.student_name);
    console.log('학번:', response.body.data.student_id);
    console.log('전공:', response.body.data.major);
    console.log('복수전공:', response.body.data.double_major);
    console.log('부전공:', response.body.data.minor);
    console.log('총 학점:', response.body.data.total_credits);
    console.log('GPA:', response.body.data.gpa);
    console.log('과목 수:', response.body.data.subjects.length);
    console.log('\n=== 성능 측정 ===');
    console.log(
      '전체 처리 시간:',
      response.body.performance.total_time,
      'ms',
    );
    console.log(
      'GPT 분석 시간:',
      response.body.performance.gpt_analysis_time,
      'ms',
    );
    console.log('\n=== 첫 5개 과목 ===');
    response.body.data.subjects.slice(0, 5).forEach((subject: any, idx: number) => {
      console.log(
        `${idx + 1}. ${subject.name} - ${subject.grade} (${subject.credits}학점, ${subject.semester})`,
      );
    });
  }, 60000); // 60초 타임아웃

  it('POST /api/transcripts/upload - 잘못된 파일 형식 거부', async () => {
    const textBuffer = Buffer.from('This is not a PDF file');

    await request(app.getHttpServer())
      .post('/api/transcripts/upload')
      .attach('file', textBuffer, 'test.txt')
      .expect(400);
  });

  it('POST /api/transcripts/upload - 파일 없음 에러', async () => {
    await request(app.getHttpServer())
      .post('/api/transcripts/upload')
      .expect(400);
  });
});



