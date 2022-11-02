import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { ScheduleModule } from '@nestjs/schedule';
import { JobModule } from './job/job.module';

@Module({
  imports: [PrismaModule, JobModule, ScheduleModule.forRoot()],
})
export class AppModule {}
