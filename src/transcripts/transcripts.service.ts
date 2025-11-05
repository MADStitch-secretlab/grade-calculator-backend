import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { UploadResponseDto } from './dto/upload-response.dto';
import { OcrService } from './services/ocr.service';
import { TranscriptsRepository } from './repositories/transcripts.repository';

@Injectable()
export class TranscriptsService {
  private readonly logger = new Logger(TranscriptsService.name);

  constructor(
    private readonly ocrService: OcrService,
    private readonly transcriptsRepository: TranscriptsRepository,
  ) {}

  /**
   * 가상의 사용자 ID 생성 (로그인 기능 없을 경우)
   * UUID 형식으로 생성
   */
  private generateVirtualUserId(): string {
    // UUID 형식으로 생성 (Supabase의 UUID 타입 호환)
    return randomUUID();
  }

  /**
   * PDF 파일 업로드 및 OCR 분석, DB 저장
   */
  async analyzeTranscript(
    file: Express.Multer.File,
    userId?: string,
  ): Promise<UploadResponseDto> {
    const dbStart = Date.now();
    this.logger.log('=== 성적표 분석 시작 ===');

    // userId가 없으면 가상의 ID 생성
    const finalUserId = userId || this.generateVirtualUserId();
    if (!userId) {
      this.logger.log(`가상 사용자 ID 생성: ${finalUserId}`);
    }

    // 1. OCR 서비스로 PDF 분석
    const ocrResult = await this.ocrService.analyzePdf(file);

    if (!ocrResult.success || !ocrResult.data) {
      return {
        success: false,
        error: ocrResult.error || 'OCR 분석 실패',
        raw_result: ocrResult.raw_result,
      };
    }

    // 2. 데이터베이스 저장 (항상 저장)
    if (ocrResult.data) {
      this.logger.log('=== 데이터베이스 저장 시작 ===');
      const saveResult = await this.transcriptsRepository.saveTranscript(
        finalUserId,
        ocrResult.data,
      );

      const dbEnd = Date.now();
      const dbTime = dbEnd - dbStart;
      this.logger.log(`⏱️ DB 저장 시간: ${dbTime}ms`);
      this.logger.log(
        `저장 결과: ${saveResult.savedCourses}개 성공, ${saveResult.errors}개 실패`,
      );

      return {
        success: true,
        data: {
          ...ocrResult.data,
          db_save_result: {
            success: saveResult.success,
            transcriptId: saveResult.transcriptId,
            saved: saveResult.savedCourses,
            errors: saveResult.errors,
          },
        },
        performance: ocrResult.performance,
      };
    }

    // OCR 결과가 없는 경우
    return {
      success: true,
      data: ocrResult.data,
      performance: ocrResult.performance,
    };
  }

  /**
   * 성적표 조회
   */
  async getTranscript(userId: string) {
    return await this.transcriptsRepository.getTranscript(userId);
  }

  /**
   * 성적표 삭제
   */
  async deleteTranscript(userId: string) {
    return await this.transcriptsRepository.deleteTranscript(userId);
  }
}
