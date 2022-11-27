import { Test, TestingModule } from '@nestjs/testing';
import { JobService } from './job.service';
import {
  caribbeanJobsMarkup,
  crsMarkup,
  employttMarkup,
  eveAndersonMarkup,
  fcbMarkup,
  jobsTTMarkup,
  massyFinanceMarkup,
  trinidadJobsMarkup,
  webfxMarkup,
} from './fixtures';
import { PrismaService } from '../prisma/prisma.service';

describe('JobService', () => {
  let service: JobService;
  let mockPrismaService;

  // Mock PrismaService
  jest
    .mock<typeof import('../prisma/prisma.service')>('../prisma/prisma.service')
    .setTimeout(10000);

  beforeAll(async () => {
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
    beforeAll(() => {
      jest
        .spyOn(service, 'getMarkupWithPuppeteer')
        .mockResolvedValue(caribbeanJobsMarkup);
    });

    afterEach(() => jest.clearAllMocks());

    it('should get markup correctly', async () => {
      jest.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(true);

      await service.scrapeCaribbeanJobs();

      expect(service.getMarkupWithPuppeteer).toBeCalledTimes(1);
      expect(
        service.getMarkupWithPuppeteer(expect.any(String), {
          selector: expect.any(String),
        }),
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

  describe('Scraping JobsTT', () => {
    beforeAll(() => {
      jest.spyOn(global, 'fetch').mockImplementation(
        jest.fn(() =>
          Promise.resolve({
            text: () => Promise.resolve<string>(jobsTTMarkup),
          }),
        ) as jest.Mock,
      );
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should call fetch', async () => {
      jest.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(true);

      await service.scrapeJobsTT();

      expect(global.fetch).toBeCalledTimes(1);
    });

    it('should check if job already exists', async () => {
      jest.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(true);
      jest.spyOn(mockPrismaService.job, 'create').mockResolvedValue(undefined);

      await service.scrapeJobsTT();

      expect(mockPrismaService.job.findUnique).toBeCalledTimes(1);
      expect(mockPrismaService.job.create).not.toBeCalled();
    });

    it('should write to database if it does not already exist', async () => {
      jest.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(false);
      jest.spyOn(mockPrismaService.job, 'create').mockResolvedValue(undefined);

      await service.scrapeJobsTT();

      expect(mockPrismaService.job.findUnique).toBeCalledTimes(1);
      expect(mockPrismaService.job.create).toBeCalledTimes(1);
    });

    it('should parse the given markup correctly', async () => {
      jest.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(false);
      jest.spyOn(mockPrismaService.job, 'create').mockResolvedValue(undefined);

      await service.scrapeJobsTT();

      expect(mockPrismaService.job.create.mock.calls[0][0]).toStrictEqual({
        data: {
          title: 'HEAD, CORPORATE COMMUNICATIONS',
          company: 'THE SPORTS COMPANY OF TRINIDAD & TOBAGO LIMITED',
          description: '',
          url: expect.stringMatching(
            /https:\/\/jobstt\.com\/display-job\/94563\/HEAD,-CORPORATE-COMMUNICATIONS\.html\?searchId=[0-9]+\.[0-9]+&page=1/,
          ),
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

      await service.scrapeJobsTT();

      // expect(mockLogger.log).not.toBeCalled();
      // expect(mockLogger.error).toBeCalledTimes(1);
    });
  });

  describe('Scraping Trinidad Jobs', () => {
    beforeAll(() => {
      jest.spyOn(global, 'fetch').mockImplementation(
        jest.fn(() =>
          Promise.resolve({
            text: () => Promise.resolve<string>(trinidadJobsMarkup),
          }),
        ) as jest.Mock,
      );
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should call fetch', async () => {
      jest.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(true);

      await service.scrapeTrinidadJobs();

      expect(global.fetch).toBeCalledTimes(1);
    });

    it('should check if job already exists', async () => {
      jest.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(true);
      jest.spyOn(mockPrismaService.job, 'create').mockResolvedValue(undefined);

      await service.scrapeTrinidadJobs();

      expect(mockPrismaService.job.findUnique).toBeCalledTimes(1);
      expect(mockPrismaService.job.create).not.toBeCalled();
    });

    it('should write to database if it does not already exist', async () => {
      jest.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(false);
      jest.spyOn(mockPrismaService.job, 'create').mockResolvedValue(undefined);

      await service.scrapeTrinidadJobs();

      expect(mockPrismaService.job.findUnique).toBeCalledTimes(1);
      expect(mockPrismaService.job.create).toBeCalledTimes(1);
    });

    it('should parse the given markup correctly', async () => {
      jest.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(false);
      jest.spyOn(mockPrismaService.job, 'create').mockResolvedValue(undefined);

      await service.scrapeTrinidadJobs();

      expect(mockPrismaService.job.create.mock.calls[0][0]).toStrictEqual({
        data: {
          title: 'Security Officer',
          company: 'EUROPA (Trinidad & Tobago) Ltd',
          description: '',
          location: 'NATIONWIDE',
          url: 'https://www.trinidadjob.com/job/security-officer-23/',
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

      await service.scrapeJobsTT();

      // expect(mockLogger.log).not.toBeCalled();
      // expect(mockLogger.error).toBeCalledTimes(1);
    });
  });

  describe('Scraping CRS', () => {
    beforeAll(() => {
      jest
        .spyOn(service, 'getMarkupWithPuppeteer')
        .mockResolvedValue(crsMarkup);
    });

    afterEach(() => jest.clearAllMocks());

    it('should get markup correctly', async () => {
      jest.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(true);

      await service.scrapeCRS();

      expect(service.getMarkupWithPuppeteer).toBeCalledTimes(1);
      expect(
        service.getMarkupWithPuppeteer(expect.any(String), {
          selector: expect.any(String),
        }),
      ).resolves.toBe(crsMarkup);
    });

    it('should check if job already exists', async () => {
      jest.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(true);
      jest.spyOn(mockPrismaService.job, 'create').mockResolvedValue(undefined);

      await service.scrapeCRS();

      expect(mockPrismaService.job.findUnique).toBeCalledTimes(1);
      expect(mockPrismaService.job.create).not.toBeCalled();
    });

    it('should write to database if it does not already exist', async () => {
      jest.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(false);
      jest.spyOn(mockPrismaService.job, 'create').mockResolvedValue(undefined);

      await service.scrapeCRS();

      expect(mockPrismaService.job.findUnique).toBeCalledTimes(1);
      expect(mockPrismaService.job.create).toBeCalledTimes(1);
    });

    it('should parse the given markup correctly', async () => {
      jest.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(false);
      jest.spyOn(mockPrismaService.job, 'create').mockResolvedValue(undefined);

      await service.scrapeCRS();

      expect(mockPrismaService.job.create.mock.calls[0][0]).toStrictEqual({
        data: {
          title: 'Information Technology Manager',
          company: '',
          description: '',
          url: expect.stringMatching(
            /https:\/\/host.pcrecruiter.net\/pcrbin\/jobboard.aspx\?action=detail&recordid=161318495112243&pcr-id=.+$/,
          ),
          location: 'Port of Spain',
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

  describe('Scraping Eve Anderson', () => {
    beforeAll(() => {
      jest
        .spyOn(service, 'getMarkupWithPuppeteer')
        .mockResolvedValue(eveAndersonMarkup);
    });

    afterEach(() => jest.clearAllMocks());

    it('should get markup correctly', async () => {
      jest.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(true);

      await service.scrapeEveAnderson();

      expect(service.getMarkupWithPuppeteer).toBeCalledTimes(1);
      expect(
        service.getMarkupWithPuppeteer(expect.any(String), {
          selector: expect.any(String),
        }),
      ).resolves.toBe(eveAndersonMarkup);
    });

    it('should check if job already exists', async () => {
      jest.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(true);
      jest.spyOn(mockPrismaService.job, 'create').mockResolvedValue(undefined);

      await service.scrapeEveAnderson();

      expect(mockPrismaService.job.findUnique).toBeCalledTimes(1);
      expect(mockPrismaService.job.create).not.toBeCalled();
    });

    it('should write to database if it does not already exist', async () => {
      jest.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(false);
      jest.spyOn(mockPrismaService.job, 'create').mockResolvedValue(undefined);

      await service.scrapeEveAnderson();

      expect(mockPrismaService.job.findUnique).toBeCalledTimes(1);
      expect(mockPrismaService.job.create).toBeCalledTimes(1);
    });

    it('should parse the given markup correctly', async () => {
      jest.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(false);
      jest.spyOn(mockPrismaService.job, 'create').mockResolvedValue(undefined);

      await service.scrapeEveAnderson();

      expect(mockPrismaService.job.create.mock.calls[0][0]).toStrictEqual({
        data: {
          title: 'Accountant',
          company: '',
          description: '',
          url: expect.stringMatching(
            /https:\/\/host.pcrecruiter.net\/pcrbin\/jobboard.aspx\?action=detail&recordid=181695420516944&pcr-id=.+$/,
          ),
          location: 'Port of Spain',
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

  describe('Scraping WebFx', () => {
    beforeAll(() => {
      jest.spyOn(global, 'fetch').mockImplementation(
        jest.fn(() =>
          Promise.resolve({
            text: () => Promise.resolve<string>(webfxMarkup),
          }),
        ) as jest.Mock,
      );
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should call fetch', async () => {
      jest.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(true);

      await service.scrapeWebFx();

      expect(global.fetch).toBeCalledTimes(1);
    });

    it('should check if job already exists', async () => {
      jest.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(true);
      jest.spyOn(mockPrismaService.job, 'create').mockResolvedValue(undefined);

      await service.scrapeWebFx();

      expect(mockPrismaService.job.findUnique).toBeCalledTimes(1);
      expect(mockPrismaService.job.create).not.toBeCalled();
    });

    it('should write to database if it does not already exist', async () => {
      jest.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(false);
      jest.spyOn(mockPrismaService.job, 'create').mockResolvedValue(undefined);

      await service.scrapeWebFx();

      expect(mockPrismaService.job.findUnique).toBeCalledTimes(1);
      expect(mockPrismaService.job.create).toBeCalledTimes(1);
    });

    it('should parse the given markup correctly', async () => {
      jest.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(false);
      jest.spyOn(mockPrismaService.job, 'create').mockResolvedValue(undefined);

      await service.scrapeWebFx();

      expect(mockPrismaService.job.create.mock.calls[0][0]).toStrictEqual({
        data: {
          title: 'Digital Content Producer',
          company: 'WebFx',
          description: '',
          url: 'https://webfx.co.tt/career/digital-content-producer/',
          location: 'Maraval',
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

  describe('Scraping EmployTT', () => {
    beforeAll(() => {
      jest.spyOn(global, 'fetch').mockImplementation(
        jest.fn(() =>
          Promise.resolve({
            text: () => Promise.resolve<string>(employttMarkup),
          }),
        ) as jest.Mock,
      );
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should call fetch', async () => {
      jest.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(true);

      await service.scrapeEmployTT();

      expect(global.fetch).toBeCalledTimes(1);
    });

    it('should check if job already exists', async () => {
      jest.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(true);
      jest.spyOn(mockPrismaService.job, 'create').mockResolvedValue(undefined);

      await service.scrapeEmployTT();

      expect(mockPrismaService.job.findUnique).toBeCalledTimes(1);
      expect(mockPrismaService.job.create).not.toBeCalled();
    });

    it('should write to database if it does not already exist', async () => {
      jest.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(false);
      jest.spyOn(mockPrismaService.job, 'create').mockResolvedValue(undefined);

      await service.scrapeEmployTT();

      expect(mockPrismaService.job.findUnique).toBeCalledTimes(1);
      expect(mockPrismaService.job.create).toBeCalledTimes(1);
    });

    it('should parse the given markup correctly', async () => {
      jest.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(false);
      jest.spyOn(mockPrismaService.job, 'create').mockResolvedValue(undefined);

      await service.scrapeEmployTT();

      expect(mockPrismaService.job.create.mock.calls[0][0]).toStrictEqual({
        data: {
          title: 'Records Management Specialist',
          company: 'Ministry of Sport and Community Development',
          description: '',
          url: 'https://employtt.gov.tt/jobs/view/273',
          location: 'Port of Spain',
          sector: 'PUBLIC',
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

  describe('Scraping Massy Finance', () => {
    beforeAll(() => {
      jest.spyOn(global, 'fetch').mockImplementation(
        jest.fn(() =>
          Promise.resolve({
            json: () => Promise.resolve(massyFinanceMarkup),
          }),
        ) as jest.Mock,
      );
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should call fetch', async () => {
      jest.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(true);

      await service.scrapeMassyFinance();

      expect(global.fetch).toBeCalledTimes(1);
    });

    it('should check if job already exists', async () => {
      jest.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(true);
      jest.spyOn(mockPrismaService.job, 'create').mockResolvedValue(undefined);

      await service.scrapeMassyFinance();

      expect(mockPrismaService.job.findUnique).toBeCalledTimes(1);
      expect(mockPrismaService.job.create).not.toBeCalled();
    });

    it('should write to database if it does not already exist', async () => {
      jest.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(false);
      jest.spyOn(mockPrismaService.job, 'create').mockResolvedValue(undefined);

      await service.scrapeMassyFinance();

      expect(mockPrismaService.job.findUnique).toBeCalledTimes(1);
      expect(mockPrismaService.job.create).toBeCalledTimes(1);
    });

    it('should parse the given markup correctly', async () => {
      jest.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(false);
      jest.spyOn(mockPrismaService.job, 'create').mockResolvedValue(undefined);

      await service.scrapeMassyFinance();

      expect(mockPrismaService.job.create.mock.calls[0][0]).toStrictEqual({
        data: {
          title: 'Business Development Officer',
          company: 'Massy Finance GFC Ltd',
          description: '',
          url: 'https://massyfinancegfcltd.bamboohr.com/careers/24',
          location: 'Port of Spain',
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

  describe('Scraping FCB', () => {
    beforeAll(() => {
      jest.spyOn(global, 'fetch').mockImplementation(
        jest.fn(() =>
          Promise.resolve({
            text: () => Promise.resolve(fcbMarkup),
          }),
        ) as jest.Mock,
      );
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should call fetch', async () => {
      jest.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(true);

      await service.scrapeFCB();

      expect(global.fetch).toBeCalledTimes(1);
    });

    it('should check if job already exists', async () => {
      jest.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(true);
      jest.spyOn(mockPrismaService.job, 'create').mockResolvedValue(undefined);

      await service.scrapeFCB();

      expect(mockPrismaService.job.findUnique).toBeCalledTimes(1);
      expect(mockPrismaService.job.create).not.toBeCalled();
    });

    it('should write to database if it does not already exist', async () => {
      jest.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(false);
      jest.spyOn(mockPrismaService.job, 'create').mockResolvedValue(undefined);

      await service.scrapeFCB();

      expect(mockPrismaService.job.findUnique).toBeCalledTimes(1);
      expect(mockPrismaService.job.create).toBeCalledTimes(1);
    });

    it('should parse the given markup correctly', async () => {
      jest.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(false);
      jest.spyOn(mockPrismaService.job, 'create').mockResolvedValue(undefined);

      await service.scrapeFCB();

      expect(mockPrismaService.job.create.mock.calls[0][0]).toStrictEqual({
        data: {
          title: 'PROGRAMMER ANALYST III',
          company: 'First Citizens Bank',
          description: '',
          url: 'https://careers.firstcitizenstt.com/job/Aranguez-PROGRAMMER-ANALYST-III-SJL/871087101/',
          location: 'Aranguez, SJL, TT',
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
