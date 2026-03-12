/**
 * Brand24 Email Scraper
 * 
 * Monitors inbox for Brand24 alert emails
 * Extracts social media mentions and posts them to the pipeline
 * 
 * Setup:
 * 1. Add email credentials to .env:
 *    EMAIL_HOST=imap.gmail.com
 *    EMAIL_PORT=993
 *    EMAIL_USER=your-email@gmail.com
 *    EMAIL_PASSWORD=your-app-password
 * 
 * 2. Run: npx ts-node src/scripts/brand24-email-scraper.ts
 */

import Imap from 'imap';
import { simpleParser } from 'mailparser';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

interface Brand24Mention {
  platform: string;
  username: string;
  postUrl: string;
  postText: string;
  timestamp: string;
}

class Brand24EmailScraper {
  private imap: Imap;
  private processedMessageIds = new Set<string>();

  constructor() {
    this.imap = new Imap({
      user: process.env.EMAIL_USER || '',
      password: process.env.EMAIL_PASSWORD || '',
      host: process.env.EMAIL_HOST || 'imap.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '993'),
      tls: true,
      tlsOptions: { rejectUnauthorized: false }
    });
  }

  async start() {
    console.log('🔍 Starting Brand24 Email Scraper...\n');

    return new Promise((resolve, reject) => {
      this.imap.once('ready', () => {
        console.log('✅ Connected to email server\n');
        this.openInbox();
      });

      this.imap.once('error', (err: Error) => {
        console.error('❌ IMAP Error:', err);
        reject(err);
      });

      this.imap.once('end', () => {
        console.log('📧 Connection ended');
        resolve(true);
      });

      this.imap.connect();
    });
  }

  private openInbox() {
    this.imap.openBox('INBOX', false, (err, box) => {
      if (err) {
        console.error('Failed to open inbox:', err);
        return;
      }

      console.log(`📬 Inbox opened: ${box.messages.total} total messages\n`);
      this.searchBrand24Emails();
    });
  }

  private searchBrand24Emails() {
    // Search for unread emails from Brand24 in the last 7 days
    const searchCriteria = [
      'UNSEEN',
      ['FROM', 'brand24.com'],
      ['SINCE', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]]
    ];

    this.imap.search(searchCriteria, (err, results) => {
      if (err) {
        console.error('Search error:', err);
        this.imap.end();
        return;
      }

      if (!results || results.length === 0) {
        console.log('📭 No new Brand24 emails found');
        this.imap.end();
        return;
      }

      console.log(`📨 Found ${results.length} Brand24 email(s)\n`);
      this.fetchEmails(results);
    });
  }

  private fetchEmails(messageIds: number[]) {
    const fetch = this.imap.fetch(messageIds, { bodies: '' });

    fetch.on('message', (msg) => {
      msg.on('body', async (stream) => {
        try {
          const parsed = await simpleParser(stream);
          
          if (!parsed.messageId || this.processedMessageIds.has(parsed.messageId)) {
            return;
          }
          
          this.processedMessageIds.add(parsed.messageId);
          
          console.log('📧 Processing email:', parsed.subject);
          await this.parseAndStoreMentions(parsed);
          
        } catch (error) {
          console.error('Failed to parse email:', error);
        }
      });
    });

    fetch.once('error', (err: Error) => {
      console.error('Fetch error:', err);
    });

    fetch.once('end', () => {
      console.log('\n✅ Finished processing emails');
      this.imap.end();
    });
  }

  private async parseAndStoreMentions(email: any) {
    const mentions = this.extractMentions(email);
    
    if (mentions.length === 0) {
      console.log('  ⚠️  No mentions found in email');
      return;
    }

    console.log(`  📊 Found ${mentions.length} mention(s)`);

    for (const mention of mentions) {
      try {
        await this.storeLead(mention);
        console.log(`  ✓ Stored: ${mention.platform} - ${mention.username}`);
      } catch (error: any) {
        console.error(`  ✗ Failed to store mention:`, error.message);
      }
    }
  }

  private extractMentions(email: any): Brand24Mention[] {
    const mentions: Brand24Mention[] = [];
    const html = email.html || email.text || '';
    const text = email.text || '';

    // Brand24 emails typically contain mention blocks with:
    // - Platform name (Reddit, Twitter, etc.)
    // - Author/username
    // - Post content
    // - URL to the post
    // - Timestamp

    // Pattern 1: Extract from HTML links
    const urlPattern = /(https?:\/\/(?:www\.)?(reddit\.com|twitter\.com|stocktwits\.com)[^\s<>"]+)/gi;
    const urls = html.match(urlPattern) || [];

    // Pattern 2: Extract post content
    // Brand24 usually formats like:
    // "Author: @username"
    // "Content: post text here"
    // "Source: Platform Name"

    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    
    let currentMention: Partial<Brand24Mention> = {};
    
    for (const line of lines) {
      // Detect platform
      if (line.match(/source:|platform:/i)) {
        const platform = line.replace(/source:|platform:/gi, '').trim().toLowerCase();
        if (platform.includes('reddit')) currentMention.platform = 'reddit';
        else if (platform.includes('twitter')) currentMention.platform = 'twitter';
        else if (platform.includes('stocktwits')) currentMention.platform = 'stocktwits';
      }
      
      // Detect username
      if (line.match(/author:|user:|username:/i)) {
        currentMention.username = line.replace(/author:|user:|username:/gi, '').trim().replace(/^@/, '');
      }
      
      // Detect content
      if (line.match(/content:|text:|message:/i)) {
        currentMention.postText = line.replace(/content:|text:|message:/gi, '').trim();
      }
      
      // Detect URL
      const urlMatch = line.match(urlPattern);
      if (urlMatch) {
        currentMention.postUrl = urlMatch[0];
      }
    }

    // If we have enough data, add the mention
    if (currentMention.platform && currentMention.postText && currentMention.postUrl) {
      mentions.push({
        platform: currentMention.platform,
        username: currentMention.username || 'unknown',
        postUrl: currentMention.postUrl,
        postText: currentMention.postText,
        timestamp: new Date().toISOString()
      });
    }

    // Fallback: Try to extract URLs and fetch content
    if (mentions.length === 0 && urls.length > 0) {
      for (const url of urls) {
        let platform = 'unknown';
        if (url.includes('reddit')) platform = 'reddit';
        else if (url.includes('twitter')) platform = 'twitter';
        else if (url.includes('stocktwits')) platform = 'stocktwits';
        
        mentions.push({
          platform,
          username: 'unknown',
          postUrl: url,
          postText: text.substring(0, 500), // Use first 500 chars as content
          timestamp: new Date().toISOString()
        });
      }
    }

    return mentions;
  }

  private async storeLead(mention: Brand24Mention) {
    const postId = `${mention.platform}-${Buffer.from(mention.postUrl).toString('base64').substring(0, 20)}`;
    
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
      mention.platform,
      mention.username,
      mention.postText,
      mention.postUrl
    ]);
  }

  stop() {
    this.imap.end();
  }
}

// Run scraper
async function main() {
  const scraper = new Brand24EmailScraper();
  
  try {
    await scraper.start();
    console.log('\n✅ Scraper finished successfully');
  } catch (error) {
    console.error('\n❌ Scraper failed:', error);
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
