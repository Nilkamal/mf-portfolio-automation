// ============= src/services/navService.js =============
const axios = require('axios');

class NAVService {
  constructor() {
    this.navUrl = 'https://portal.amfiindia.com/spages/NAVAll.txt';
    this.navCache = new Map();
    this.lastFetchDate = null;
  }

  async fetchNAVData() {
    try {
      console.log('Fetching NAV data from AMFI...');
      const response = await axios.get(this.navUrl, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      });
      this.parseNAVData(response.data);
      this.lastFetchDate = new Date();
      console.log(`NAV data fetched successfully. Total schemes: ${this.navCache.size}`);
    } catch (error) {
      throw new Error(`Failed to fetch NAV data: ${error.message}`);
    }
  }

  parseNAVData(data) {
    this.navCache.clear();
    const lines = data.split('\n');
    
    for (const line of lines) {
      if (!line || line.startsWith('Scheme Code')) continue;
      
      const parts = line.split(';');
      if (parts.length >= 5) {
        const schemeCode = parts[0]?.trim();
        const schemeName = parts[3]?.trim();
        const nav = parts[4]?.trim();
        
        if (schemeName && nav && nav !== 'N.A.' && !isNaN(parseFloat(nav))) {
          // Store both exact name and normalized name for better matching
          this.navCache.set(schemeName.toLowerCase(), {
            code: schemeCode,
            name: schemeName,
            nav: parseFloat(nav)
          });
        }

        console.log(`Parsed NAV - Scheme: "${schemeName}", NAV: ${nav}`);
      }
    }
  }

  getNAV(schemeName) {
    const normalizedName = schemeName.toLowerCase();
    const navData = this.navCache.get(normalizedName);
    
    if (!navData) {
      // Try fuzzy matching - find closest match
      for (const [key, value] of this.navCache) {
        if (key.includes(normalizedName) || normalizedName.includes(key)) {
          console.log(`Fuzzy matched: "${schemeName}" -> "${value.name}"`);
          return value.nav;
        }
      }
      console.warn(`NAV not found for scheme: ${schemeName}`);
      return null;
    }
    
    return navData.nav;
  }

  isDataFresh() {
    if (!this.lastFetchDate) return false;
    const hoursSinceLastFetch = (new Date() - this.lastFetchDate) / (1000 * 60 * 60);
    return hoursSinceLastFetch < 24;
  }
}

module.exports = new NAVService();