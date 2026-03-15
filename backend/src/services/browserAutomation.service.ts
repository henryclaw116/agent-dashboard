import axios from 'axios';

const OPENCLAW_BROWSER_URL = 'http://localhost:18789';

interface PostResult {
  success: boolean;
  replyUrl?: string;
  error?: string;
  screenshot?: string;
}

export class BrowserAutomationService {
  
  /**
   * Post a reply to a social media post
   */
  async postReply(platform: string, postUrl: string, replyText: string): Promise<PostResult> {
    try {
      console.log(`[BROWSER] Starting ${platform} post to ${postUrl}`);
      
      // Call the appropriate platform handler
      switch (platform.toLowerCase()) {
        case 'twitter':
          return await this.postTwitterReply(postUrl, replyText);
        case 'reddit':
          return await this.postRedditReply(postUrl, replyText);
        case 'youtube':
          return await this.postYouTubeReply(postUrl, replyText);
        case 'stocktwits':
          return await this.postStockTwitsReply(postUrl, replyText);
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }
      
    } catch (error: any) {
      console.error('[BROWSER] Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Post reply to Twitter
   */
  private async postTwitterReply(postUrl: string, replyText: string): Promise<PostResult> {
    try {
      // Call OpenClaw browser automation
      const response = await axios.post(`${OPENCLAW_BROWSER_URL}/api/browser/navigate`, {
        url: postUrl,
        waitForSelector: '[data-testid="reply"]'
      }, { timeout: 30000 });
      
      // Click reply button
      await axios.post(`${OPENCLAW_BROWSER_URL}/api/browser/click`, {
        selector: '[data-testid="reply"]'
      });
      
      await this.sleep(1000);
      
      // Type reply text (word by word for human-like behavior)
      await this.typeHumanLike('[data-testid="tweetTextarea_0"]', replyText);
      
      await this.sleep(500);
      
      // Click post button
      await axios.post(`${OPENCLAW_BROWSER_URL}/api/browser/click`, {
        selector: '[data-testid="tweetButton"]'
      });
      
      await this.sleep(3000);
      
      // Get reply URL (Twitter redirects to the reply)
      const urlResponse = await axios.get(`${OPENCLAW_BROWSER_URL}/api/browser/url`);
      const replyUrl = urlResponse.data.url;
      
      // Take screenshot
      const screenshot = await this.takeScreenshot();
      
      return {
        success: true,
        replyUrl,
        screenshot
      };
      
    } catch (error: any) {
      console.error('[TWITTER] Error posting reply:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Post reply to Reddit
   */
  private async postRedditReply(postUrl: string, replyText: string): Promise<PostResult> {
    try {
      await axios.post(`${OPENCLAW_BROWSER_URL}/api/browser/navigate`, {
        url: postUrl
      }, { timeout: 30000 });
      
      // Click reply button
      await axios.post(`${OPENCLAW_BROWSER_URL}/api/browser/click`, {
        selector: 'button[aria-label="Reply"]'
      });
      
      await this.sleep(1000);
      
      // Type reply
      await this.typeHumanLike('textarea[name="comment"]', replyText);
      
      await this.sleep(500);
      
      // Submit
      await axios.post(`${OPENCLAW_BROWSER_URL}/api/browser/click`, {
        selector: 'button[type="submit"]'
      });
      
      await this.sleep(3000);
      
      const screenshot = await this.takeScreenshot();
      
      return {
        success: true,
        replyUrl: postUrl, // Reddit doesn't redirect, reply is on same page
        screenshot
      };
      
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Post reply to YouTube
   */
  private async postYouTubeReply(postUrl: string, replyText: string): Promise<PostResult> {
    try {
      await axios.post(`${OPENCLAW_BROWSER_URL}/api/browser/navigate`, {
        url: postUrl
      }, { timeout: 30000 });
      
      // Scroll to comments
      await axios.post(`${OPENCLAW_BROWSER_URL}/api/browser/scroll`, {
        y: 500
      });
      
      await this.sleep(2000);
      
      // Click comment box
      await axios.post(`${OPENCLAW_BROWSER_URL}/api/browser/click`, {
        selector: '#simplebox-placeholder'
      });
      
      await this.sleep(1000);
      
      // Type comment
      await this.typeHumanLike('#contenteditable-root', replyText);
      
      await this.sleep(500);
      
      // Submit
      await axios.post(`${OPENCLAW_BROWSER_URL}/api/browser/click`, {
        selector: '#submit-button'
      });
      
      await this.sleep(3000);
      
      const screenshot = await this.takeScreenshot();
      
      return {
        success: true,
        replyUrl: postUrl,
        screenshot
      };
      
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Post reply to StockTwits
   */
  private async postStockTwitsReply(postUrl: string, replyText: string): Promise<PostResult> {
    try {
      await axios.post(`${OPENCLAW_BROWSER_URL}/api/browser/navigate`, {
        url: postUrl
      }, { timeout: 30000 });
      
      // Click reply
      await axios.post(`${OPENCLAW_BROWSER_URL}/api/browser/click`, {
        selector: 'button[aria-label="Reply"]'
      });
      
      await this.sleep(1000);
      
      // Type reply
      await this.typeHumanLike('textarea[placeholder="Share your thoughts"]', replyText);
      
      await this.sleep(500);
      
      // Post
      await axios.post(`${OPENCLAW_BROWSER_URL}/api/browser/click`, {
        selector: 'button[type="submit"]'
      });
      
      await this.sleep(3000);
      
      const screenshot = await this.takeScreenshot();
      
      return {
        success: true,
        replyUrl: postUrl,
        screenshot
      };
      
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Type text with human-like delays
   */
  private async typeHumanLike(selector: string, text: string): Promise<void> {
    const words = text.split(' ');
    
    for (const word of words) {
      await axios.post(`${OPENCLAW_BROWSER_URL}/api/browser/type`, {
        selector,
        text: word + ' ',
        delay: Math.random() * 100 + 50 // 50-150ms per word
      });
    }
  }
  
  /**
   * Take screenshot
   */
  private async takeScreenshot(): Promise<string> {
    try {
      const response = await axios.get(`${OPENCLAW_BROWSER_URL}/api/browser/screenshot`);
      return response.data.screenshot;
    } catch {
      return '';
    }
  }
  
  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const browserAutomation = new BrowserAutomationService();