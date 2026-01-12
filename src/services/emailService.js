// ============= src/services/emailService.js =============
const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }

  formatCurrency(amount) {
    if (amount === 'N/A') return 'N/A';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount);
  }

  formatPercent(percent) {
    return `${percent.toFixed(2)}%`;
  }

  generateHTMLReport(portfolio, reportType) {
    const { totalValue, equityPercent, debtPercent, details, errors, date, holdingsCount } = portfolio;

    const detailsHTML = details.map(d => {
      const rowClass = d.error ? 'style="background-color: #fff3cd;"' : '';
      return `
      <tr ${rowClass}>
        <td style="padding: 8px; border: 1px solid #ddd;">${d.schemeName}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${d.units === '-' ? '-' : d.units.toFixed(2)}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${typeof d.nav === 'number' ? this.formatCurrency(d.nav) : d.nav}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${typeof d.value === 'number' ? this.formatCurrency(d.value) : d.value}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${d.category.toUpperCase()}</td>
      </tr>
    `}).join('');

    const errorsHTML = errors.length > 0 ? `
      <div style="margin: 20px 0; padding: 15px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 5px;">
        <h3 style="margin-top: 0; color: #856404;">⚠️ Warnings</h3>
        <ul style="margin: 0; padding-left: 20px;">
          ${errors.map(e => `<li>${e}</li>`).join('')}
        </ul>
      </div>
    ` : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
          .container { max-width: 900px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 5px; margin-bottom: 20px; }
          .header h1 { margin: 0 0 10px 0; font-size: 28px; }
          .header p { margin: 0; opacity: 0.9; }
          .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
          .summary-card { background-color: #f9f9f9; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; }
          .summary-card .label { font-size: 12px; text-transform: uppercase; color: #666; margin-bottom: 8px; }
          .summary-card .value { font-size: 24px; font-weight: bold; color: #333; }
          .summary-card.total { border-left-color: #4CAF50; }
          .summary-card.total .value { color: #4CAF50; }
          .summary-card.equity { border-left-color: #2196F3; }
          .summary-card.equity .value { color: #2196F3; }
          .summary-card.debt { border-left-color: #FF9800; }
          .summary-card.debt .value { color: #FF9800; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background-color: #667eea; color: white; padding: 12px 10px; text-align: left; font-weight: 600; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; text-align: center; }
          .footer p { margin: 5px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 Mutual Fund Portfolio Report</h1>
            <p>${reportType} Report | ${date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          
          ${errorsHTML}

          <div class="summary">
            <div class="summary-card total">
              <div class="label">Total Portfolio Value</div>
              <div class="value">${this.formatCurrency(totalValue)}</div>
            </div>
            <div class="summary-card equity">
              <div class="label">Equity Allocation</div>
              <div class="value">${this.formatPercent(equityPercent)}</div>
            </div>
            <div class="summary-card debt">
              <div class="label">Debt Allocation</div>
              <div class="value">${this.formatPercent(debtPercent)}</div>
            </div>
          </div>

          <h2 style="color: #333; margin-top: 30px;">Holdings Details (${holdingsCount} schemes)</h2>
          <table>
            <thead>
              <tr>
                <th>Scheme Name</th>
                <th style="text-align: right;">Units</th>
                <th style="text-align: right;">NAV</th>
                <th style="text-align: right;">Value</th>
                <th style="text-align: center;">Category</th>
              </tr>
            </thead>
            <tbody>
              ${detailsHTML}
            </tbody>
          </table>

          <div class="footer">
            <p><strong>MF Portfolio Tracker</strong> | Powered by Google Sheets</p>
            <p>NAV data source: AMFI India | Report generated automatically</p>
            <p style="margin-top: 10px; font-size: 11px; color: #999;">This report is for informational purposes only. Please consult with a financial advisor for investment decisions.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async sendReport(portfolio, reportType) {
    const htmlContent = this.generateHTMLReport(portfolio, reportType);

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: process.env.EMAIL_TO,
      subject: `${reportType} Portfolio Report - ${this.formatCurrency(portfolio.totalValue)} | ${portfolio.date.toLocaleDateString('en-IN')}`,
      html: htmlContent
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`✓ ${reportType} report sent successfully. Message ID: ${info.messageId}`);
      return true;
    } catch (error) {
      console.error(`✗ Failed to send ${reportType} report:`, error.message);
      return false;
    }
  }

  async testConnection() {
    try {
      await this.transporter.verify();
      console.log('✓ Email service is ready');
      return true;
    } catch (error) {
      console.error('✗ Email service error:', error.message);
      return false;
    }
  }
}

module.exports = new EmailService();