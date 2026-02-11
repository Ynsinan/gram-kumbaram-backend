import cron from 'node-cron';
import { saveDailySnapshot } from './scraper.service.js';

/**
 * Initialize scheduled jobs
 */
export const initializeCronJobs = () => {
  // Run daily at 10:00 AM (Turkey timezone: UTC+3)
  // Cron expression: '0 10 * * *' (minute hour day month weekday)
  // Adjust for UTC: 10 AM Turkey = 7 AM UTC
  cron.schedule('0 7 * * *', async () => {
    console.log('🕙 Running daily price snapshot job (10 AM Turkey time)...');
    try {
      await saveDailySnapshot();
    } catch (error) {
      console.error('❌ Failed to save daily snapshot:', error);
    }
  }, {
    timezone: 'Europe/Istanbul', // Turkey timezone
  });

  console.log('✅ Cron jobs initialized: Daily snapshot at 10 AM');
};
