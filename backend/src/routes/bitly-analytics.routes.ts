import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import axios from 'axios';

export function createBitlyAnalyticsRouter(pool: Pool): Router {
  const router = Router();

  // Get Bitly access token from env
  const BITLY_TOKEN = process.env.BITLY_ACCESS_TOKEN;

  /**
   * GET /api/bitly-analytics/summary
   * Get today's click summary across all links
   */
  router.get('/summary', async (req: Request, res: Response) => {
    try {
      if (!BITLY_TOKEN) {
        return res.json({
          success: false,
          error: 'Bitly token not configured',
          stats: {
            clicks_today: 0,
            clicks_this_week: 0,
            total_links: 0,
            active_links: 0
          }
        });
      }

      // Get all Bitly links from social_leads
      const linksResult = await pool.query(`
        SELECT DISTINCT stage6_short_link 
        FROM social_leads 
        WHERE stage6_short_link IS NOT NULL
      `);

      let totalClicksToday = 0;
      let totalClicksWeek = 0;
      const linkStats: any[] = [];

      // Fetch click data for each link from Bitly API
      for (const row of linksResult.rows) {
        const shortLink = row.stage6_short_link;
        
        try {
          // Extract link_id from Bitly URL (e.g., bit.ly/abc123 -> abc123)
          const linkId = shortLink.split('/').pop();
          
          // Get click metrics from Bitly API
          const response = await axios.get(
            `https://api-ssl.bitly.com/v4/bitlinks/${linkId}/clicks/summary`,
            {
              headers: {
                'Authorization': `Bearer ${BITLY_TOKEN}`,
                'Content-Type': 'application/json'
              },
              params: {
                unit: 'day',
                units: 7
              }
            }
          );

          const clicks = response.data.total_clicks || 0;
          totalClicksWeek += clicks;

          // Get today's clicks (unit=day, units=1)
          const todayResponse = await axios.get(
            `https://api-ssl.bitly.com/v4/bitlinks/${linkId}/clicks/summary`,
            {
              headers: {
                'Authorization': `Bearer ${BITLY_TOKEN}`,
                'Content-Type': 'application/json'
              },
              params: {
                unit: 'day',
                units: 1
              }
            }
          );

          const clicksToday = todayResponse.data.total_clicks || 0;
          totalClicksToday += clicksToday;

          linkStats.push({
            link: shortLink,
            clicks_today: clicksToday,
            clicks_week: clicks
          });

        } catch (error: any) {
          console.error(`Failed to fetch stats for ${shortLink}:`, error.message);
        }
      }

      res.json({
        success: true,
        stats: {
          clicks_today: totalClicksToday,
          clicks_this_week: totalClicksWeek,
          total_links: linksResult.rows.length,
          active_links: linkStats.filter(l => l.clicks_week > 0).length
        },
        top_links: linkStats
          .sort((a, b) => b.clicks_today - a.clicks_today)
          .slice(0, 10)
      });

    } catch (error: any) {
      console.error('Error fetching Bitly analytics:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch analytics', 
        details: error.message 
      });
    }
  });

  /**
   * GET /api/bitly-analytics/link/:linkId
   * Get detailed analytics for a specific link
   */
  router.get('/link/:linkId', async (req: Request, res: Response) => {
    try {
      const { linkId } = req.params;

      if (!BITLY_TOKEN) {
        return res.status(400).json({ error: 'Bitly token not configured' });
      }

      // Get click summary
      const summaryResponse = await axios.get(
        `https://api-ssl.bitly.com/v4/bitlinks/${linkId}/clicks/summary`,
        {
          headers: {
            'Authorization': `Bearer ${BITLY_TOKEN}`,
            'Content-Type': 'application/json'
          },
          params: {
            unit: 'day',
            units: 30
          }
        }
      );

      // Get click details over time
      const clicksResponse = await axios.get(
        `https://api-ssl.bitly.com/v4/bitlinks/${linkId}/clicks`,
        {
          headers: {
            'Authorization': `Bearer ${BITLY_TOKEN}`,
            'Content-Type': 'application/json'
          },
          params: {
            unit: 'day',
            units: 30
          }
        }
      );

      // Get referrers
      const referrersResponse = await axios.get(
        `https://api-ssl.bitly.com/v4/bitlinks/${linkId}/referrers`,
        {
          headers: {
            'Authorization': `Bearer ${BITLY_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Get countries
      const countriesResponse = await axios.get(
        `https://api-ssl.bitly.com/v4/bitlinks/${linkId}/countries`,
        {
          headers: {
            'Authorization': `Bearer ${BITLY_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );

      res.json({
        success: true,
        link_id: linkId,
        summary: summaryResponse.data,
        clicks_over_time: clicksResponse.data,
        referrers: referrersResponse.data,
        countries: countriesResponse.data
      });

    } catch (error: any) {
      console.error('Error fetching link analytics:', error);
      res.status(500).json({ 
        error: 'Failed to fetch link analytics', 
        details: error.message 
      });
    }
  });

  /**
   * GET /api/bitly-analytics/trends
   * Get click trends over the last 30 days
   */
  router.get('/trends', async (req: Request, res: Response) => {
    try {
      if (!BITLY_TOKEN) {
        return res.json({
          success: false,
          error: 'Bitly token not configured',
          daily_clicks: []
        });
      }

      // Get all Bitly links
      const linksResult = await pool.query(`
        SELECT DISTINCT stage6_short_link 
        FROM social_leads 
        WHERE stage6_short_link IS NOT NULL
      `);

      // Aggregate clicks by day
      const dailyClicksMap: { [date: string]: number } = {};

      for (const row of linksResult.rows) {
        const shortLink = row.stage6_short_link;
        const linkId = shortLink.split('/').pop();

        try {
          const response = await axios.get(
            `https://api-ssl.bitly.com/v4/bitlinks/${linkId}/clicks`,
            {
              headers: {
                'Authorization': `Bearer ${BITLY_TOKEN}`,
                'Content-Type': 'application/json'
              },
              params: {
                unit: 'day',
                units: 30
              }
            }
          );

          // Aggregate clicks by date
          const clickData = response.data.link_clicks || [];
          clickData.forEach((day: any) => {
            const date = day.date;
            dailyClicksMap[date] = (dailyClicksMap[date] || 0) + day.clicks;
          });

        } catch (error: any) {
          console.error(`Failed to fetch trends for ${shortLink}:`, error.message);
        }
      }

      // Convert to array and sort by date
      const dailyClicks = Object.entries(dailyClicksMap)
        .map(([date, clicks]) => ({ date, clicks }))
        .sort((a, b) => a.date.localeCompare(b.date));

      res.json({
        success: true,
        daily_clicks: dailyClicks,
        total_days: dailyClicks.length
      });

    } catch (error: any) {
      console.error('Error fetching trends:', error);
      res.status(500).json({ 
        error: 'Failed to fetch trends', 
        details: error.message 
      });
    }
  });

  return router;
}
