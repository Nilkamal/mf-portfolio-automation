// ============= src/services/schedulerService.js =============
const cron = require('node-cron');
const portfolioService = require('./portfolioService');
const emailService = require('./emailService');

class SchedulerService {
  constructor() {
    this.dailySchedule = process.env.DAILY_SCHEDULE || '0 20 * * *';
  }

  shouldSendWeeklyReport() {
    const today = new Date();
    const weeklyDay = parseInt(process.env.WEEKLY_DAY) || 1;
    return today.getDay() === weeklyDay;
  }

  shouldSendMonthlyReport() {
    const today = new Date();
    const monthlyDate = parseInt(process.env.MONTHLY_DATE) || 1;
    return today.getDate() === monthlyDate;
  }

  shouldSendQuarterlyReport() {
    const today = new Date();
    const quarterlyMonths = (process.env.QUARTERLY_MONTHS || '1,4,7,10')
      .split(',')
      .map(m => parseInt(m));
    const monthlyDate = parseInt(process.env.MONTHLY_DATE) || 1;
    
    return today.getDate() === monthlyDate && 
           quarterlyMonths.includes(today.getMonth() + 1);
  }

  shouldSendYearlyReport() {
    const today = new Date();
    const yearlyMonth = parseInt(process.env.YEARLY_MONTH) || 1;
    const monthlyDate = parseInt(process.env.MONTHLY_DATE) || 1;
    
    return today.getDate() === monthlyDate && 
           today.getMonth() + 1 === yearlyMonth;
  }

  async runDailyTask() {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║   Running Daily Portfolio Check      ║');
    console.log('╚════════════════════════════════════════╝');
    console.log(`Time: ${new Date().toLocaleString('en-IN')}\n`);

    try {
      const portfolio = await portfolioService.calculatePortfolio();
      
      console.log(`✓ Portfolio calculated successfully`);
      console.log(`  Total Value: ₹${portfolio.totalValue.toFixed(2)}`);
      console.log(`  Equity: ${portfolio.equityPercent.toFixed(2)}%`);
      console.log(`  Debt: ${portfolio.debtPercent.toFixed(2)}%`);
      console.log(`  Holdings: ${portfolio.holdingsCount} schemes\n`);

      if (portfolio.errors.length > 0) {
        console.log(`⚠ Warnings: ${portfolio.errors.length}`);
        portfolio.errors.forEach(err => console.log(`  - ${err}`));
        console.log('');
      }

      const reportsToSend = [];
      
      if (this.shouldSendYearlyReport()) {
        reportsToSend.push('Yearly');
      } else if (this.shouldSendQuarterlyReport()) {
        reportsToSend.push('Quarterly');
      }
      
      if (this.shouldSendMonthlyReport()) {
        reportsToSend.push('Monthly');
      }
      
      if (this.shouldSendWeeklyReport()) {
        reportsToSend.push('Weekly');
      }

      if (reportsToSend.length > 0) {
        console.log(`📧 Sending ${reportsToSend.length} report(s): ${reportsToSend.join(', ')}`);
        for (const reportType of reportsToSend) {
          await emailService.sendReport(portfolio, reportType);
        }
      } else {
        console.log('ℹ No reports scheduled for today');
      }

    } catch (error) {
      console.error('✗ Error in daily task:', error.message);
      console.error(error.stack);
    }

    console.log('\n════════════════════════════════════════\n');
  }

  start() {
    console.log('╔════════════════════════════════════════╗');
    console.log('║  MF Portfolio Tracker - Scheduler     ║');
    console.log('╚════════════════════════════════════════╝');
    console.log(`Schedule: ${this.dailySchedule}`);
    console.log(`Weekly reports: Day ${process.env.WEEKLY_DAY || 1} (${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][parseInt(process.env.WEEKLY_DAY) || 1]})`);
    console.log(`Monthly reports: Day ${process.env.MONTHLY_DATE || 1}`);
    console.log(`Quarterly reports: Months ${process.env.QUARTERLY_MONTHS || '1,4,7,10'}`);
    console.log(`Yearly reports: Month ${process.env.YEARLY_MONTH || 1}\n`);
    
    cron.schedule(this.dailySchedule, () => {
        console.log('🕒 Triggering scheduled daily task...');
      this.runDailyTask();
    });

    console.log('✓ Scheduler is now running...\n');
  }

  async runManualTest() {
    console.log('╔════════════════════════════════════════╗');
    console.log('║       Running Manual Test Mode        ║');
    console.log('╚════════════════════════════════════════╝\n');
    
    // Test email connection first
    await emailService.testConnection();
    console.log('');
    
    await this.runDailyTask();
    console.log('Test completed successfully!\n');
  }
}

module.exports = new SchedulerService();