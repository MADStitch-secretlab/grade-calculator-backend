import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Get,
  Query,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { TranscriptsService } from './transcripts.service';
import { TranscriptConverterService } from './services/transcript-converter.service';
import { UploadResponseDto } from './dto/upload-response.dto';
import { SimulationInputDto } from '../gpa/dto/simulation-input.dto';

@Controller('api/transcripts')
export class TranscriptsController {
  constructor(
    private readonly transcriptsService: TranscriptsService,
    private readonly converterService: TranscriptConverterService,
  ) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(), // 파일을 디스크에 저장하지 않고 메모리에만 저장
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
      fileFilter: (req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
          return cb(
            new BadRequestException('PDF 파일만 업로드 가능합니다.'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadTranscript(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadResponseDto> {
    if (!file) {
      throw new BadRequestException('파일이 없습니다.');
    }

    return await this.transcriptsService.analyzeTranscript(file);
  }

  /**
   * OCR 결과를 시뮬레이션 입력 형식으로 변환
   */
  @Post('convert-to-simulation')
  async convertToSimulation(
    @Body('transcriptData') transcriptData: any,
    @Body('targetGpa') targetGpa: number,
    @Body('targetTotalCredits') targetTotalCredits: number,
    @Body('scaleMax') scaleMax?: number,
    @Body('futureTerms') futureTerms?: Array<{
      id: string;
      type: 'regular' | 'summer';
      planned_credits: number;
      max_credits?: number;
    }>,
  ): Promise<{ success: boolean; data?: SimulationInputDto; error?: string }> {
    try {
      if (!transcriptData || !targetGpa || !targetTotalCredits) {
        throw new BadRequestException(
          'transcriptData, targetGpa, targetTotalCredits는 필수입니다.',
        );
      }

      const simulationInput = this.converterService.convertToSimulationInput(
        transcriptData,
        targetGpa,
        targetTotalCredits,
        scaleMax || 4.5,
        futureTerms,
      );

      return {
        success: true,
        data: simulationInput,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || '변환 실패',
      };
    }
  }
}
