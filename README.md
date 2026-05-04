# TTJobBoard Backend

## Description

NestJs Backend for [TTJobBoard](https://github.com/edgeboy47/TTJobBoard-Frontend)

## Features

- **Multi-site Scraping**: Scrapes jobs from multiple Caribbean job sites:
  - Caribbean Jobs
  - JobsTT
  - CRS Recruitment
  - EmployTT
  - Massy Finance
  - FCB (First Citizens Bank)
  - RBC (Royal Bank of Canada)
  - WebFx

- **Database Management**: Uses Prisma ORM with Supabase storage for job and company data

- **Scheduled Scraping**: Cron-based scraping that runs automatically every 5 minutes

- **Job Management**: Full CRUD operations for jobs with filtering by title, company, and location

- **Puppeteer Integration**: Automated browser-based scraping with proxy support

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file in the root directory with the following variables:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_API_KEY=your_supabase_api_key
PROXY_USERNAME=your_proxy_username
PROXY_PASSWORD=your_proxy_password
```

## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Scraping Schedule

The application runs automated scrapers on a schedule:

- **Every 5 minutes**: Run all scrapers (`runScrapers`)
- **Every hour**: Keep database connections alive (`keepAlive`)
- **Every day at midnight**: Delete jobs older than 2 months (`deleteOutdatedJobs`)
