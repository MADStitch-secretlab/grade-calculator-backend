import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  healthCheck() {
    return {
      status: 'ok',
      service: 'grade-calculator-backend',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('healthz')
  healthz() {
    // 배포 플랫폼용 간단한 헬스체크
    return { status: 'ok' };
  }
}
