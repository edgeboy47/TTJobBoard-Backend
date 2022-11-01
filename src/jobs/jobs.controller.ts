import { Controller, Get } from '@nestjs/common';
import { JobsService } from './jobs.service';

@Controller('jobs')
export class JobsController {
  constructor(private readonly service: JobsService) {}

  @Get()
  async getJobs() {
    return this.service.getJobs();
  }
}
