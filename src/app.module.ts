import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { JobsModule } from './jobs/jobs.module';

@Module({
  imports: [PrismaModule, JobsModule],
})
export class AppModule {}
