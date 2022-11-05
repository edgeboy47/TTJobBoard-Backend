import { Controller, Get } from '@nestjs/common';
import { JobService } from './job.service';

@Controller('jobs')
export class JobController {
  constructor(private readonly service: JobService) {}

  @Get()
  async getAllJobs() {
    return this.service.getAllJobs();
  }
}
