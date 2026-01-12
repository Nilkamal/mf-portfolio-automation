// ============= src/services/portfolioService.js =============
const googleSheetsService = require('./googleSheetsService');
const navService = require('./navService');

class PortfolioService {
  async calculatePortfolio() {
    // Ensure NAV data is fresh
    if (!navService.isDataFresh()) {
      await navService.fetchNAVData();
    }

    // Read portfolio from Google Sheets
    const holdings = await googleSheetsService.readPortfolio();
    
    let totalValue = 0;
    let equityValue = 0;
    let debtValue = 0;
    const details = [];
    const errors = [];

    for (const holding of holdings) {
      // Handle direct value assets (Stocks, Bank Balance, EPFO & PPF, NPS)
      if (holding.isDirectValue) {
        const value = holding.value;
        totalValue += value;

        if (holding.category === 'equity') {
          equityValue += value;
        } else if (holding.category === 'debt') {
          debtValue += value;
        }

        details.push({
          schemeName: holding.schemeName,
          units: '-',
          nav: '-',
          value: value,
          category: holding.category,
          isDirectValue: true
        });
        continue;
      }

      // Handle mutual fund holdings (require NAV lookup)
      const nav = navService.getNAV(holding.schemeName);
      
      if (nav === null) {
        console.warn(`Skipping ${holding.schemeName} - NAV not available`);
        errors.push(`NAV not found for: ${holding.schemeName}`);
        details.push({
          schemeName: holding.schemeName,
          units: holding.units,
          nav: 'N/A',
          value: 'N/A',
          category: holding.category,
          error: 'NAV not found'
        });
        continue;
      }

      const value = holding.units * nav;
      totalValue += value;

      if (holding.category === 'equity') {
        equityValue += value;
      } else if (holding.category === 'debt') {
        debtValue += value;
      }

      details.push({
        schemeName: holding.schemeName,
        units: holding.units,
        nav: nav,
        value: value,
        category: holding.category
      });
    }

    const equityPercent = totalValue > 0 ? (equityValue / totalValue) * 100 : 0;
    const debtPercent = totalValue > 0 ? (debtValue / totalValue) * 100 : 0;

    return {
      totalValue,
      equityValue,
      debtValue,
      equityPercent,
      debtPercent,
      details,
      errors,
      date: new Date(),
      holdingsCount: holdings.length
    };
  }
}

module.exports = new PortfolioService();