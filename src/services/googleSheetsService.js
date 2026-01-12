// ============= src/services/googleSheetsService.js =============
const { google } = require('googleapis');
const path = require('path');

// Special asset types that have direct values (not units requiring NAV)
const DIRECT_VALUE_ASSETS = {
  'stocks': { category: 'equity' },
  'bank balance': { category: 'debt' },
  'epfo': { category: 'debt' },
  'ppf': { category: 'debt' },
  'nps debt': { category: 'debt' },
  'nps equity': { category: 'equity' }
};

// Helper function to parse formatted numbers (handles commas like "1,531,903.05")
function parseFormattedNumber(value) {
  if (!value) return 0;
  // Remove commas and parse as float
  return parseFloat(value.toString().replace(/,/g, '')) || 0;
}

class GoogleSheetsService {
  constructor() {
    this.sheets = null;
    this.auth = null;
  }

  async initialize() {
    try {
      const credentialsPath = path.resolve(process.env.GOOGLE_CREDENTIALS_PATH);
      
      this.auth = new google.auth.GoogleAuth({
        keyFile: credentialsPath,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });

      const authClient = await this.auth.getClient();
      this.sheets = google.sheets({ version: 'v4', auth: authClient });
      
      console.log('Google Sheets API initialized successfully');
    } catch (error) {
      throw new Error(`Failed to initialize Google Sheets API: ${error.message}`);
    }
  }

  async readPortfolio() {
    if (!this.sheets) {
      await this.initialize();
    }

    try {
      const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
      const sheetName = process.env.GOOGLE_SHEETS_NAME || 'Investments';
      const range = `${sheetName}!A:H`; // Columns: Scheme Name, Units, Category
      console.log(`Reading portfolio from Google Sheet: ${spreadsheetId}, Sheet: ${sheetName}`);
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });

      const rows = response.data.values;
      
      if (!rows || rows.length === 0) {
        throw new Error('No data found in Google Sheet');
      }

      // Skip header row (first row)
      const dataRows = rows.slice(1);
      
      const portfolio = [];

      for (const row of dataRows) {
        if (row.length <= 2 || !row[0]) continue;

        const schemeName = row[0]?.trim();
        const schemeNameLower = schemeName.toLowerCase();

        // Check if this is a direct value asset (Stocks, Bank Balance, etc.)
        if (DIRECT_VALUE_ASSETS[schemeNameLower]) {
          
          const directValue = parseFormattedNumber(row[2]);
          if (directValue > 0) {
            portfolio.push({
              schemeName: schemeName,
              value: directValue,
              category: DIRECT_VALUE_ASSETS[schemeNameLower].category,
              isDirectValue: true
            });
          }
        } else {
          // Mutual fund entry - uses units from column 8 (index 7)
          const units = parseFormattedNumber(row[7]);
          if (units > 0) {
            portfolio.push({
              schemeName: schemeName,
              units: units,
              category: row[1]?.trim().toLowerCase() || 'equity',
              isDirectValue: false
            });
          }
        }
      }
      
      console.log(`Read ${portfolio.length} holdings from Google Sheet`);
      return portfolio;

    } catch (error) {
      if (error.code === 404) {
        throw new Error('Google Sheet not found. Check GOOGLE_SHEETS_ID and ensure service account has access.');
      }
      throw new Error(`Failed to read Google Sheet: ${error.message}`);
    }
  }
}

module.exports = new GoogleSheetsService();