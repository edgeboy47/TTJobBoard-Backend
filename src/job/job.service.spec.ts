import { ConfigService } from '@nestjs/config'
import { Test, TestingModule } from '@nestjs/testing'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { PrismaService } from '../prisma/prisma.service'
import {
  caribbeanJobsMarkup,
  crsMarkup,
  employttMarkup,
  // eveAndersonMarkup,
  fcbMarkup,
  jobsTTMarkup,
  massyFinanceMarkup,
  rbcMarkup,
  // trinidadJobsMarkup,
  webfxMarkup,
} from './fixtures'
import { JobService } from './job.service'

const mockPrismaService = {
  job: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  company: {
    findUnique: vi.fn().mockResolvedValue({
      logoUrl: 'logo',
    }),
  },
}

const mockConfigService = {
  get: vi.fn(),
}

describe('JobService', () => {
  let service: JobService

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile()

    service = module.get<JobService>(JobService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
    // expect(mockPrismaService).toBeDefined()
  })

  // TODO: add tests for getAllJobs

  describe('Scraping Caribbean Jobs', () => {
    beforeAll(() => {
      vi.spyOn(service, 'getMarkupWithPuppeteer').mockResolvedValue(
        caribbeanJobsMarkup
      )
    })

    afterEach(() => vi.clearAllMocks())

    it('should get markup correctly', async () => {
      mockPrismaService.job.findUnique.mockResolvedValue(true)

      await service.scrapeCaribbeanJobs()

      expect(service.getMarkupWithPuppeteer).toHaveBeenCalledTimes(1)
      await expect(
        service.getMarkupWithPuppeteer(expect.any(String), {
          selector: expect.any(String),
        })
      ).resolves.toBe(caribbeanJobsMarkup)
    })

    it('should check if job already exists', async () => {
      mockPrismaService.job.findUnique.mockResolvedValue(true)
      mockPrismaService.job.create.mockResolvedValue(undefined)

      await service.scrapeCaribbeanJobs()

      expect(mockPrismaService.job.findUnique).toHaveBeenCalledTimes(1)
      expect(mockPrismaService.job.create).not.toHaveBeenCalled()
    })

    it('should write to database if it does not already exist', async () => {
      vi.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(false)
      vi.spyOn(mockPrismaService.job, 'create').mockResolvedValue(undefined)

      await service.scrapeCaribbeanJobs()

      expect(mockPrismaService.job.findUnique).toHaveBeenCalledTimes(1)
      expect(mockPrismaService.job.create).toHaveBeenCalledTimes(1)
    })

    it('should parse the given markup correctly', async () => {
      vi.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(false)
      vi.spyOn(mockPrismaService.job, 'create').mockResolvedValue(undefined)

      const amount = await service.scrapeCaribbeanJobs()

      expect(amount).toBe(1)
      expect(mockPrismaService.job.create.mock.calls[0][0]).toEqual({
        data: {
          title: 'Insurance Sales Representatives / Advisors',
          company: undefined,
          companyId: undefined,
          description: 'Insurance Sales Representatives / Advisors',
          url: 'https://www.caribbeanjobs.com/Insurance-Sales-Representatives-Advisors-Job-141263.aspx?p=1|application_confirmed',
          location: 'Arima/Sangre Grande / Port-of-Spain / Trincity',
          sector: 'PRIVATE',
        },
      })
    })

    it('should catch exceptions', async () => {
      vi.spyOn(mockPrismaService.job, 'findUnique').mockImplementation(() => {
        throw new Error()
      })

      expect(service.scrapeCaribbeanJobs()).resolves.toEqual(0)
    })
  })

  describe.skip('Scraping JobsTT', () => {
    beforeAll(() => {
      vi.spyOn(global, 'fetch').mockImplementation(
        vi.fn(() =>
          Promise.resolve({
            text: () => Promise.resolve<string>(jobsTTMarkup),
          })
        ) as any
      )
    })

    afterEach(() => {
      vi.clearAllMocks()
    })

    it('should call fetch', async () => {
      vi.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(true)

      await service.scrapeJobsTT()

      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('should check if job already exists', async () => {
      vi.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(true)
      vi.spyOn(mockPrismaService.job, 'create').mockResolvedValue(undefined)

      await service.scrapeJobsTT()

      expect(mockPrismaService.job.findUnique).toHaveBeenCalledTimes(1)
      expect(mockPrismaService.job.create).not.toHaveBeenCalled()
    })

    it('should write to database if it does not already exist', async () => {
      vi.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(false)
      vi.spyOn(mockPrismaService.job, 'create').mockResolvedValue(undefined)

      await service.scrapeJobsTT()

      expect(mockPrismaService.job.findUnique).toHaveBeenCalledTimes(1)
      expect(mockPrismaService.job.create).toHaveBeenCalledTimes(1)
    })

    it('should parse the given markup correctly', async () => {
      vi.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(false)
      vi.spyOn(mockPrismaService.job, 'create').mockResolvedValue(undefined)

      const amount = await service.scrapeJobsTT()

      expect(amount).toBe(1)
      expect(mockPrismaService.job.create.mock.calls[0][0]).toEqual({
        data: {
          title: 'FACILITIES MANAGER (MID SIZED RETAIL MALL)',
          company: 'Memory Bank Computers Ltd',
          description: '',
          location: 'Other',
          url: expect.stringMatching(
            /https:\/\/jobstt\.com\/job\/facilities-manager-mid-sized-retail-mall/
          ),
          sector: 'PRIVATE',
        },
      })
    })

    // TODO: figure out how to mock logger
    it.skip('should catch exceptions', async () => {
      vi.spyOn(mockPrismaService.job, 'findUnique').mockImplementation(() => {
        throw new Error()
      })

      // vi.spyOn(mockLogger, 'log');
      // vi.spyOn(mockLogger, 'error');

      await service.scrapeJobsTT()

      // expect(mockLogger.log).not.toHaveBeenCalled();
      // expect(mockLogger.error).toHaveBeenCalledTimes(1);
    })
  })

  // describe('Scraping Trinidad Jobs', () => {
  //   beforeAll(() => {
  //     jest.spyOn(global, 'fetch').mockImplementation(
  //       jest.fn(() =>
  //         Promise.resolve({
  //           text: () => Promise.resolve<string>(trinidadJobsMarkup),
  //         })
  //       ) as jest.Mock
  //     )
  //   })
  //
  //   afterEach(() => {
  //     jest.clearAllMocks()
  //   })
  //
  //   it('should call fetch', async () => {
  //     jest.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(true)
  //
  //     await service.scrapeTrinidadJobs()
  //
  //     expect(global.fetch).toHaveBeenCalledTimes(1)
  //   })
  //
  //   it('should check if job already exists', async () => {
  //     jest.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(true)
  //     jest.spyOn(mockPrismaService.job, 'create').mockResolvedValue(undefined)
  //
  //     await service.scrapeTrinidadJobs()
  //
  //     expect(mockPrismaService.job.findUnique).toHaveBeenCalledTimes(1)
  //     expect(mockPrismaService.job.create).not.toHaveBeenCalled()
  //   })
  //
  //   it('should write to database if it does not already exist', async () => {
  //     jest.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(false)
  //     jest.spyOn(mockPrismaService.job, 'create').mockResolvedValue(undefined)
  //
  //     await service.scrapeTrinidadJobs()
  //
  //     expect(mockPrismaService.job.findUnique).toHaveBeenCalledTimes(1)
  //     expect(mockPrismaService.job.create).toHaveBeenCalledTimes(1)
  //   })
  //
  //   it('should parse the given markup correctly', async () => {
  //     jest.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(false)
  //     jest.spyOn(mockPrismaService.job, 'create').mockResolvedValue(undefined)
  //
  //     const amount = await service.scrapeTrinidadJobs()
  //
  //     expect(amount).toBe(1)
  //     expect(mockPrismaService.job.create.mock.calls[0][0]).toStrictEqual({
  //       data: {
  //         title: 'Security Officer',
  //         company: 'EUROPA (Trinidad & Tobago) Ltd',
  //         description: '',
  //         location: 'NATIONWIDE',
  //         url: 'https://www.trinidadjob.com/job/security-officer-23/',
  //         sector: 'PRIVATE',
  //       },
  //     })
  //   })
  //
  //   // TODO: figure out how to mock logger
  //   it.skip('should catch exceptions', async () => {
  //     jest.spyOn(mockPrismaService.job, 'findUnique').mockImplementation(() => {
  //       throw new Error()
  //     })
  //
  //     // jest.spyOn(mockLogger, 'log');
  //     // jest.spyOn(mockLogger, 'error');
  //
  //     await service.scrapeJobsTT()
  //
  //     // expect(mockLogger.log).not.toHaveBeenCalled();
  //     // expect(mockLogger.error).toHaveBeenCalledTimes(1);
  //   })
  // })

  describe.skip('Scraping CRS', () => {
    beforeAll(() => {
      vi.spyOn(service, 'getMarkupWithPuppeteer').mockResolvedValue(crsMarkup)
    })

    afterEach(() => vi.clearAllMocks())

    it('should get markup correctly', async () => {
      vi.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(true)

      await service.scrapeCRS()

      expect(service.getMarkupWithPuppeteer).toHaveBeenCalledTimes(1)
      expect(
        service.getMarkupWithPuppeteer(expect.any(String), {
          selector: expect.any(String),
        })
      ).resolves.toBe(crsMarkup)
    })

    it('should check if job already exists', async () => {
      vi.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(true)
      vi.spyOn(mockPrismaService.job, 'create').mockResolvedValue(undefined)

      await service.scrapeCRS()

      expect(mockPrismaService.job.findUnique).toHaveBeenCalledTimes(1)
      expect(mockPrismaService.job.create).not.toHaveBeenCalled()
    })

    it('should write to database if it does not already exist', async () => {
      vi.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(false)
      vi.spyOn(mockPrismaService.job, 'create').mockResolvedValue(undefined)

      await service.scrapeCRS()

      expect(mockPrismaService.job.findUnique).toHaveBeenCalledTimes(1)
      expect(mockPrismaService.job.create).toHaveBeenCalledTimes(1)
    })

    it('should parse the given markup correctly', async () => {
      vi.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(false)
      vi.spyOn(mockPrismaService.job, 'create').mockResolvedValue(undefined)

      const amount = await service.scrapeCRS()

      expect(amount).toBe(1)
      expect(mockPrismaService.job.create.mock.calls[0][0]).toEqual({
        data: {
          title: 'Information Technology Manager',
          company: '',
          description: '',
          url: expect.stringMatching(
            /https:\/\/host.pcrecruiter.net\/pcrbin\/jobboard.aspx\?action=detail&recordid=161318495112243&pcr-id=.+$/
          ),
          location: 'Port of Spain',
          sector: 'PRIVATE',
        },
      })
    })

    // TODO: figure out how to mock logger
    it.skip('should catch exceptions', async () => {
      vi.spyOn(mockPrismaService.job, 'findUnique').mockImplementation(() => {
        throw new Error()
      })

      // vi.spyOn(mockLogger, 'log');
      // vi.spyOn(mockLogger, 'error');

      await service.scrapeCaribbeanJobs()

      // expect(mockLogger.log).not.toHaveBeenCalled();
      // expect(mockLogger.error).toHaveBeenCalledTimes(1);
    })
  })

  // describe('Scraping Eve Anderson', () => {
  //   beforeAll(() => {
  //     jest
  //       .spyOn(service, 'getMarkupWithPuppeteer')
  //       .mockResolvedValue(eveAndersonMarkup)
  //   })
  //
  //   afterEach(() => jest.clearAllMocks())
  //
  //   it('should get markup correctly', async () => {
  //     jest.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(true)
  //
  //     await service.scrapeEveAnderson()
  //
  //     expect(service.getMarkupWithPuppeteer).toHaveBeenCalledTimes(1)
  //     expect(
  //       service.getMarkupWithPuppeteer(expect.any(String), {
  //         selector: expect.any(String),
  //       })
  //     ).resolves.toBe(eveAndersonMarkup)
  //   })
  //
  //   it('should check if job already exists', async () => {
  //     jest.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(true)
  //     jest.spyOn(mockPrismaService.job, 'create').mockResolvedValue(undefined)
  //
  //     await service.scrapeEveAnderson()
  //
  //     expect(mockPrismaService.job.findUnique).toHaveBeenCalledTimes(1)
  //     expect(mockPrismaService.job.create).not.toHaveBeenCalled()
  //   })
  //
  //   it('should write to database if it does not already exist', async () => {
  //     jest.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(false)
  //     jest.spyOn(mockPrismaService.job, 'create').mockResolvedValue(undefined)
  //
  //     await service.scrapeEveAnderson()
  //
  //     expect(mockPrismaService.job.findUnique).toHaveBeenCalledTimes(1)
  //     expect(mockPrismaService.job.create).toHaveBeenCalledTimes(1)
  //   })
  //
  //   it('should parse the given markup correctly', async () => {
  //     jest.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(false)
  //     jest.spyOn(mockPrismaService.job, 'create').mockResolvedValue(undefined)
  //
  //     const amount = await service.scrapeEveAnderson()
  //
  //     expect(amount).toBe(1)
  //     expect(mockPrismaService.job.create.mock.calls[0][0]).toStrictEqual({
  //       data: {
  //         title: 'Accountant',
  //         company: '',
  //         description: '',
  //         url: expect.stringMatching(
  //           /https:\/\/host.pcrecruiter.net\/pcrbin\/jobboard.aspx\?action=detail&recordid=181695420516944&pcr-id=.+$/
  //         ),
  //         location: 'Port of Spain',
  //         sector: 'PRIVATE',
  //       },
  //     })
  //   })
  //
  //   // TODO: figure out how to mock logger
  //   it.skip('should catch exceptions', async () => {
  //     jest.spyOn(mockPrismaService.job, 'findUnique').mockImplementation(() => {
  //       throw new Error()
  //     })
  //
  //     // jest.spyOn(mockLogger, 'log');
  //     // jest.spyOn(mockLogger, 'error');
  //
  //     await service.scrapeCaribbeanJobs()
  //
  //     // expect(mockLogger.log).not.toHaveBeenCalled();
  //     // expect(mockLogger.error).toHaveBeenCalledTimes(1);
  //   })
  // })

  describe.skip('Scraping WebFx', () => {
    beforeAll(() => {
      vi.spyOn(global, 'fetch').mockImplementation(
        vi.fn(() =>
          Promise.resolve({
            text: () => Promise.resolve<string>(webfxMarkup),
          })
        ) as any
      )
    })

    afterEach(() => {
      vi.clearAllMocks()
    })

    it('should call fetch', async () => {
      vi.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(true)

      await service.scrapeWebFx()

      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('should check if job already exists', async () => {
      vi.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(true)
      vi.spyOn(mockPrismaService.job, 'create').mockResolvedValue(undefined)

      await service.scrapeWebFx()

      expect(mockPrismaService.job.findUnique).toHaveBeenCalledTimes(1)
      expect(mockPrismaService.job.create).not.toHaveBeenCalled()
    })

    it('should write to database if it does not already exist', async () => {
      vi.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(false)
      vi.spyOn(mockPrismaService.job, 'create').mockResolvedValue(undefined)

      await service.scrapeWebFx()

      expect(mockPrismaService.job.findUnique).toHaveBeenCalledTimes(1)
      expect(mockPrismaService.job.create).toHaveBeenCalledTimes(1)
    })

    it('should parse the given markup correctly', async () => {
      vi.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(false)
      vi.spyOn(mockPrismaService.job, 'create').mockResolvedValue(undefined)

      const amount = await service.scrapeWebFx()

      expect(amount).toBe(1)
      expect(mockPrismaService.job.create.mock.calls[0][0]).toEqual({
        data: {
          title: 'Digital Content Producer',
          company: 'WebFx',
          description: '',
          url: 'https://webfx.co.tt/career/digital-content-producer/',
          location: 'Maraval',
          sector: 'PRIVATE',
        },
      })
    })

    // TODO: figure out how to mock logger
    it.skip('should catch exceptions', async () => {
      vi.spyOn(mockPrismaService.job, 'findUnique').mockImplementation(() => {
        throw new Error()
      })

      // vi.spyOn(mockLogger, 'log');
      // vi.spyOn(mockLogger, 'error');

      await service.scrapeCaribbeanJobs()

      // expect(mockLogger.log).not.toHaveBeenCalled();
      // expect(mockLogger.error).toHaveBeenCalledTimes(1);
    })
  })

  describe.skip('Scraping EmployTT', () => {
    beforeAll(() => {
      vi.spyOn(global, 'fetch').mockImplementation(
        vi.fn(() =>
          Promise.resolve({
            text: () => Promise.resolve<string>(employttMarkup),
          })
        ) as any
      )
    })

    afterEach(() => {
      vi.clearAllMocks()
    })

    it('should call fetch', async () => {
      vi.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(true)

      await service.scrapeEmployTT()

      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('should check if job already exists', async () => {
      vi.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(true)
      vi.spyOn(mockPrismaService.job, 'create').mockResolvedValue(undefined)

      await service.scrapeEmployTT()

      expect(mockPrismaService.job.findUnique).toHaveBeenCalledTimes(1)
      expect(mockPrismaService.job.create).not.toHaveBeenCalled()
    })

    it('should write to database if it does not already exist', async () => {
      vi.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(false)
      vi.spyOn(mockPrismaService.job, 'create').mockResolvedValue(undefined)

      await service.scrapeEmployTT()

      expect(mockPrismaService.job.findUnique).toHaveBeenCalledTimes(1)
      expect(mockPrismaService.job.create).toHaveBeenCalledTimes(1)
    })

    it('should parse the given markup correctly', async () => {
      vi.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(false)
      vi.spyOn(mockPrismaService.job, 'create').mockResolvedValue(undefined)

      const amount = await service.scrapeEmployTT()

      expect(amount).toBe(1)
      expect(mockPrismaService.job.create.mock.calls[0][0]).toEqual({
        data: {
          title: 'Records Management Specialist',
          company: 'Ministry of Sport and Community Development',
          description: '',
          url: 'https://employtt.gov.tt/jobs/view/273',
          location: 'Port of Spain',
          sector: 'PUBLIC',
        },
      })
    })

    // TODO: figure out how to mock logger
    it.skip('should catch exceptions', async () => {
      vi.spyOn(mockPrismaService.job, 'findUnique').mockImplementation(() => {
        throw new Error()
      })

      // vi.spyOn(mockLogger, 'log');
      // vi.spyOn(mockLogger, 'error');

      await service.scrapeCaribbeanJobs()

      // expect(mockLogger.log).not.toHaveBeenCalled();
      // expect(mockLogger.error).toHaveBeenCalledTimes(1);
    })
  })

  describe.skip('Scraping Massy Finance', () => {
    beforeAll(() => {
      vi.spyOn(global, 'fetch').mockImplementation(
        vi.fn(() =>
          Promise.resolve({
            json: () => Promise.resolve(massyFinanceMarkup),
          })
        ) as any
      )
    })

    afterEach(() => {
      vi.clearAllMocks()
    })

    it('should call fetch', async () => {
      vi.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(true)

      await service.scrapeMassyFinance()

      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('should check if job already exists', async () => {
      vi.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(true)
      vi.spyOn(mockPrismaService.job, 'create').mockResolvedValue(undefined)

      await service.scrapeMassyFinance()

      expect(mockPrismaService.job.findUnique).toHaveBeenCalledTimes(1)
      expect(mockPrismaService.job.create).not.toHaveBeenCalled()
    })

    it('should write to database if it does not already exist', async () => {
      vi.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(false)
      vi.spyOn(mockPrismaService.job, 'create').mockResolvedValue(undefined)

      await service.scrapeMassyFinance()

      expect(mockPrismaService.job.findUnique).toHaveBeenCalledTimes(1)
      expect(mockPrismaService.job.create).toHaveBeenCalledTimes(1)
    })

    it('should parse the given markup correctly', async () => {
      vi.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(false)
      vi.spyOn(mockPrismaService.job, 'create').mockResolvedValue(undefined)

      const amount = await service.scrapeMassyFinance()

      expect(amount).toBe(1)
      expect(mockPrismaService.job.create.mock.calls[0][0]).toEqual({
        data: {
          title: 'Business Development Officer',
          company: 'Massy Finance GFC Ltd',
          description: '',
          url: 'https://massyfinancegfcltd.bamboohr.com/careers/24',
          location: 'Port of Spain',
          sector: 'PRIVATE',
        },
      })
    })

    // TODO: figure out how to mock logger
    it.skip('should catch exceptions', async () => {
      vi.spyOn(mockPrismaService.job, 'findUnique').mockImplementation(() => {
        throw new Error()
      })

      // vi.spyOn(mockLogger, 'log');
      // vi.spyOn(mockLogger, 'error');

      await service.scrapeCaribbeanJobs()

      // expect(mockLogger.log).not.toHaveBeenCalled();
      // expect(mockLogger.error).toHaveBeenCalledTimes(1);
    })
  })

  describe.skip('Scraping FCB', () => {
    beforeAll(() => {
      vi.spyOn(global, 'fetch').mockImplementation(
        vi.fn(() =>
          Promise.resolve({
            text: () => Promise.resolve(fcbMarkup),
          })
        ) as any
      )
    })

    afterEach(() => {
      vi.clearAllMocks()
    })

    it('should call fetch', async () => {
      vi.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(true)

      await service.scrapeFCB()

      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('should check if job already exists', async () => {
      vi.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(true)
      vi.spyOn(mockPrismaService.job, 'create').mockResolvedValue(undefined)

      await service.scrapeFCB()

      expect(mockPrismaService.job.findUnique).toHaveBeenCalledTimes(1)
      expect(mockPrismaService.job.create).not.toHaveBeenCalled()
    })

    it('should write to database if it does not already exist', async () => {
      vi.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(false)
      vi.spyOn(mockPrismaService.job, 'create').mockResolvedValue(undefined)

      await service.scrapeFCB()

      expect(mockPrismaService.job.findUnique).toHaveBeenCalledTimes(1)
      expect(mockPrismaService.job.create).toHaveBeenCalledTimes(1)
    })

    it('should parse the given markup correctly', async () => {
      vi.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(false)
      vi.spyOn(mockPrismaService.job, 'create').mockResolvedValue(undefined)

      const amount = await service.scrapeFCB()

      expect(amount).toBe(1)
      expect(mockPrismaService.job.create.mock.calls[0][0]).toEqual({
        data: {
          title: 'PROGRAMMER ANALYST III',
          company: 'First Citizens Bank',
          description: '',
          url: 'https://careers.firstcitizenstt.com/job/Aranguez-PROGRAMMER-ANALYST-III-SJL/871087101/',
          location: 'Aranguez, SJL, TT',
          sector: 'PRIVATE',
        },
      })
    })

    // TODO: figure out how to mock logger
    it.skip('should catch exceptions', async () => {
      vi.spyOn(mockPrismaService.job, 'findUnique').mockImplementation(() => {
        throw new Error()
      })

      // vi.spyOn(mockLogger, 'log');
      // vi.spyOn(mockLogger, 'error');

      await service.scrapeCaribbeanJobs()

      // expect(mockLogger.log).not.toHaveBeenCalled();
      // expect(mockLogger.error).toHaveBeenCalledTimes(1);
    })
  })

  describe.skip('Scraping RBC', () => {
    beforeAll(() => {
      vi.spyOn(global, 'fetch').mockImplementation(
        vi.fn(() =>
          Promise.resolve({
            json: () => Promise.resolve(rbcMarkup),
          })
        ) as any
      )
    })

    afterEach(() => {
      vi.clearAllMocks()
    })

    it('should call fetch', async () => {
      vi.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(true)

      await service.scrapeRBC()

      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('should check if job already exists', async () => {
      vi.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(true)
      vi.spyOn(mockPrismaService.job, 'create').mockResolvedValue(undefined)

      await service.scrapeRBC()

      expect(mockPrismaService.job.findUnique).toHaveBeenCalledTimes(1)
      expect(mockPrismaService.job.create).not.toHaveBeenCalled()
    })

    it('should write to database if it does not already exist', async () => {
      vi.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(false)
      vi.spyOn(mockPrismaService.job, 'create').mockResolvedValue(undefined)

      await service.scrapeRBC()

      expect(mockPrismaService.job.findUnique).toHaveBeenCalledTimes(1)
      expect(mockPrismaService.job.create).toHaveBeenCalledTimes(1)
    })

    it('should parse the given markup correctly', async () => {
      vi.spyOn(mockPrismaService.job, 'findUnique').mockResolvedValue(false)
      vi.spyOn(mockPrismaService.job, 'create').mockResolvedValue(undefined)

      const amount = await service.scrapeRBC()

      expect(amount).toBe(1)
      expect(mockPrismaService.job.create.mock.calls[0][0]).toEqual({
        data: {
          title: 'Account Manager',
          company: 'Royal Bank of Canada',
          description:
            'In this role you will provide investment solutions and advice to a pool of 75+ net-worth and institutional clients of RBC Investment Management (Caribbean) Limited and act as primary contact for the client...',
          url: 'https://jobs.rbc.com/ca/en/job/R-0000039022',
          location: 'Port of Spain',
          sector: 'PRIVATE',
        },
      })
    })

    // TODO: figure out how to mock logger
    it.skip('should catch exceptions', async () => {
      vi.spyOn(mockPrismaService.job, 'findUnique').mockImplementation(() => {
        throw new Error()
      })

      // vi.spyOn(mockLogger, 'log');
      // vi.spyOn(mockLogger, 'error');

      await service.scrapeCaribbeanJobs()

      // expect(mockLogger.log).not.toHaveBeenCalled();
      // expect(mockLogger.error).toHaveBeenCalledTimes(1);
    })
  })
})
