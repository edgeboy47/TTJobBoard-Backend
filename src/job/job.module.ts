import { Module } from '@nestjs/common'
import { JobController } from './job.controller'
import { JobService } from './job.service'
import { ConfigService } from '@nestjs/config'

@Module({
  providers: [JobService, ConfigService],
  controllers: [JobController],
})
export class JobModule { }
