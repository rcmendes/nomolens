#!/usr/bin/env node

const { program } = require('commander');
const fs = require('fs');
const chalk = require('chalk');
const { checkDomainsBulk } = require('./godaddy');

program
  .name('domain-checker')
  .description('CLI to check domain name availability via GoDaddy API')
  .version('1.0.0');

program
  .command('check')
  .description('Check availability of a list of domains')
  .option('-f, --file <path>', 'Path to a text file containing domain names (one per line)')
  .option('-d, --domains <comma_separated_domains>', 'Comma-separated list of domains to check')
  .option('-t, --tlds <comma_separated_tlds>', 'Comma-separated list of TLDs to append (e.g. com,io,net)')
  .action(async (options) => {
    let domainNames = [];

    if (options.file) {
      if (!fs.existsSync(options.file)) {
        console.error(chalk.red(`Error: File not found at ${options.file}`));
        process.exit(1);
      }
      const fileContent = fs.readFileSync(options.file, 'utf-8');
      domainNames = fileContent.split('\n').map(d => d.trim()).filter(d => d.length > 0);
    } else if (options.domains) {
      domainNames = options.domains.split(',').map(d => d.trim());
    } else {
      console.error(chalk.red('Error: You must provide either --file or --domains'));
      process.exit(1);
    }

    // Generate combinations if TLDs are provided
    let finalDomainsToCheck = [];
    if (options.tlds) {
      const tlds = options.tlds.split(',').map(tld => tld.trim().replace(/^\./, ''));
      for (const name of domainNames) {
        // If domain already has a dot, we might skip adding the TLD, but for simplicity, 
        // if user uses --tlds, we assume the input are just base names.
        const baseName = name.replace(/\..+$/, ''); // Strip existing TLD if any
        for (const tld of tlds) {
          finalDomainsToCheck.push(`${baseName}.${tld}`);
        }
      }
    } else {
      finalDomainsToCheck = domainNames;
      // Filter out domains without a dot if no TLDs were provided
      finalDomainsToCheck = finalDomainsToCheck.filter(d => {
        if (!d.includes('.')) {
          console.warn(chalk.yellow(`Warning: Skipping "${d}" because it has no TLD. Use --tlds to append TLDs.`));
          return false;
        }
        return true;
      });
    }

    if (finalDomainsToCheck.length === 0) {
      console.log(chalk.yellow('No valid domains to check. Exiting.'));
      process.exit(0);
    }

    console.log(chalk.blue(`\nChecking availability for ${finalDomainsToCheck.length} domains...\n`));

    const results = await checkDomainsBulk(finalDomainsToCheck);

    console.log(chalk.bold('\n--- Results ---\n'));
    let availableCount = 0;

    for (const res of results) {
      if (res.error) {
        console.log(`${chalk.red('✖')} ${res.domain} - ${chalk.red('Error checking')}`);
      } else if (res.available) {
        availableCount++;
        const priceStr = res.price ? ` ($${(res.price / 1000000).toFixed(2)})` : '';
        console.log(`${chalk.green('✔')} ${chalk.bold(res.domain)}${priceStr} - ${chalk.green('AVAILABLE')}`);
      } else {
        console.log(`${chalk.gray('✖')} ${chalk.gray(res.domain)} - ${chalk.yellow('TAKEN')}`);
      }
    }

    console.log(`\n${chalk.bold('Summary:')} ${availableCount} out of ${finalDomainsToCheck.length} available.\n`);
  });

program.parse(process.argv);
