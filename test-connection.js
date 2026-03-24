require('dotenv').config();
const { checkDomainAvailability, checkDomainsBulk } = require('./godaddy');
const chalk = require('chalk');

async function runTest() {
  console.info(chalk.blue('Starting API Test...'));

  const testDomain = 'google.com';
  console.info(`Checking single domain: ${testDomain}`);

  const result = await checkDomainAvailability(testDomain);

  if (result.error) {
    console.info(chalk.red('✖ API call failed! Check your credentials and GODADDY_API_URL in .env.'));
    process.exit(1);
  }

  console.info(chalk.green('✔ API call successful!'));
  console.info('Result:', JSON.stringify(result, null, 2));

  console.info('\nChecking bulk domains: google.com, test-availability-123.com');
  const bulkResults = await checkDomainsBulk(['google.com', 'test-availability-123.com']);
  console.info('Bulk Result:', JSON.stringify(bulkResults, null, 2));

  if (bulkResults.length > 0) {
    console.info(chalk.green('\n✔ Connection verified. The CLI is ready for production.'));
  } else {
    console.info(chalk.yellow('\n⚠ Bulk results returned empty. This might be an API issue or OTE limitation.'));
  }
}

runTest();
