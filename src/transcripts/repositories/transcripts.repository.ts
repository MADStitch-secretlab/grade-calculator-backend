import { Injectable, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { TranscriptDataDto } from '../dto/transcript-data.dto';
import { SubjectDto, CourseGradeDto } from '../dto/subject.dto';

export interface SaveTranscriptResult {
  success: boolean;
  transcriptId?: string;
  savedCourses: number;
  errors: number;
  error?: Error;
}

@Injectable()
export class TranscriptsRepository {
  private readonly logger = new Logger(TranscriptsRepository.name);
  private client: SupabaseClient;

  constructor() {
    // 로컬 환경에서는 .env 파일에서 로드, 배포 환경에서는 이미 환경 변수에 설정됨
    const isLocal = process.env.NODE_ENV !== 'production' || !process.env.SUPABASE_URL;
    
    // 로드 전 환경 변수 확인
    const beforeLoadUrl = process.env.SUPABASE_URL;
    const beforeLoadKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;
    this.logger.log('📋 dotenv 로드 전 상태:');
    this.logger.log(`  SUPABASE_URL: ${beforeLoadUrl ? beforeLoadUrl.substring(0, 30) + '...' : '(없음)'}`);
    this.logger.log(`  SUPABASE_KEY: ${beforeLoadKey ? beforeLoadKey.substring(0, 15) + '...' : '(없음)'}`);
    
    if (isLocal) {
      // 로컬 환경: .env 파일 로드 (이전 OPENAI_API_KEY 해결 방식과 동일)
      const envPath = path.join(process.cwd(), '.env');
      this.logger.log(`📁 .env 파일 경로: ${envPath}`);
      
      // .env 파일 존재 확인
      const fs = require('fs');
      if (!fs.existsSync(envPath)) {
        this.logger.warn('⚠️ .env 파일을 찾을 수 없습니다:', envPath);
      } else {
        this.logger.log('✅ .env 파일 존재 확인');
      }
      
      // .env 파일 내용 직접 읽기 (디버깅용)
      try {
        const envContent = fs.readFileSync(envPath, 'utf-8');
        const urlLine = envContent.split('\n').find((line: string) => line.trim().startsWith('SUPABASE_URL='));
        const keyLine = envContent.split('\n').find((line: string) => 
          line.trim().startsWith('SUPABASE_KEY=') || line.trim().startsWith('SUPABASE_ANON_KEY=')
        );
        
        if (urlLine) {
          const urlValue = urlLine.split('=')[1]?.trim();
          this.logger.log(`📄 .env 파일에서 직접 읽은 SUPABASE_URL: ${urlValue ? urlValue.substring(0, 30) + '...' : '(없음)'}`);
        }
        if (keyLine) {
          const keyValue = keyLine.split('=')[1]?.trim();
          this.logger.log(`📄 .env 파일에서 직접 읽은 SUPABASE_KEY: ${keyValue ? keyValue.substring(0, 15) + '...' : '(없음)'}`);
        }
      } catch (err) {
        this.logger.warn('⚠️ .env 파일 직접 읽기 실패:', err);
      }
      
      // dotenv 로드 (override: true로 설정하여 기존 값 덮어쓰기)
      const result = dotenv.config({ path: envPath, override: true });
      
      if (result.error) {
        this.logger.warn('⚠️ .env 파일 로드 실패 (환경 변수에서 시도):', result.error);
      } else {
        this.logger.log('✅ .env 파일 로드 완료 (로컬 환경)');
      }
    } else {
      this.logger.log('✅ 배포 환경: 환경 변수에서 직접 읽기');
    }
    
    // 로드 후 환경 변수 확인
    const afterLoadUrl = process.env.SUPABASE_URL;
    const afterLoadKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;
    this.logger.log('📋 dotenv 로드 후 상태:');
    this.logger.log(`  SUPABASE_URL: ${afterLoadUrl ? afterLoadUrl.substring(0, 30) + '...' : '(없음)'}`);
    this.logger.log(`  SUPABASE_KEY: ${afterLoadKey ? afterLoadKey.substring(0, 15) + '...' : '(없음)'}`);
    
    // 환경 변수 읽기 (로컬: .env에서 로드됨, 배포: 이미 설정됨)
    const supabaseUrl = process.env.SUPABASE_URL as string;
    const supabaseKey = (process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY) as string;

    this.logger.log('🔑 Supabase URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
    this.logger.log('🔑 Supabase Key:', supabaseKey ? '✅ Set' : '❌ Missing');
    this.logger.log('🔑 URL type:', typeof supabaseUrl);
    this.logger.log('🔑 Key type:', typeof supabaseKey);
    this.logger.log('🔑 URL value:', supabaseUrl || '(없음)');
    this.logger.log('🔑 Key length:', supabaseKey?.length || 0);
    this.logger.log('🔑 Key starts with:', supabaseKey?.substring(0, 20) || '(없음)');
    if (supabaseKey && supabaseKey.length > 20) {
      this.logger.log('🔑 Key ends with:', supabaseKey.substring(supabaseKey.length - 20));
    }

    if (!supabaseUrl || !supabaseKey) {
      this.logger.error('❌ Missing Supabase environment variables');
      this.logger.error('  SUPABASE_URL:', supabaseUrl || 'Missing');
      this.logger.error('  SUPABASE_KEY:', supabaseKey ? 'Set' : 'Missing');
      this.logger.error('💡 해결 방법: .env 파일을 생성하고 Supabase 환경 변수를 설정해주세요.');
      this.logger.error('💡 예시:');
      this.logger.error('   SUPABASE_URL=https://your-project.supabase.co');
      this.logger.error('   SUPABASE_KEY=your-service-role-key');
      this.logger.error('   또는');
      this.logger.error('   SUPABASE_ANON_KEY=your-anon-key');
      throw new Error('Missing Supabase environment variables - .env 파일에 환경 변수를 설정해주세요.');
    }

    this.client = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      db: {
        schema: 'public',
      },
    });
  }

  /**
   * Supabase 클라이언트 가져오기 (이전 코드 스타일)
   */
  public getClient(): SupabaseClient {
    return this.client;
  }

  /**
   * Supabase 연결 테스트 (이전 코드 스타일)
   */
  public async testConnection(): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('course_grades')
        .select('id', { count: 'exact', head: true })
        .limit(1);

      return !error;
    } catch (error) {
      this.logger.error('Supabase connection test failed:', error);
      return false;
    }
  }

  /**
   * 성적 문자를 GPA 점수로 변환
   */
  private convertGradeToGradePoint(grade: string): number | null {
    const gradeMap: Record<string, number | null> = {
      'A+': 4.5,
      'A': 4.0,
      'A-': 3.7,
      'B+': 3.5,
      'B': 3.0,
      'B-': 2.7,
      'C+': 2.5,
      'C': 2.0,
      'C-': 1.7,
      'D+': 1.5,
      'D': 1.0,
      'D-': 0.7,
      'F': 0.0,
      'P': null, // Pass (학점 미포함)
      'NP': null, // No Pass
      'S': null, // Satisfactory
      'U': null, // Unsatisfactory
    };

    const normalizedGrade = grade.trim().toUpperCase();
    return gradeMap[normalizedGrade] ?? null;
  }

  /**
   * semester 문자열에서 year 추출 (예: "2024-1" -> 2024)
   */
  private extractYearFromSemester(semester: string | null | undefined): number | null {
    if (!semester) return null;
    const match = semester.match(/^(\d{4})/);
    return match ? parseInt(match[1], 10) : null;
  }

  /**
   * 빈 값(null, undefined)을 빈 문자열("")로 변환
   */
  private ensureString(value: string | null | undefined): string {
    return value ?? '';
  }

  /**
   * SubjectDto를 CourseGradeDto로 변환
   */
  private convertSubjectToCourseGrade(
    subject: SubjectDto,
    transcriptId: string | null = null,
    userId: string | null = null,
  ): CourseGradeDto {
    const gradePoint = this.convertGradeToGradePoint(subject.grade || '');
    const year = this.extractYearFromSemester(subject.semester);

    return {
      transcript_id: transcriptId,
      user_id: userId,
      course_name: this.ensureString(subject.name),
      course_code: null, // OCR에서 추출 불가
      credits: subject.credits || null,
      grade: this.ensureString(subject.grade),
      grade_point: gradePoint ?? null,
      semester: this.ensureString(subject.semester),
      year: year ?? null,
      course_type: this.ensureString(subject.type),
      professor: null, // OCR에서 추출 불가
    };
  }

  /**
   * 성적표 저장 (기존 조회 없이 항상 새로 생성)
   */
  async saveTranscript(
    userId: string,
    transcriptData: TranscriptDataDto,
  ): Promise<SaveTranscriptResult> {
    try {
      this.logger.log('성적표 저장 시작:', { userId, transcriptData });

      // Supabase 연결 확인
      const { data: connectionTest, error: connectionError } = await this.client
        .from('transcripts')
        .select('count', { count: 'exact', head: true });

      if (connectionError) {
        this.logger.error('Supabase 연결 오류:', connectionError);
        throw connectionError;
      }

      this.logger.log('Supabase 연결 확인됨');

      // 기존 조회 없이 항상 새 성적표 생성
      this.logger.log('새 성적표 생성');

      const insertData: any = {
        user_id: null, // 외래키 제약 때문에 null로 설정 (users 테이블에 없으면 에러 발생)
        university: transcriptData.university || '',
        major: transcriptData.major || '',
        double_major: transcriptData.double_major || null,
        minor: transcriptData.minor || null,
        student_id: transcriptData.student_id || '',
        student_name: transcriptData.student_name || '',
        gpa: transcriptData.gpa?.toString() || '0.0',
      };

      // total_credits 컬럼은 실제 DB에 없으므로 제거

      this.logger.log('Insert할 데이터:', JSON.stringify(insertData, null, 2));

      // 새 성적표 생성
      const { data: newTranscript, error: insertError } = await this.client
        .from('transcripts')
        .insert(insertData)
        .select()
        .single();

      let transcriptId: string | null = null;

      if (insertError) {
        // transcripts 테이블이 없거나 에러가 발생해도 계속 진행 (course_grades만 저장)
        this.logger.warn('성적표 생성 실패 (course_grades만 저장):');
        this.logger.warn('  에러 코드:', insertError.code);
        this.logger.warn('  에러 메시지:', insertError.message);
        this.logger.warn('  에러 상세:', JSON.stringify(insertError, null, 2));
        // transcriptId는 null로 유지, course_grades만 저장
      } else {
        transcriptId = newTranscript.id;
        this.logger.log('성적표 생성 완료, ID:', transcriptId);
      }

      // 과목 데이터 저장
      if (transcriptData.subjects && transcriptData.subjects.length > 0) {
        this.logger.log('과목 데이터 저장 시작:', transcriptData.subjects.length, '개 과목');

        const courseSaveResult = await this.saveCourseGrades(
          transcriptData.subjects,
          transcriptId,
          userId,
        );

        if (courseSaveResult.errors > 0) {
          this.logger.warn(`과목 저장 중 일부 실패: ${courseSaveResult.errors}개`);
        }

        this.logger.log('성적표 저장 모든 과정 완료');
        return {
          success: true,
          transcriptId: transcriptId || undefined,
          savedCourses: courseSaveResult.saved,
          errors: courseSaveResult.errors,
        };
      } else {
        this.logger.log('저장할 과목이 없습니다.');
        return {
          success: true,
          transcriptId: transcriptId || undefined,
          savedCourses: 0,
          errors: 0,
        };
      }
    } catch (error) {
      this.logger.error('성적표 저장 오류 상세:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: (error as any)?.code,
        details: (error as any)?.details,
        hint: (error as any)?.hint,
        fullError: error,
      });
      return {
        success: false,
        savedCourses: 0,
        errors: transcriptData.subjects?.length || 0,
        error: error as Error,
      };
    }
  }

  /**
   * course_grades 테이블에 과목 데이터 저장 (이전 클라이언트 코드 패턴과 동일)
   */
  async saveCourseGrades(
    subjects: SubjectDto[],
    transcriptId: string | null = null,
    userId: string | null = null,
  ): Promise<{ saved: number; errors: number }> {
    if (subjects.length === 0) {
      return { saved: 0, errors: 0 };
    }

    // SubjectDto를 course_grades 테이블 형식으로 변환
    // user_id가 users 테이블의 외래키 제약이 있는 경우 null로 설정
    const coursesToInsert = subjects.map((subject) => {
      const year = this.extractYearFromSemester(subject.semester);
      return {
        transcript_id: transcriptId,
        user_id: null, // 외래키 제약 때문에 null로 설정 (users 테이블에 없으면 에러 발생)
        course_name: this.ensureString(subject.name),
        grade: this.ensureString(subject.grade),
        credits: subject.credits || null,
        semester: this.ensureString(subject.semester),
        year: year ?? null,
        course_type: this.ensureString(subject.type),
      };
    });

    try {
      const { error: coursesError } = await this.client
        .from('course_grades')
        .insert(coursesToInsert);

      if (coursesError) {
        this.logger.error('과목 저장 오류:', coursesError);
        throw coursesError;
      }

      this.logger.log('과목 데이터 저장 완료');
      return { saved: subjects.length, errors: 0 };
    } catch (error) {
      this.logger.error('과목 저장 오류 상세:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: (error as any)?.code,
        details: (error as any)?.details,
        hint: (error as any)?.hint,
        fullError: error,
      });
      return { saved: 0, errors: subjects.length };
    }
  }

  /**
   * 성적표 조회
   */
  async getTranscript(userId: string): Promise<TranscriptDataDto | null> {
    try {
      // 성적표 기본 정보 조회
      const { data: transcript, error: transcriptError } =
        await this.client
          .from('transcripts')
          .select('*')
          .eq('user_id', userId)
          .single();

      if (transcriptError || !transcript) {
        return null;
      }

      // 과목 정보 조회
      const { data: courses, error: coursesError } = await this.client
        .from('course_grades')
        .select('*')
        .eq('transcript_id', transcript.id)
        .order('year', { ascending: true })
        .order('semester', { ascending: true });

      if (coursesError) {
        this.logger.error('과목 데이터 조회 오류:', coursesError);
        return null;
      }

      // 데이터 변환
      const transcriptData: TranscriptDataDto = {
        university: transcript.university || '',
        student_name: transcript.student_name || '',
        student_id: transcript.student_id || '',
        major: transcript.major || '',
        double_major: transcript.double_major || null,
        minor: transcript.minor || null,
        total_credits: transcript.total_credits || 0,
        gpa: parseFloat(transcript.gpa || '0.0'),
        subjects:
          courses?.map((course) => ({
            name: course.course_name,
            credits: course.credits || 0,
            grade: course.grade || '',
            type: course.course_type || '',
            semester: course.semester || '',
          })) || [],
      };

      return transcriptData;
    } catch (error) {
      this.logger.error('성적표 조회 오류:', error);
      return null;
    }
  }

  /**
   * 성적표 삭제
   */
  async deleteTranscript(userId: string): Promise<{ success: boolean; error?: Error }> {
    try {
      // 성적표 ID 조회
      const { data: transcript } = await this.client
        .from('transcripts')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (!transcript) {
        return { success: true }; // 이미 삭제된 경우
      }

      // 과목 먼저 삭제 (외래키 제약)
      await this.client
        .from('course_grades')
        .delete()
        .eq('transcript_id', transcript.id);

      // 성적표 삭제
      const { error } = await this.client
        .from('transcripts')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      this.logger.error('성적표 삭제 오류:', error);
      return { success: false, error: error as Error };
    }
  }
}

