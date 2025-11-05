import { Module } from '@nestjs/common';
import { TranscriptsController } from './transcripts.controller';
import { TranscriptsService } from './transcripts.service';
import { OcrService } from './services/ocr.service';
import { TranscriptsRepository } from './repositories/transcripts.repository';
import { TranscriptConverterService } from './services/transcript-converter.service';

@Module({
  controllers: [TranscriptsController],
  providers: [
    TranscriptsService,
    OcrService,
    TranscriptsRepository,
    TranscriptConverterService,
  ],
  exports: [TranscriptsService, TranscriptConverterService],
})
export class TranscriptsModule {}
