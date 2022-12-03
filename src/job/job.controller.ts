import { Controller, Get, Query } from '@nestjs/common';
import { JobApiResponse, JobService } from './job.service';

export type JobSearchParams = {
  page?: string;
  perPage?: string;
  title?: string;
  company?: string;
};
@Controller('jobs')
export class JobController {
  constructor(private readonly service: JobService) {}

  @Get()
  async getAllJobs(
    @Query()
    params: JobSearchParams,
  ): Promise<JobApiResponse> {
    return this.service.getAllJobs(
      parseInt(params.perPage),
      parseInt(params.page),
      params.title,
      params.company,
    );
  }
}
