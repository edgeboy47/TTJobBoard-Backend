import { Test, TestingModule } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { JobController } from './job.controller'
import { JobService } from './job.service'

describe('JobController', () => {
  let controller: JobController
  const mockJobService = {
    findAll: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JobController],
      providers: [
        {
          provide: JobService,
          useValue: mockJobService,
        },
      ],
    }).compile()

    controller = module.get<JobController>(JobController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })
})
