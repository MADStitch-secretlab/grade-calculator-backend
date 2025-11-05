/**
 * 데이터베이스 저장 실패 원인 분석 테스트
 * ocr-result.json을 사용하여 각 과목의 저장 실패 이유를 확인
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { TranscriptsRepository } from '../src/transcripts/repositories/transcripts.repository';
import { TranscriptDataDto } from '../src/transcripts/dto/transcript-data.dto';
import { SubjectDto } from '../src/transcripts/dto/subject.dto';

// 프로젝트 루트의 .env 파일 로드
const envPath = path.join(__dirname, '../.env');
console.log('📁 .env 파일 경로:', envPath);

if (!fs.existsSync(envPath)) {
  console.error('❌ .env 파일을 찾을 수 없습니다:', envPath);
  process.exit(1);
}

const result = dotenv.config({ path: envPath, override: true });
if (result.error) {
  console.error('❌ .env 파일 로드 실패:', result.error);
  process.exit(1);
}

// ocr-result.json 파일 읽기
const ocrResultPath = path.join(__dirname, '../data/ocr-result.json');
console.log('📄 OCR 결과 파일 경로:', ocrResultPath);

if (!fs.existsSync(ocrResultPath)) {
  console.error('❌ ocr-result.json 파일을 찾을 수 없습니다:', ocrResultPath);
  process.exit(1);
}

const ocrResultContent = fs.readFileSync(ocrResultPath, 'utf-8');
const ocrResult: TranscriptDataDto = JSON.parse(ocrResultContent);

console.log('\n=== 저장 테스트 시작 ===');
console.log(`과목 수: ${ocrResult.subjects?.length || 0}`);
console.log(`학생명: ${ocrResult.student_name || '(없음)'}`);
console.log(`학번: ${ocrResult.student_id || '(없음)'}\n`);

async function testDbSave() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const repository = app.get(TranscriptsRepository);

  // 1. Supabase 연결 테스트
  console.log('🔌 Supabase 연결 테스트...');
  const connectionTest = await repository.testConnection();
  if (!connectionTest) {
    console.error('❌ Supabase 연결 실패');
    await app.close();
    process.exit(1);
  }
  console.log('✅ Supabase 연결 성공\n');

  // 2. 테스트용 userId 설정 (UUID 형식)
  const { randomUUID } = require('crypto');
  const testUserId = randomUUID();
  console.log(`👤 테스트 사용자 ID: ${testUserId}\n`);

  // 3. 각 과목 데이터 유효성 검사
  console.log('=== 과목 데이터 유효성 검사 ===');
  if (!ocrResult.subjects || ocrResult.subjects.length === 0) {
    console.error('❌ 과목 데이터가 없습니다');
    await app.close();
    process.exit(1);
  }

  const invalidSubjects: Array<{ index: number; subject: SubjectDto; issues: string[] }> = [];

  ocrResult.subjects.forEach((subject, index) => {
    const issues: string[] = [];

    // 필수 필드 검사
    if (!subject.name || subject.name.trim() === '') {
      issues.push('course_name이 비어있음 (NOT NULL 제약)');
    }

    if (subject.name && subject.name.length > 255) {
      issues.push(`course_name이 너무 김 (${subject.name.length}자, 최대 255자)`);
    }

    // grade 검사
    if (subject.grade === null || subject.grade === undefined) {
      // null은 허용되지만 확인은 함
      issues.push('grade가 null/undefined (허용되지만 확인)');
    }

    // credits 검사
    if (subject.credits === null || subject.credits === undefined) {
      // null은 허용되지만 확인은 함
      issues.push('credits가 null/undefined (허용되지만 확인)');
    }

    // semester 검사
    if (!subject.semester || subject.semester.trim() === '') {
      issues.push('semester가 비어있음');
    }

    // type 검사
    if (!subject.type || subject.type.trim() === '') {
      issues.push('type(course_type)이 비어있음');
    }

    if (issues.length > 0) {
      invalidSubjects.push({ index, subject, issues });
    }
  });

  if (invalidSubjects.length > 0) {
    console.log(`⚠️  유효성 검사 실패한 과목: ${invalidSubjects.length}개\n`);
    invalidSubjects.forEach(({ index, subject, issues }) => {
      console.log(`  [${index + 1}] ${subject.name || '(이름 없음)'}`);
      issues.forEach((issue) => console.log(`      - ${issue}`));
    });
    console.log('');
  } else {
    console.log('✅ 모든 과목 데이터 유효성 검사 통과\n');
  }

  // 4. 실제 저장 시도 (각 과목을 개별적으로 테스트)
  console.log('=== 단일 과목 저장 테스트 (각 과목별) ===');
  const client = repository.getClient();
  
  // 변환 함수들 (repository의 private 메서드와 동일)
  const convertGradeToGradePoint = (grade: string): number | null => {
    const gradeMap: Record<string, number> = {
      'A+': 4.5, 'A0': 4.0, 'A-': 3.7,
      'B+': 3.5, 'B0': 3.0, 'B-': 2.7,
      'C+': 2.5, 'C0': 2.0, 'C-': 1.7,
      'D+': 1.5, 'D0': 1.0, 'D-': 0.7,
      'F': 0.0,
    };
    return gradeMap[grade] ?? null;
  };

  const extractYearFromSemester = (semester: string | null | undefined): number | null => {
    if (!semester) return null;
    const match = semester.match(/(\d{4})/);
    return match ? parseInt(match[1], 10) : null;
  };

  const ensureString = (value: string | null | undefined): string => {
    return value ?? '';
  };

  const failedSubjects: Array<{
    index: number;
    subject: SubjectDto;
    courseGrade: any;
    error: any;
  }> = [];

  // 처음 5개 과목만 개별 테스트
  const testSubjects = ocrResult.subjects.slice(0, 5);
  console.log(`처음 ${testSubjects.length}개 과목을 개별 저장 테스트...\n`);

  for (let i = 0; i < testSubjects.length; i++) {
    const subject = testSubjects[i];
    console.log(`[${i + 1}/${testSubjects.length}] ${subject.name} 테스트 중...`);

    const courseGrade = {
      transcript_id: null,
      user_id: testUserId,
      course_name: ensureString(subject.name),
      course_code: null,
      credits: subject.credits || null,
      grade: ensureString(subject.grade),
      grade_point: convertGradeToGradePoint(subject.grade),
      semester: ensureString(subject.semester),
      year: extractYearFromSemester(subject.semester),
      course_type: ensureString(subject.type),
      professor: null,
    };

    try {
      const result = await client
        .from('course_grades')
        .insert(courseGrade)
        .select();

      const data = result.data as any;
      const error = result.error;

      if (error) {
        console.error(`  ❌ 실패: ${error.message}`);
        console.error(`     코드: ${error.code}`);
        failedSubjects.push({
          index: i,
          subject,
          courseGrade,
          error,
        });

        // 저장된 데이터 삭제 시도
        if (data && Array.isArray(data) && data.length > 0 && data[0]?.id) {
          await client.from('course_grades').delete().eq('id', data[0].id);
        }
      } else {
        console.log(`  ✅ 성공`);
        
        // 저장된 데이터 삭제 (테스트용)
        if (data && Array.isArray(data) && data.length > 0 && data[0]?.id) {
          await client.from('course_grades').delete().eq('id', data[0].id);
        }
      }
    } catch (err: any) {
      console.error(`  ❌ 예외 발생: ${err.message}`);
      failedSubjects.push({
        index: i,
        subject,
        courseGrade,
        error: { message: err.message, stack: err.stack },
      });
    }
  }

  if (failedSubjects.length > 0) {
    console.log(`\n⚠️  ${failedSubjects.length}개 과목 저장 실패 상세:\n`);
    failedSubjects.forEach(({ index, subject, courseGrade, error }) => {
      console.log(`[${index + 1}] ${subject.name}`);
      console.log(`  원본 데이터:`, JSON.stringify(subject, null, 2));
      console.log(`  변환 데이터:`, JSON.stringify(courseGrade, null, 2));
      console.log(`  에러 코드: ${error.code || 'N/A'}`);
      console.log(`  에러 메시지: ${error.message}`);
      if (error.hint) console.log(`  힌트: ${error.hint}`);
      if (error.details) console.log(`  상세: ${error.details}`);
      console.log('');
    });
  } else {
    console.log('\n✅ 모든 테스트 과목 저장 성공!\n');
  }

  // 5. 전체 저장 시도 (배치 단위로)
  console.log('\n\n=== 전체 과목 저장 테스트 ===');
  try {
    const saveResult = await repository.saveTranscript(testUserId, ocrResult);
    
    console.log('\n=== 저장 결과 ===');
    console.log('  성공:', saveResult.success);
    console.log('  저장된 과목:', saveResult.savedCourses);
    console.log('  실패한 과목:', saveResult.errors);
    console.log('  Transcript ID:', saveResult.transcriptId || '(없음)');

    if (!saveResult.success || saveResult.errors > 0) {
      console.log('\n❌ 일부 또는 전체 저장 실패');
      if (saveResult.error) {
        console.error('  에러:', saveResult.error.message);
      }
    } else {
      console.log('\n✅ 모든 과목 저장 성공!');
    }

    // 6. 저장된 데이터 확인
    if (saveResult.savedCourses > 0) {
      console.log('\n=== 저장된 데이터 확인 ===');
      const client = repository.getClient();
      const { data: savedCourses, error: selectError } = await client
        .from('course_grades')
        .select('*')
        .eq('user_id', testUserId)
        .limit(5);

      if (selectError) {
        console.error('  조회 에러:', selectError.message);
      } else {
        console.log(`  조회된 과목 수 (최대 5개): ${savedCourses?.length || 0}`);
        savedCourses?.forEach((course, idx) => {
          console.log(`  [${idx + 1}] ${course.course_name} (${course.grade})`);
        });
      }
    }

    // 7. 테스트 데이터 정리
    console.log('\n=== 테스트 데이터 정리 ===');
    const client = repository.getClient();
    
    // course_grades 삭제
    const { error: deleteCoursesError } = await client
      .from('course_grades')
      .delete()
      .eq('user_id', testUserId);

    if (deleteCoursesError) {
      console.warn('  course_grades 삭제 실패:', deleteCoursesError.message);
    } else {
      console.log('  ✅ course_grades 삭제 완료');
    }

    // transcripts 삭제
    if (saveResult.transcriptId) {
      const { error: deleteTranscriptError } = await client
        .from('transcripts')
        .delete()
        .eq('id', saveResult.transcriptId);

      if (deleteTranscriptError) {
        console.warn('  transcripts 삭제 실패:', deleteTranscriptError.message);
      } else {
        console.log('  ✅ transcripts 삭제 완료');
      }
    }

  } catch (err: any) {
    console.error('\n❌ 저장 테스트 중 예외 발생:');
    console.error('  에러:', err.message);
    console.error('  스택:', err.stack);
  }

  await app.close();
  console.log('\n=== 테스트 완료 ===');
}

testDbSave().catch((err) => {
  console.error('테스트 실행 중 오류:', err);
  process.exit(1);
});

