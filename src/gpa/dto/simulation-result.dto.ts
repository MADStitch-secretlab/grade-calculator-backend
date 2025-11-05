export class SimulationResultDto {
  term_id: string;
  credits: number;
  required_avg: number;
}

export class SimulationResponseDto {
  success: boolean;
  data?: SimulationResultDto[];
  error?: string;
  message?: string;
  detail?: string;
}
