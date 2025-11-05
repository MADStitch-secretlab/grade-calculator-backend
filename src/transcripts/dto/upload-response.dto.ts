export type { TranscriptDataDto } from './transcript-data.dto';

export class PerformanceMetricsDto {
  buffer_time: number;
  file_create_time: number;
  upload_time: number;
  gpt_analysis_time: number;
  json_parse_time: number;
  total_time: number;
}

export class UploadResponseDto {
  success: boolean;
  data?: any;
  performance?: PerformanceMetricsDto;
  error?: string;
  raw_result?: string;
}
