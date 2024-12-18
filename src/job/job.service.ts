import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { Job } from '@prisma/client'
import * as cheerio from 'cheerio'
import puppeteer from 'puppeteer'
import { PrismaService } from '../prisma/prisma.service'

export type JobApiResponse = {
  data: Job[]
  meta: {
    currentPage: number
    totalPages: number
    totalItems: number
  }
}
@Injectable()
export class JobService {
  constructor(private readonly prisma: PrismaService) {}
  private readonly logger = new Logger(JobService.name)
  JOB_MONTH_LIMIT = 3

  async getAllJobs(
    perPage?: number,
    page?: number,
    title?: string,
    company?: string
  ): Promise<JobApiResponse> {
    try {
      const limit = perPage || 15
      const offset = limit * (page - 1) || 0

      const data = await this.prisma.job.findMany({
        skip: offset,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        where: {
          title: {
            contains: title || '',
            mode: 'insensitive',
          },

          company: {
            contains: company || '',
            mode: 'insensitive',
          },
        },
      })

      const totalItems = await this.prisma.job.count({
        where: {
          title: {
            contains: title || '',
            mode: 'insensitive',
          },

          company: {
            contains: company || '',
            mode: 'insensitive',
          },
        },
      })
      const totalPages = Math.ceil(totalItems / limit)

      return {
        data,
        meta: {
          currentPage: page || 1,
          totalItems,
          totalPages,
        },
      }
    } catch (e) {
      this.logger.error(`Error getting all jobs: ${e}`)
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async keepAlive() {
    await this.prisma.job.count()
  }

  // Gets HTML for dynamic pages
  async getMarkupWithPuppeteer(
    url: string,
    options?: { selector?: string; iframeName?: string }
  ): Promise<string> {
    const browser = await puppeteer.launch()
    const page = await browser.newPage()
    let body = ''

    try {
      this.logger.log('Retrieving markup using Puppeteer')

      await page.goto(url)

      // If the page has to load an iframe
      if (options.iframeName) {
        const frame = page
          .frames()
          .find(frame => frame.name() === options.iframeName)
        body = await frame.content()
      }

      // Wait for possible scrape protection timeout
      if (options.selector) {
        await page.waitForSelector(options.selector, { timeout: 30000 })
        body = await page.content()
      }

      this.logger.log('Markup retrieved successfully')
    } catch (e) {
      this.logger.error(`Failed to retrieve markup using Puppeteer: ${e}`)
    } finally {
      await page.close()
      await browser.close()

      return body
    }
  }

  // Helper function that adds a job to the database and returns whether it was successful
  async addJobToDatabase(job: Job): Promise<boolean> {
    const { title, company, description, url, location, sector } = job

    // Check if job listing already exists
    const exists = await this.prisma.job.findUnique({
      where: {
        title_company: {
          title,
          company,
        },
      },
    })

    if (!exists) {
      await this.prisma.job.create({
        data: {
          title,
          company,
          description,
          url,
          location,
          sector,
        },
      })
    }

    return !exists
  }

  @Cron(CronExpression.EVERY_HOUR)
  async runScrapers() {
    this.logger.log('Running all scrapers')
    let total = 0

    total += await this.scrapeCaribbeanJobs()
    total += await this.scrapeJobsTT()
    total += await this.scrapeTrinidadJobs()
    total += await this.scrapeCRS();
    total += await this.scrapeEveAnderson();
    total += await this.scrapeWebFx()
    total += await this.scrapeEmployTT()
    total += await this.scrapeMassyFinance()
    total += await this.scrapeFCB()
    total += await this.scrapeRBC()

    this.logger.log(
      `Finished running all scrapers. ${total} total new job${
        total === 1 ? '' : 's'
      } added`
    )
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async deleteOutdatedJobs() {
    try {
      // Delete jobs older than 3 months
      const dateCutOff: Date = new Date()
      dateCutOff.setMonth(dateCutOff.getMonth() - this.JOB_MONTH_LIMIT)

      this.logger.log(`Deleting jobs older than ${dateCutOff}`)

      const { count: numDeleted } = await this.prisma.job.deleteMany({
        where: {
          createdAt: {
            lte: dateCutOff,
          },
        },
      })

      this.logger.log(`${numDeleted} outdated jobs deleted`)
    } catch (e) {
      this.logger.error(`Failed to delete outdated jobs: ${e}`)
    }
  }

  async scrapeCaribbeanJobs(): Promise<number> {
    const baseURL = 'https://www.caribbeanjobs.com'
    const url =
      'https://www.caribbeanjobs.com/ShowResults.aspx?Keywords=&autosuggestEndpoint=%2fautosuggest&Location=124&Category=&Recruiter=Company%2cAgency&btnSubmit=Search&PerPage=100'
    let newJobs = 0

    try {
      this.logger.log('Scraping Caribbean Jobs')

      // TODO it might be possible to get markup using fetch if Referer header is set to homepage url or to "none"
      // TODO: opening links for this site in development gives a 403 error because Referer header is set to localhost
      // Retrieve markup from CaribbeanJobs website
      const body = await this.getMarkupWithPuppeteer(url, {
        selector: '.two-thirds',
      })

      // Scrape the body markup
      const $ = cheerio.load(body)
      const jobs = $('.job-result>.module-content')

      this.logger.log(`${jobs.length} job${jobs.length === 1 ? '' : 's'} found`)

      for (const el of jobs.toArray().reverse()) {
        const job = $(el)
        const title = job.find('.job-result-title>h2').text().trim()
        const company = job.find('.job-result-title>h3').text().trim()
        const jobURL = job.find('.job-result-title>h2>a').attr('href')
        const description = job.find('p>span').text().trim()
        const location = job
          .find('.job-result-overview>.job-overview>li.location>a')
          .map((i, el) => $(el).text().trim())
          .toArray()
          .join(' / ')

        if (
          await this.addJobToDatabase({
            title,
            company,
            description,
            location,
            url: `${baseURL}${jobURL}`,
            sector: 'PRIVATE',
            createdAt: null,
            expiresAt: null,
          })
        )
          newJobs++
      }

      this.logger.log(
        `Finished scraping Caribbean Jobs. ${newJobs} new job${
          newJobs === 1 ? '' : 's'
        } added.`
      )
    } catch (e) {
      this.logger.error(`Error scraping Caribbean Jobs: ${e}`)
    }
    return newJobs
  }

  async scrapeJobsTT(): Promise<number> {
    const url =
      'https://jobstt.com/search-results-jobs/?searchId=1668009993.4696&action=search&page=1&listings_per_page=100&view=list'
    let newJobs = 0

    try {
      this.logger.log('Scraping JobsTT')

      const res = await fetch(url)
      const body = await res.text()

      const $ = cheerio.load(body)

      const jobs = $('.listone')

      this.logger.log(`${jobs.length} job${jobs.length === 1 ? '' : 's'} found`)

      for (const el of jobs.toArray().reverse()) {
        const job = $(el)
        const title = job.find('.list1right>h1>a>strong').text().trim()
        const company = job.find('.list1right>h1>small').text().trim()
        const jobUrl = job.find('.list1right>h1>a').attr('href')
        const description = ''

        if (
          await this.addJobToDatabase({
            title,
            company,
            description,
            location: null,
            url: jobUrl,
            sector: 'PRIVATE',
            createdAt: null,
            expiresAt: null,
          })
        )
          newJobs++
      }

      this.logger.log(
        `Finished scraping JobsTT. ${newJobs} new job${
          newJobs === 1 ? '' : 's'
        } added.`
      )
      return newJobs
    } catch (e) {
      this.logger.error(`Error scraping JobsTT: ${e}`)
      return newJobs
    }
  }

  async scrapeTrinidadJobs(): Promise<number> {
    const url =
      'https://www.trinidadjob.com/jobs/?keyword=&iwj_location=&iwj_cat=&iwj_type=&iwj_skill=&iwj_level=&iwj_salary='
    let newJobs = 0

    try {
      this.logger.log('Scraping Trinidad Jobs')

      const res = await fetch(url)
      const body = await res.text()

      const $ = cheerio.load(body)

      const jobs = $('.job-item')

      this.logger.log(`${jobs.length} job${jobs.length === 1 ? '' : 's'} found`)

      for (const el of jobs.toArray().reverse()) {
        const job = $(el)
        const title = job
          .find('.job-content-wrap>.job-info>.job-title>a')
          .text()
          .trim()
        const company = job
          .find('.job-content-wrap>.job-info>.info-company>.company>a')
          .text()
          .trim()
        const location = job
          .find(
            '.job-content-wrap>.job-info>.info-company>.address>span>span>span:first-child'
          )
          .text()
          .trim()
        const jobURL = job
          .find('.job-content-wrap>.job-info>.job-title>a')
          .attr('href')
        const description = ''

        if (
          await this.addJobToDatabase({
            title,
            company,
            description,
            location,
            url: jobURL,
            sector: 'PRIVATE',
            createdAt: null,
            expiresAt: null,
          })
        )
          newJobs++
      }

      this.logger.log(
        `Finished scraping Trinidad Jobs. ${newJobs} new job${
          newJobs === 1 ? '' : 's'
        } added.`
      )
      return newJobs
    } catch (e) {
      this.logger.error(`Error scraping Trinidad Jobs: ${e}`)
      return newJobs
    }
  }

  async scrapeCRS(): Promise<number> {
    const url = 'https://www.crsrecruitment.co.tt/jobs/'
    let newJobs = 0

    try {
      this.logger.log('Scraping CRS')
      const body = await this.getMarkupWithPuppeteer(url, {
        iframeName: 'pcrframe',
      })

      const $ = cheerio.load(body)
      const jobs = $('table.table-condensed>tbody>tr')

      this.logger.log(`${jobs.length} job${jobs.length === 1 ? '' : 's'} found`)

      for (const el of jobs.toArray().reverse()) {
        const job = $(el)

        const title = job.find('.td_jobtitle>a').text().trim()
        const company = ''
        const description = ''
        const jobURL = job.find('.td_jobtitle>a').attr('href')
        const location = job.find('.td_location>span').text().trim()

        if (
          await this.addJobToDatabase({
            title,
            company,
            description,
            location,
            url: `https://host.pcrecruiter.net${jobURL}`,
            sector: 'PRIVATE',
            createdAt: null,
            expiresAt: null,
          })
        )
          newJobs++
      }

      this.logger.log(
        `Finished scraping CRS. ${newJobs} new job${
          newJobs === 1 ? '' : 's'
        } added.`
      )
      return newJobs
    } catch (e) {
      this.logger.error(`Error scraping CRS: ${e}`)
      return newJobs
    }
  }

  async scrapeEveAnderson(): Promise<number> {
    const url = 'https://www.eveandersonrecruitment.com/jobs-2/'
    let newJobs = 0

    try {
      this.logger.log('Scraping Eve Anderson')
      const body = await this.getMarkupWithPuppeteer(url, {
        iframeName: 'pcrframe',
      })

      const $ = cheerio.load(body)
      const jobs = $('table.table-condensed>tbody>tr')

      this.logger.log(`${jobs.length} job${jobs.length === 1 ? '' : 's'} found`)
      for (const el of jobs.toArray().reverse()) {
        const job = $(el)

        const title = job.find('.td_jobtitle>a').text().trim()
        const company = ''
        const description = ''
        const jobURL = job.find('.td_jobtitle>a').attr('href')
        const location = job.find('.td_location>span').text().trim()

        if (
          await this.addJobToDatabase({
            title,
            company,
            description,
            location,
            url: `https://host.pcrecruiter.net${jobURL}`,
            sector: 'PRIVATE',
            createdAt: null,
            expiresAt: null,
          })
        )
          newJobs++
      }

      this.logger.log(
        `Finished scraping Eve Anderson. ${newJobs} new job${
          newJobs === 1 ? '' : 's'
        } added.`
      )
      return newJobs
    } catch (e) {
      this.logger.error(`Error scraping Eve Anderson: ${e}`)
      return newJobs
    }
  }

  async scrapeWebFx(): Promise<number> {
    const url = 'https://webfx.co.tt/careers/'
    let newJobs = 0

    try {
      this.logger.log('Scraping WebFx')

      const res = await fetch(url)
      const body = await res.text()

      const $ = cheerio.load(body)
      const jobs = $('.awsm-job-listing-item')

      this.logger.log(`${jobs.length} job${jobs.length === 1 ? '' : 's'} found`)

      for (const el of jobs) {
        const job = $(el)
        const title = job.find('.awsm-job-post-title').text().trim()
        const company = 'WebFx'
        const description = ''
        const location = 'Maraval'
        const jobURL = job.find('.awsm-job-item').attr('href')

        if (
          await this.addJobToDatabase({
            title,
            company,
            description,
            location,
            url: jobURL,
            sector: 'PRIVATE',
            createdAt: null,
            expiresAt: null,
          })
        )
          newJobs++
      }

      this.logger.log(
        `Finished scraping WebFx. ${newJobs} new job${
          newJobs === 1 ? '' : 's'
        } added`
      )
      return newJobs
    } catch (e) {
      this.logger.error(`Error scraping WebFx: ${e}`)
      return newJobs
    }
  }

  async scrapeEmployTT(): Promise<number> {
    const url = 'https://employtt.gov.tt/'
    let newJobs = 0

    try {
      this.logger.log('Scraping EmployTT')

      const res = await fetch(url)
      const body = await res.text()

      const $ = cheerio.load(body)
      const jobs = $(
        'div.job-section.section > div > div:nth-child(2) > .col-lg-12'
      )

      this.logger.log(`${jobs.length} job${jobs.length === 1 ? '' : 's'} found`)

      for (const el of jobs) {
        const job = $(el)
        const title = job.find('h3.job-title').text().trim()
        const jobURL = job.find('h3.job-title > a').attr('href')
        const location = job
          .find('.job-meta-two > .field-map > a')
          .text()
          .trim()
        const company = job.find('.employer-name').text().trim()
        const description = ''

        if (
          await this.addJobToDatabase({
            title,
            company,
            description,
            location,
            url: jobURL,
            sector: 'PUBLIC',
            createdAt: null,
            expiresAt: null,
          })
        )
          newJobs++
      }

      this.logger.log(
        `Finished scraping EmployTT. ${newJobs} new job${
          newJobs === 1 ? '' : 's'
        } added`
      )
    } catch (e) {
      this.logger.error(`Error scraping EmployTT: ${e}`)
    }

    return newJobs
  }

  async scrapeMassyFinance(): Promise<number> {
    const url = 'https://massyfinancegfcltd.bamboohr.com/careers/list'

    let newJobs = 0

    try {
      this.logger.log('Scraping Massy Finance')

      const res = await fetch(url, {
        headers: {
          Referer: 'https://massyfinancegfcltd.bamboohr.com/careers',
        },
      })

      const body = await res.json()

      this.logger.log(
        `${body.meta.totalCount} job${
          body.meta.totalCount === 1 ? '' : 's'
        } found.`
      )
      const jobs = body.result

      for (const job of jobs) {
        const title = job.jobOpeningName
        const description = ''
        const jobURL = `https://massyfinancegfcltd.bamboohr.com/careers/${job.id}`
        const location = job.location.city
        const company = 'Massy Finance GFC Ltd'

        if (
          await this.addJobToDatabase({
            title,
            company,
            description,
            location,
            url: jobURL,
            sector: 'PRIVATE',
            createdAt: null,
            expiresAt: null,
          })
        )
          newJobs++
      }

      this.logger.log(
        `Finished scraping Massy Finance. ${newJobs} new job${
          newJobs === 1 ? '' : 's'
        } added`
      )
    } catch (e) {
      this.logger.error(`Error scraping Massy Finance: ${e}`)
    }

    return newJobs
  }

  async scrapeFCB(): Promise<number> {
    const url =
      'https://careers.firstcitizenstt.com/search/?createNewAlert=false&q=&optionsFacetsDD_country=TT'
    let newJobs = 0

    try {
      this.logger.log('Scraping FCB')

      const res = await fetch(url)
      const body = await res.text()

      const $ = cheerio.load(body)
      const jobs = $('table#searchresults > tbody > tr.data-row')

      this.logger.log(
        `${jobs.length} job${jobs.length === 1 ? '' : 's'} found.`
      )

      for (const el of jobs) {
        const job = $(el)
        const title = job.find('.hidden-phone > .jobTitle-link').text().trim()
        const jobURL = job.find('.hidden-phone > .jobTitle-link').attr('href')
        const description = ''
        const company = 'First Citizens Bank'
        const location = job
          .find('.hidden-phone > span.jobLocation')
          .text()
          .trim()

        if (
          await this.addJobToDatabase({
            title,
            company,
            description,
            location,
            url: `https://careers.firstcitizenstt.com${jobURL}`,
            sector: 'PRIVATE',
            createdAt: null,
            expiresAt: null,
          })
        )
          newJobs++
      }

      this.logger.log(
        `Finished scraping FCB. ${newJobs} new job${
          newJobs === 1 ? '' : 's'
        } added`
      )
    } catch (e) {
      this.logger.error(`Error scraping FCB: ${e}`)
    }

    return newJobs
  }

  async scrapeRBC(): Promise<number> {
    const url = 'https://jobs.rbc.com/widgets'
    let newJobs = 0

    try {
      this.logger.log('Scraping RBC')

      const res = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        method: 'post',
        body: JSON.stringify({
          lang: 'en_ca',
          deviceType: 'desktop',
          country: 'ca',
          pageName: 'search-results',
          ddoKey: 'refineSearch',
          sortBy: '',
          subsearch: '',
          from: 0,
          jobs: true,
          counts: true,
          all_fields: [
            'category',
            'subCategory',
            'platform',
            'careerLevel',
            'type',
            'jobType',
            'country',
            'state',
            'city',
          ],
          size: 10,
          clearAll: false,
          jdsource: 'facets',
          isSliderEnable: false,
          pageId: 'page35',
          siteType: 'external',
          keywords: '',
          global: true,
          selected_fields: {
            country: ['Trinidad and Tobago'],
          },
          locationData: {},
        }),
      })

      const body = await res.json()

      const length = body.refineSearch.totalHits

      this.logger.log(`${length} job${length === 1 ? '' : 's'} found.`)

      for (const job of body.refineSearch.data.jobs) {
        const title = job.title
        const company = 'Royal Bank of Canada'
        const description = job.descriptionTeaser
        const jobURL = `https://jobs.rbc.com/ca/en/job/${job.jobId}`
        const location = job.city

        if (
          await this.addJobToDatabase({
            title,
            company,
            description,
            location,
            url: jobURL,
            sector: 'PRIVATE',
            createdAt: null,
            expiresAt: null,
          })
        )
          newJobs++
      }

      this.logger.log(
        `Finished scraping RBC. ${newJobs} new job${
          newJobs === 1 ? '' : 's'
        } added`
      )
    } catch (e) {
      this.logger.error(`Error scraping RBC: ${e}`)
    }

    return newJobs
  }
}
