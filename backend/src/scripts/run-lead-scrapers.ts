/**
 * Lead Scraper Scheduler
 * 
 * Runs Brand24 email and StockTwits scrapers on a schedule
 * 
 * Usage:
 * - One-time run: npx ts-node src/scripts/run-lead-scrapers.ts
 * - Continuous (every 10 min): npx ts-node src/scripts/run-lead-scrapers.ts --continuous
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import dotenv from 'dotenv';

dotenv.config();

const execAsync = promisify(exec);

const INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const isContinuous = process.argv.includes('--continuous');

async function runBrand24Scraper() {
  console.log('\n📧 === Running Brand24 Email Scraper ===\n');
  try {
    const { stdout, stderr } = await execAsync('npx ts-node src/scripts/brand24-email-scraper.ts', {
      cwd: __dirname + '/../..'
    });
    console.log(stdout);
    if (stderr) console.error(stderr);
  } catch (error: any) {
    console.error('Brand24 scraper failed:', error.message);
  }
}

async function runStockTwitsScraper() {
  console.log('\n📊 === Running StockTwits Scraper ===\n');
  try {
    const { stdout, stderr } = await execAsync('npx ts-node src/scripts/stocktwits-scraper.ts', {
      cwd: __dirname + '/../..'
    });
    console.log(stdout);
    if (stderr) console.error(stderr);
  } catch (error: any) {
    console.error('StockTwits scraper failed:', error.message);
  }
}

async function runAllScrapers() {
  const startTime = Date.now();
  console.log(`\n🚀 === Starting Lead Scrapers - ${new Date().toLocaleString()} ===\n`);

  // Run in parallel
  await Promise.all([
    runBrand24Scraper(),
    runStockTwitsScraper()
  ]);

  const duration = Math.round((Date.now() - startTime) / 1000);
  console.log(`\n✅ === Scrapers Complete - ${duration}s ===\n`);
}

async function main() {
  console.log('🔧 Lead Scraper Scheduler Started');
  console.log(`Mode: ${isContinuous ? 'Continuous (every 10 min)' : 'One-time run'}\n`);

  // Run immediately
  await runAllScrapers();

  if (isContinuous) {
    console.log(`⏰ Next run in 10 minutes...\n`);
    
    setInterval(async () => {
      await runAllScrapers();
      console.log(`⏰ Next run in 10 minutes...\n`);
    }, INTERVAL_MS);
  } else {
    process.exit(0);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Stopping scheduler...');
  process.exit(0);
});

main();
