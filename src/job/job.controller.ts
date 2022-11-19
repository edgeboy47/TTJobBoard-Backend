import { Controller, Get, Query } from '@nestjs/common';
import { JobApiResponse, JobService } from './job.service';

@Controller('jobs')
export class JobController {
  constructor(private readonly service: JobService) {}

  @Get()
  async getAllJobs(
    @Query() params: { page?: string; perPage?: string },
  ): Promise<JobApiResponse> {
    return this.service.getAllJobs(
      parseInt(params.perPage),
      parseInt(params.page),
    );
  }
}
