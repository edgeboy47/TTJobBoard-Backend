import { Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'
import { JobModule } from './job/job.module'
import { PrismaModule } from './prisma/prisma.module'

@Module({
  imports: [PrismaModule, JobModule, ScheduleModule.forRoot()],
})
export class AppModule {}
