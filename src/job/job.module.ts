import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JobController } from './job.controller'
import { JobService } from './job.service'

@Module({
  providers: [JobService, ConfigService],
  controllers: [JobController],
})
export class JobModule {}
