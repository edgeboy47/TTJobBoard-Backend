import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

@Injectable()
export class JobService {
  constructor(private readonly prisma: PrismaService) {}
  private readonly logger = new Logger(JobService.name);

  async getAllJobs() {
    return this.prisma.job.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // Gets HTML for dynamic pages
  async getMarkupWithPuppeteer(
    url: string,
    options?: { selector?: string; iframeName?: string },
  ): Promise<string> {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    let body = '';

    try {
      this.logger.log('Retrieving markup using Puppeteer');

      await page.goto(url);

      // If the page has to load an iframe
      if (options.iframeName) {
        const frame = page
          .frames()
          .find((frame) => frame.name() === options.iframeName);
        body = await frame.content();
      }

      // Wait for possible scrape protection timeout
      if (options.selector) {
        await page.waitForSelector(options.selector, { timeout: 10000 });
        body = await page.content();
      }

      this.logger.log('Markup retrieved successfully');
    } catch (e) {
      this.logger.error(`Failed to retrieve markup using Puppeteer: ${e}`);
    } finally {
      await page.close();
      await browser.close();

      return body;
    }
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async runScrapers() {
    this.logger.log('Running all scrapers');

    await this.scrapeCaribbeanJobs();
    await this.scrapeJobsTT();
    await this.scrapeTrinidadJobs();
    await this.scrapeCRS();
    await this.scrapeEveAnderson();
    await this.scrapeWebFx();

    this.logger.log('Finished running all scrapers');
  }

  async scrapeCaribbeanJobs() {
    const baseURL = 'https://www.caribbeanjobs.com';
    const url =
      'https://www.caribbeanjobs.com/ShowResults.aspx?Keywords=&autosuggestEndpoint=%2fautosuggest&Location=124&Category=&Recruiter=Company%2cAgency&btnSubmit=Search&PerPage=100';
    let newJobs = 0;

    try {
      this.logger.log('Scraping Caribbean Jobs');

      // Retrieve markup from CaribbeanJobs website
      const body = await this.getMarkupWithPuppeteer(url, {
        selector: '.two-thirds',
      });

      // Scrape the body markup
      const $ = cheerio.load(body);
      const jobs = $('.job-result>.module-content');

      this.logger.log(`${jobs.length} jobs found`);

      for (const el of jobs.toArray().reverse()) {
        const job = $(el);
        const title = job.find('.job-result-title>h2').text().trim();
        const company = job.find('.job-result-title>h3').text().trim();
        const jobURL = job.find('.job-result-title>h2>a').attr('href');
        const description = job.find('p>span').text().trim();
        const location = job
          .find('.job-result-overview>.job-overview>li.location>a')
          .map((i, el) => $(el).text().trim())
          .toArray()
          .join(' / ');

        // Check if job listing already exists
        const exists = await this.prisma.job.findUnique({
          where: {
            title_company: {
              title,
              company,
            },
          },
        });

        if (!exists) {
          await this.prisma.job.create({
            data: {
              title,
              company,
              description,
              url: `${baseURL}${jobURL}`,
              location,
              sector: 'PRIVATE',
            },
          });

          ++newJobs;
        }
      }

      this.logger.log(
        `Finished scraping Caribbean Jobs. ${newJobs} new jobs added.`,
      );
    } catch (e) {
      this.logger.error(`Error scraping Caribbean Jobs: ${e}`);
    }
  }

  async scrapeJobsTT() {
    const url =
      'https://jobstt.com/search-results-jobs/?searchId=1668009993.4696&action=search&page=1&listings_per_page=100&view=list';

    try {
      this.logger.log('Scraping JobsTT');

      const res = await fetch(url);
      const body = await res.text();
      let newJobs = 0;

      const $ = cheerio.load(body);

      const jobs = $('.listone');

      this.logger.log(`${jobs.length} jobs found`);

      for (const el of jobs.toArray().reverse()) {
        const job = $(el);
        const title = job.find('.list1right>h1>a>strong').text().trim();
        const company = job.find('.list1right>h1>small').text().trim();
        const jobUrl = job.find('.list1right>h1>a').attr('href');
        const description = '';

        // Check if job listing already exists
        const exists = await this.prisma.job.findUnique({
          where: {
            title_company: {
              title,
              company,
            },
          },
        });

        if (!exists) {
          await this.prisma.job.create({
            data: {
              title,
              company,
              description,
              url: jobUrl,
              sector: 'PRIVATE',
            },
          });

          ++newJobs;
        }
      }

      this.logger.log(`Finished scraping JobsTT. ${newJobs} new jobs added.`);
    } catch (e) {
      this.logger.error(`Error scraping JobsTT: ${e}`);
    }
  }

  async scrapeTrinidadJobs() {
    const url =
      'https://www.trinidadjob.com/jobs/?keyword=&iwj_location=&iwj_cat=&iwj_type=&iwj_skill=&iwj_level=&iwj_salary=';

    try {
      let newJobs = 0;
      this.logger.log('Scraping Trinidad Jobs');

      const res = await fetch(url);
      const body = await res.text();

      const $ = cheerio.load(body);

      const jobs = $('.job-item');

      this.logger.log(`${jobs.length} jobs found`);

      for (const el of jobs.toArray().reverse()) {
        const job = $(el);
        const title = job
          .find('.job-content-wrap>.job-info>.job-title>a')
          .text()
          .trim();
        const company = job
          .find('.job-content-wrap>.job-info>.info-company>.company>a')
          .text()
          .trim();
        const location = job
          .find(
            '.job-content-wrap>.job-info>.info-company>.address>span>span>span:first-child',
          )
          .text()
          .trim();
        const jobURL = job
          .find('.job-content-wrap>.job-info>.job-title>a')
          .attr('href');
        const description = '';

        // Check if job listing already exists
        const exists = await this.prisma.job.findUnique({
          where: {
            title_company: {
              title,
              company,
            },
          },
        });

        if (!exists) {
          await this.prisma.job.create({
            data: {
              title,
              company,
              description,
              url: jobURL,
              location,
              sector: 'PRIVATE',
            },
          });

          ++newJobs;
        }
      }

      this.logger.log(
        `Finished scraping Trinidad Jobs. ${newJobs} new jobs added.`,
      );
    } catch (e) {
      this.logger.error(`Error scraping Trinidad Jobs: ${e}`);
    }
  }

  async scrapeCRS() {
    const url = 'https://www.crsrecruitment.co.tt/jobs/';

    try {
      let newJobs = 0;
      this.logger.log('Scraping CRS');
      const body = await this.getMarkupWithPuppeteer(url, {
        iframeName: 'pcrframe',
      });

      const $ = cheerio.load(body);
      const jobs = $('table.table-condensed>tbody>tr');

      this.logger.log(`${jobs.length} jobs found`);

      for (const el of jobs.toArray().reverse()) {
        const job = $(el);

        const title = job.find('.td_jobtitle>a').text().trim();
        const company = '';
        const description = '';
        const jobURL = job.find('.td_jobtitle>a').attr('href');
        const location = job.find('.td_location>span').text().trim();

        // Check if job listing already exists
        const exists = await this.prisma.job.findUnique({
          where: {
            title_company: {
              title,
              company,
            },
          },
        });

        if (!exists) {
          await this.prisma.job.create({
            data: {
              title,
              company,
              description,
              url: `https://host.pcrecruiter.net${jobURL}`,
              location,
              sector: 'PRIVATE',
            },
          });

          ++newJobs;
        }
      }

      this.logger.log(`Finished scraping CRS. ${newJobs} new jobs added.`);
    } catch (e) {
      this.logger.error(`Error scraping CRS: ${e}`);
    }
  }

  async scrapeEveAnderson() {
    const url = 'https://www.eveandersonrecruitment.com/jobs-2/';

    try {
      let newJobs = 0;
      this.logger.log('Scraping Eve Anderson');
      const body = await this.getMarkupWithPuppeteer(url, {
        iframeName: 'pcrframe',
      });

      const $ = cheerio.load(body);
      const jobs = $('table.table-condensed>tbody>tr');

      this.logger.log(`${jobs.length} jobs found`);
      for (const el of jobs.toArray().reverse()) {
        const job = $(el);

        const title = job.find('.td_jobtitle>a').text().trim();
        const company = '';
        const description = '';
        const jobURL = job.find('.td_jobtitle>a').attr('href');
        const location = job.find('.td_location>span').text().trim();

        // Check if job listing already exists
        // TODO find another way to check for unique jobs, since EA does not show company, same for CRS
        const exists = await this.prisma.job.findUnique({
          where: {
            title_company: {
              title,
              company,
            },
          },
        });

        if (!exists) {
          await this.prisma.job.create({
            data: {
              title,
              company,
              description,
              url: `https://host.pcrecruiter.net${jobURL}`,
              location,
              sector: 'PRIVATE',
            },
          });

          ++newJobs;
        }
      }

      this.logger.log(
        `Finished scraping Eve Anderson. ${newJobs} new jobs added.`,
      );
    } catch (e) {
      this.logger.error(`Error scraping Eve Anderson: ${e}`);
    }
  }

  async scrapeWebFx() {
    const url = 'https://webfx.co.tt/careers/';
    try {
      let newJobs = 0;
      this.logger.log('Scraping WebFx');

      const res = await fetch(url);
      const body = await res.text();

      const $ = cheerio.load(body);
      const jobs = $('.awsm-job-listing-item');

      this.logger.log(`${jobs.length} jobs found`);

      for (const el of jobs) {
        const job = $(el);
        const title = job.find('.awsm-job-post-title').text().trim();
        const company = 'WebFx';
        const description = '';
        const location = 'Maraval';
        const jobURL = job.find('.awsm-job-item').attr('href');

        // Check if job listing already exists
        const exists = await this.prisma.job.findUnique({
          where: {
            title_company: {
              title,
              company,
            },
          },
        });

        if (!exists) {
          await this.prisma.job.create({
            data: {
              title,
              company,
              description,
              url: jobURL,
              location,
              sector: 'PRIVATE',
            },
          });

          ++newJobs;
        }
      }

      this.logger.log(`Finished scraping WebFx. ${newJobs} new jobs added`);
    } catch (e) {
      this.logger.error(`Error scraping WebFx: ${e}`);
    }
  }
}
