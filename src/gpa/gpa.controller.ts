import { Controller, Post, Body, Get, ValidationPipe } from '@nestjs/common';
import { GpaService } from './gpa.service';
import { SimulationInputDto } from './dto/simulation-input.dto';
import { SimulationResponseDto } from './dto/simulation-result.dto';

@Controller('api/gpa')
export class GpaController {
  constructor(private readonly gpaService: GpaService) {}

  @Get('health')
  async healthCheck() {
    const isHealthy = await this.gpaService.healthCheck();
    return {
      service: 'GPA Simulator',
      status: isHealthy ? 'healthy' : 'unhealthy',
    };
  }

  @Post('simulate')
  async simulate(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    input: SimulationInputDto,
  ): Promise<SimulationResponseDto> {
    try {
      const results = await this.gpaService.simulate(input);
      return {
        success: true,
        data: results,
        message: '시뮬레이션이 완료되었습니다',
      };
    } catch (error) {
      if (error.status === 400) {
        return {
          success: false,
          error: 'INVALID_INPUT',
          message: error.message,
        };
      }

      if (error.status === 422) {
        return {
          success: false,
          error: 'TARGET_IMPOSSIBLE',
          message:
            '목표 GPA를 달성할 수 없습니다. 목표를 낮추거나 계절학기를 추가하세요.',
          detail: error.message,
        };
      }

      return {
        success: false,
        error: 'SERVER_ERROR',
        message: '시뮬레이션 중 오류가 발생했습니다.',
      };
    }
  }
}
