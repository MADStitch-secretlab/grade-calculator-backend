import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { SimulationInputDto } from './dto/simulation-input.dto';
import { SimulationResultDto } from './dto/simulation-result.dto';

@Injectable()
export class GpaService {
  private readonly logger = new Logger(GpaService.name);
  private readonly simulatorUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.simulatorUrl = this.configService.get<string>(
      'GPA_SIMULATOR_URL',
      'http://localhost:8000',
    );
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.simulatorUrl}/health`),
      );
      return response.data.status === 'healthy';
    } catch (error) {
      this.logger.error('GPA Simulator health check failed', error);
      return false;
    }
  }

  async simulate(input: SimulationInputDto): Promise<SimulationResultDto[]> {
    const startTime = Date.now();

    try {
      this.logger.log({
        message: 'GPA simulation request',
        target_gpa: input.G_t,
        total_credits: input.C_tot,
        history_terms: input.history.length,
        remaining_terms: input.terms.length,
      });

      const response = await firstValueFrom(
        this.httpService.post<SimulationResultDto[]>(
          `${this.simulatorUrl}/simulate`,
          input,
          {
            headers: {
              'Content-Type': 'application/json',
            },
            timeout: 5000,
          },
        ),
      );

      const duration = Date.now() - startTime;
      this.logger.log({
        message: 'GPA simulation success',
        duration_ms: duration,
        results_count: response.data.length,
      });

      return response.data;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error({
        message: 'GPA simulation failed',
        duration_ms: duration,
        error: error.message,
      });

      this.handleSimulationError(error);
    }
  }

  private handleSimulationError(error: any): never {
    if (error.response) {
      const status = error.response.status;
      const detail = error.response.data?.detail || 'Unknown error';

      this.logger.error(`Simulation error [${status}]: ${detail}`);

      switch (status) {
        case 400:
          throw new BadRequestException(detail);
        case 422:
          throw new UnprocessableEntityException(detail);
        case 500:
          throw new InternalServerErrorException(
            '시뮬레이션 중 오류가 발생했습니다',
          );
        default:
          throw new InternalServerErrorException(
            '예상치 못한 오류가 발생했습니다',
          );
      }
    }

    this.logger.error('Network error connecting to GPA Simulator', error);
    throw new ServiceUnavailableException(
      'GPA 시뮬레이터 서버에 연결할 수 없습니다',
    );
  }
}
