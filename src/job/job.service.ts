import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';
import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

@Injectable()
export class JobService {
  constructor(private readonly prisma: PrismaService) {}
  private readonly logger = new Logger(JobService.name);

  async getJobs() {
    return this.prisma.job.findMany();
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async scrapeCaribbeanJobs() {
    // TODO
    const baseURL = 'https://www.caribbeanjobs.com';
    const url =
      'https://www.caribbeanjobs.com/ShowResults.aspx?Keywords=&autosuggestEndpoint=%2fautosuggest&Location=124&Category=&Recruiter=Company%2cAgency&btnSubmit=Search&PerPage=100';
    let newJobs = 0;

    try {
      this.logger.log('Scraping Caribbean Jobs');
      const browser = await puppeteer.launch();
      const page = await browser.newPage();

      await page.goto(url, { waitUntil: 'networkidle2' });

      // Wait for Akamai scrape protection timeout
      await page.waitForSelector('.two-thirds', { timeout: 5000 });

      const body = await page.content();
      await page.close();
      await browser.close();

      // Scrape body
      const $ = cheerio.load(body);
      const jobs = $('.job-result>.module-content');

      this.logger.log(`${jobs.length} jobs found`);

      for (const el of jobs.toArray()) {
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
      // TODO: error handling and logging
      this.logger.error(`Error scraping Caribbean Jobs: ${e}`);
    }
  }
}
