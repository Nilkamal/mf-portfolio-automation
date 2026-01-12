require('dotenv').config();
const schedulerService = require('./src/services/schedulerService');

// Validate required environment variables
const requiredEnvVars = [
  'GOOGLE_SHEETS_ID',
  'GOOGLE_CREDENTIALS_PATH',
  'EMAIL_USER',
  'EMAIL_PASSWORD',
  'EMAIL_TO'
];

function validateEnvironment() {
  const missing = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(varName => console.error(`   - ${varName}`));
    console.error('\nPlease check your .env file and try again.\n');
    process.exit(1);
  }
}

// Check if running in test mode
const isTestMode = process.argv.includes('--test');
const isRunOnce = process.argv.includes('--run-once');

async function main() {
  console.log('\n');
  console.log('═══════════════════════════════════════════');
  console.log('   MF Portfolio Tracker with Google Sheets  ');
  console.log('═══════════════════════════════════════════\n');

  validateEnvironment();
  console.log('✓ Environment variables validated\n');

  if (isTestMode) {
    await schedulerService.runManualTest();
    console.log('Exiting test mode...\n');
    process.exit(0);
  } else if (isRunOnce) {
    // For GitHub Actions - run daily task once and exit
    await schedulerService.runDailyTask();
    console.log('Run-once completed. Exiting...\n');
    process.exit(0);
  } else {
    schedulerService.start();
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n⚠ SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n⚠ SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});