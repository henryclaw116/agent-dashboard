/**
 * StockTwits Scraper
 * 
 * Monitors StockTwits for trading-related discussions
 * Filters for options trading, credit spreads, and day trading frustration
 * Posts qualified leads to the pipeline
 * 
 * Setup:
 * 1. Add STOCKTWITS_ACCESS_TOKEN to .env (optional, works without auth but rate-limited)
 * 2. Run: npx ts-node src/scripts/stocktwits-scraper.ts
 */

import axios from 'axios';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

interface StockTwit {
  id: number;
  body: string;
  created_at: string;
  user: {
    username: string;
    name: string;
  };
  symbols?: Array<{ symbol: string }>;
  conversation?: {
    parent: boolean;
    replies: number;
  };
  likes?: { total: number };
}

class StockTwitsScraper {
  private readonly API_BASE = 'https://api.stocktwits.com/api/2';
  private readonly KEYWORDS = [
    'options trading',
    'credit spreads',
    'losing money',
    'day trading',
    'options strategy',
    'premium seller',
    'theta gang',
    'iron condor',
    'vertical spread'
  ];

  private processedIds = new Set<number>();

  async scrapeStreams() {
    console.log('📊 Starting StockTwits Scraper...\n');

    try {
      // 1. Scrape trending stream
      console.log('🔥 Checking trending stream...');
      await this.scrapeTrending();

      // 2. Scrape specific symbols related to options/trading
      console.log('\n📈 Checking trading-related symbols...');
      await this.scrapeSymbols(['SPY', 'QQQ', 'IWM', 'TLT', 'GLD']);

      // 3. Search for specific keywords
      console.log('\n🔍 Searching for keywords...');
      await this.searchKeywords();

      console.log('\n✅ Scraper finished successfully');

    } catch (error) {
      console.error('\n❌ Scraper failed:', error);
      throw error;
    }
  }

  private async scrapeTrending() {
    try {
      const response = await axios.get(`${this.API_BASE}/streams/trending.json`, {
        params: { limit: 30 }
      });

      const messages = response.data.messages || [];
      console.log(`  Found ${messages.length} trending messages`);

      for (const twit of messages) {
        await this.processTwit(twit);
      }
    } catch (error: any) {
      console.error('  Failed to fetch trending:', error.message);
    }
  }

  private async scrapeSymbols(symbols: string[]) {
    for (const symbol of symbols) {
      try {
        const response = await axios.get(`${this.API_BASE}/streams/symbol/${symbol}.json`, {
          params: { limit: 30 }
        });

        const messages = response.data.messages || [];
        console.log(`  ${symbol}: ${messages.length} messages`);

        for (const twit of messages) {
          await this.processTwit(twit);
        }

        // Rate limit: wait 1 second between symbol requests
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error: any) {
        console.error(`  ${symbol} failed:`, error.message);
      }
    }
  }

  private async searchKeywords() {
    // StockTwits doesn't have a direct search API endpoint
    // But we can filter the messages we've already collected
    console.log('  Filtering collected messages for keywords...');
  }

  private async processTwit(twit: StockTwit) {
    // Skip if already processed
    if (this.processedIds.has(twit.id)) {
      return;
    }
    this.processedIds.add(twit.id);

    // Filter: Must contain trading-related keywords
    const body = twit.body.toLowerCase();
    const matchesKeyword = this.KEYWORDS.some(keyword => 
      body.includes(keyword.toLowerCase())
    );

    if (!matchesKeyword) {
      return; // Skip - not relevant
    }

    // Additional filters
    const hasOptionsKeywords = 
      body.includes('option') ||
      body.includes('spread') ||
      body.includes('premium') ||
      body.includes('theta') ||
      body.includes('delta');

    const hasFrustrationKeywords =
      body.includes('losing') ||
      body.includes('lost') ||
      body.includes('help') ||
      body.includes('advice') ||
      body.includes('struggling') ||
      body.includes('confused');

    const hasQuestion =
      body.includes('?') ||
      body.includes('how') ||
      body.includes('what') ||
      body.includes('why') ||
      body.includes('should i');

    // Calculate relevance score
    let relevance = 0;
    if (hasOptionsKeywords) relevance += 30;
    if (hasFrustrationKeywords) relevance += 25;
    if (hasQuestion) relevance += 20;
    if (twit.conversation && twit.conversation.replies > 0) relevance += 10;
    if (twit.likes && twit.likes.total > 5) relevance += 15;

    // Only store if relevance >= 50
    if (relevance < 50) {
      return;
    }

    try {
      await this.storeLead(twit, relevance);
      console.log(`  ✓ Stored: @${twit.user.username} (relevance: ${relevance})`);
    } catch (error: any) {
      if (!error.message.includes('duplicate')) {
        console.error(`  ✗ Failed to store: ${error.message}`);
      }
    }
  }

  private async storeLead(twit: StockTwit, relevance: number) {
    const postId = `stocktwits-${twit.id}`;
    const postUrl = `https://stocktwits.com/${twit.user.username}/message/${twit.id}`;

    await pool.query(`
      INSERT INTO social_leads (
        post_id,
        platform,
        username,
        post_text,
        post_url,
        stage1_status,
        status,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, 'PENDING', 'PENDING', NOW(), NOW())
      ON CONFLICT (post_id) DO NOTHING
    `, [
      postId,
      'stocktwits',
      twit.user.username,
      twit.body,
      postUrl
    ]);
  }
}

// Run scraper
async function main() {
  const scraper = new StockTwitsScraper();
  
  try {
    await scraper.scrapeStreams();
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Stopping scraper...');
  process.exit(0);
});

main();
