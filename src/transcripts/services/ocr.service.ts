import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { TranscriptDataDto } from '../dto/transcript-data.dto';
import { PerformanceMetricsDto } from '../dto/upload-response.dto';

export interface OcrResult {
  success: boolean;
  data?: TranscriptDataDto;
  performance?: PerformanceMetricsDto;
  error?: string;
  raw_result?: string;
}

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);
  private readonly openai: OpenAI;

  constructor(private readonly configService: ConfigService) {
    // ConfigService에서 먼저 시도, 없으면 process.env에서 직접 읽기
    let apiKey = this.configService.get<string>('OPENAI_API_KEY');
    
    // ConfigService에서 못 읽었으면 process.env에서 직접 읽기
    if (!apiKey || apiKey.includes('your_ope')) {
      this.logger.warn('ConfigService에서 OPENAI_API_KEY를 읽지 못함, process.env에서 시도');
      apiKey = process.env.OPENAI_API_KEY;
    }
    
    if (!apiKey || apiKey.includes('your_ope')) {
      this.logger.error('OPENAI_API_KEY is not configured or invalid');
      this.logger.error('ConfigService value:', this.configService.get<string>('OPENAI_API_KEY')?.substring(0, 20));
      this.logger.error('process.env value:', process.env.OPENAI_API_KEY?.substring(0, 20));
      this.logger.error('Please set OPENAI_API_KEY in .env file');
      throw new Error('OPENAI_API_KEY is not configured');
    }
    
    this.openai = new OpenAI({
      apiKey: apiKey,
    });
    this.logger.log('OpenAI client initialized successfully');
  }

  /**
   * PDF 파일을 GPT로 분석하여 성적표 데이터 추출
   */
  async analyzePdf(file: Express.Multer.File): Promise<OcrResult> {
    const startTime = Date.now();
    const performance: Partial<PerformanceMetricsDto> = {};

    try {
      this.logger.log('=== PDF 파일 메모리에서 처리 시작 ===');
      this.logger.log(
        `파일명: ${file.originalname}, 크기: ${file.size} bytes`,
      );
      this.logger.log('📝 파일 저장 없이 메모리에서 바로 OCR 처리');

      // Buffer 변환 (메모리에서 직접 처리, 디스크 저장 없음)
      const bufferStart = Date.now();
      this.logger.log('=== OpenAI에 PDF 직접 업로드 중 (메모리 버퍼 사용) ===');
      const buffer = file.buffer;
      const bufferEnd = Date.now();
      performance.buffer_time = bufferEnd - bufferStart;
      this.logger.log(`⏱️ Buffer 변환 시간: ${performance.buffer_time}ms`);

      // File 객체 생성
      const fileCreateStart = Date.now();
      const uploadFile = new File([new Uint8Array(buffer)], file.originalname, {
        type: 'application/pdf',
      });
      const fileCreateEnd = Date.now();
      performance.file_create_time = fileCreateEnd - fileCreateStart;
      this.logger.log(
        `⏱️ File 객체 생성 시간: ${performance.file_create_time}ms`,
      );

      // OpenAI 파일 업로드
      const uploadStart = Date.now();
      const uploadedFile = await this.openai.files.create({
        file: uploadFile,
        purpose: 'assistants',
      });
      const uploadEnd = Date.now();
      performance.upload_time = uploadEnd - uploadStart;

      this.logger.log(`OpenAI 파일 업로드 완료: ${uploadedFile.id}`);
      this.logger.log(`⏱️ OpenAI 업로드 시간: ${performance.upload_time}ms`);

      // 메시지 컨텐츠 구성
      const messageContents: OpenAI.Chat.ChatCompletionContentPart[] = [
        {
          type: 'text',
          text: 'PDF 성적표에서 학생 정보와 과목별 성적을 추출하세요.',
        },
        {
          type: 'file',
          file: {
            file_id: uploadedFile.id,
          },
        },
      ];

      // GPT로 PDF 분석
      const gptStart = Date.now();
      this.logger.log('=== GPT 분석 시작 ===');
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `PDF에서 학생 성적 정보를 추출하세요. 주전공, 복수전공, 부전공을 모두 찾아주세요. JSON만 반환:
{"university":"","student_name":"","student_id":"","major":"","double_major":null,"minor":null,"subjects":[{"name":"","credits":0,"grade":"","type":"전공|교양|전필|전선|교필|교선|복수전공|일선","semester":""}],"total_credits":0,"gpa":0.0}`,
          },
          {
            role: 'user',
            content: messageContents,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 2000,
        top_p: 0.9,
      });
      const gptEnd = Date.now();
      performance.gpt_analysis_time = gptEnd - gptStart;
      this.logger.log(`⏱️ GPT 분석 시간: ${performance.gpt_analysis_time}ms`);

      const result = completion.choices[0].message?.content || '{}';

      this.logger.log('=== GPT 응답 결과 ===');
      this.logger.log(result);
      this.logger.log('=== GPT 응답 완료 ===');

      // JSON 파싱
      const parseStart = Date.now();
      try {
        const parsedResult: TranscriptDataDto = JSON.parse(result);
        const parseEnd = Date.now();
        performance.json_parse_time = parseEnd - parseStart;
        performance.total_time = Date.now() - startTime;

        this.logger.log(`⏱️ JSON 파싱 시간: ${performance.json_parse_time}ms`);
        this.logger.log('=== JSON 파싱 결과 ===');
        this.logger.log(JSON.stringify(parsedResult, null, 2));
        this.logger.log(`⏱️ 전체 처리 시간: ${performance.total_time}ms`);
        this.logger.log('=== OCR 처리 완료 ===');

        return {
          success: true,
          data: parsedResult,
          performance: performance as PerformanceMetricsDto,
        };
      } catch (parseError) {
        const parseEnd = Date.now();
        performance.json_parse_time = parseEnd - parseStart;
        performance.total_time = Date.now() - startTime;

        this.logger.error(`⏱️ JSON 파싱 실패 시간: ${performance.json_parse_time}ms`);
        this.logger.error('=== JSON 파싱 에러 ===');
        this.logger.error('파싱 에러:', parseError);
        this.logger.error('원본 결과:', result);
        this.logger.error('=== 에러 처리 완료 ===');

        return {
          success: false,
          error: 'JSON 파싱 실패',
          raw_result: result,
        };
      }
    } catch (error) {
      this.logger.error('=== OCR 분석 에러 ===');
      this.logger.error(error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

