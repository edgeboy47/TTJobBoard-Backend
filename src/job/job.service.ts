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
    selector?: string,
  ): Promise<string> {
    try {
      this.logger.log('Retrieving markup using Puppeteer');
      const browser = await puppeteer.launch();
      const page = await browser.newPage();

      await page.goto(url, { waitUntil: 'networkidle2' });

      // Wait for Akamai scrape protection timeout
      if (selector) await page.waitForSelector(selector, { timeout: 7500 });

      const body = await page.content();
      await page.close();
      await browser.close();

      this.logger.log('Markup retrieved successfully');
      return body;
    } catch (e) {
      this.logger.error(`Failed to retrieve markup using Puppeteer: ${e}`);
      return '';
    }
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async runScrapers() {
    this.logger.log('Running all scrapers');

    await this.scrapeCaribbeanJobs();
    await this.scrapeJobsTT();
    await this.scrapeTrinidadJobs();

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
      const body = await this.getMarkupWithPuppeteer(url, '.two-thirds');

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
}
