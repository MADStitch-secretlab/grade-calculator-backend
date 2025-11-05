import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GpaModule } from './gpa/gpa.module';
import { TranscriptsModule } from './transcripts/transcripts.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'], // 배열로 여러 경로 지원
      expandVariables: true, // ${VAR} 확장 지원
    }),
    GpaModule,
    TranscriptsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
