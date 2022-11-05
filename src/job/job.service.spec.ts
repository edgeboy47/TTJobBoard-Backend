import { Test, TestingModule } from '@nestjs/testing';
import { JobService } from './job.service';
import { caribbeanJobsMarkup } from './fixtures';
import { PrismaService } from '../prisma/prisma.service';

describe('JobService', () => {
  let service: JobService;
  let mockPrismaService;

  // Mock PrismaService,
  jest
    .mock<typeof import('../prisma/prisma.service')>('../prisma/prisma.service')
    .setTimeout(10000);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JobService, PrismaService],
    }).compile();

    service = module.get<JobService>(JobService);
    mockPrismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(mockPrismaService).toBeDefined();
  });

  describe('Scraping Caribbean Jobs', () => {
    beforeEach(async () => {
      jest
        .spyOn(service, 'getMarkupWithPuppeteer')
        .mockResolvedValue(caribbeanJobsMarkup);
    });

    it('should get markup correctly', async () => {
      await service.scrapeCaribbeanJobs();

      expect(service.getMarkupWithPuppeteer).toBeCalledTimes(1);
      expect(
        service.getMarkupWithPuppeteer(expect.any(String), expect.any(String)),
      ).resolves.toBe(caribbeanJobsMarkup);
    });

    it('should check if job already exists', async () => {
      jest.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(true);
      jest.spyOn(mockPrismaService.job, 'create').mockResolvedValue(undefined);

      await service.scrapeCaribbeanJobs();

      expect(mockPrismaService.job.findUnique).toBeCalledTimes(1);
      expect(mockPrismaService.job.create).not.toBeCalled();
    });

    it('should write to database if it does not already exist', async () => {
      jest.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(false);
      jest.spyOn(mockPrismaService.job, 'create').mockResolvedValue(undefined);

      await service.scrapeCaribbeanJobs();

      expect(mockPrismaService.job.findUnique).toBeCalledTimes(1);
      expect(mockPrismaService.job.create).toBeCalledTimes(1);
    });

    it('should parse the given markup correctly', async () => {
      jest.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(false);
      jest.spyOn(mockPrismaService.job, 'create').mockResolvedValue(undefined);

      await service.scrapeCaribbeanJobs();

      expect(mockPrismaService.job.create.mock.calls[0][0]).toStrictEqual({
        data: {
          title: 'Insurance Sales Representatives / Advisors',
          company: 'Guardian Group – Dexter George Unit',
          description: 'Insurance Sales Representatives / Advisors',
          url: 'https://www.caribbeanjobs.com/Insurance-Sales-Representatives-Advisors-Job-141263.aspx?p=1|application_confirmed',
          location: 'Arima/Sangre Grande / Port-of-Spain / Trincity',
          sector: 'PRIVATE',
        },
      });
    });

    // TODO: figure out how to mock logger
    it.skip('should catch exceptions', async () => {
      jest.spyOn(mockPrismaService.job, 'findUnique').mockImplementation(() => {
        throw new Error();
      });

      // jest.spyOn(mockLogger, 'log');
      // jest.spyOn(mockLogger, 'error');

      await service.scrapeCaribbeanJobs();

      // expect(mockLogger.log).not.toBeCalled();
      // expect(mockLogger.error).toBeCalledTimes(1);
    });
  });
});
