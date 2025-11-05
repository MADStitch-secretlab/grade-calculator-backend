import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GpaController } from './gpa.controller';
import { GpaService } from './gpa.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 0,
    }),
  ],
  controllers: [GpaController],
  providers: [GpaService],
  exports: [GpaService],
})
export class GpaModule {}
