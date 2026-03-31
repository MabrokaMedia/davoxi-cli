import { Command } from 'commander';
import chalk from 'chalk';
import {
  success,
  error,
  warn,
  printTable,
  heading,
  formatDate,
  isJsonMode,
  printJson,
  createSpinner,
} from '../output';
import { confirm } from '../utils/prompts';
import { createClient } from '../utils/create-client';

export function registerApiKeyCommands(program: Command): void {
  const apiKeys = program
    .command('api-keys')
    .description('Manage API keys');

  // ── list ──
  apiKeys
    .command('list')
    .description('List all API keys')
    .action(async () => {
      const spinner = createSpinner('Fetching API keys...');
      try {
        const client = createClient(program);
        const keys = await client.listApiKeys();
        spinner.stop();

        printTable(
          [
            { header: 'Prefix', key: 'prefix' },
            { header: 'Name', key: 'name' },
            { header: 'Created', key: 'created_at', formatter: formatDate },
            { header: 'Last Used', key: 'last_used_at', formatter: formatDate },
          ],
          keys
        );
      } catch (err: any) {
        spinner.stop();
        error(err.message || String(err));
        process.exit(1);
      }
    });

  // ── create ──
  apiKeys
    .command('create')
    .description('Create a new API key')
    .requiredOption('--name <name>', 'Name for the API key')
    .action(async (opts) => {
      const spinner = createSpinner('Creating API key...');
      try {
        const client = createClient(program);
        const result = await client.createApiKey(opts.name);
        spinner.stop();

        if (isJsonMode()) {
          printJson(result);
          return;
        }

        heading('API Key Created');
        console.log();
        console.log(
          `  ${chalk.bold('Key:')} ${chalk.green(result.key)}`
        );
        console.log();
        warn(
          'Save this key now. You will not be able to see it again.'
        );
        console.log();
      } catch (err: any) {
        spinner.stop();
        error(err.message || String(err));
        process.exit(1);
      }
    });

  // ── revoke ──
  apiKeys
    .command('revoke <prefix>')
    .description('Revoke an API key')
    .option('--force', 'Skip confirmation prompt')
    .action(async (prefix: string, opts) => {
      let spinner: ReturnType<typeof createSpinner> | undefined;
      try {
        if (!opts.force) {
          const ok = await confirm(
            `Are you sure you want to revoke the API key ${chalk.bold(`sk_${prefix}...`)}? This cannot be undone.`
          );
          if (!ok) {
            error('Cancelled');
            return;
          }
        }

        spinner = createSpinner('Revoking API key...');
        const client = createClient(program);
        await client.revokeApiKey(prefix);
        spinner.stop();

        success(`API key ${chalk.bold(prefix)} revoked`);
      } catch (err: any) {
        spinner?.stop();
        error(err.message || String(err));
        process.exit(1);
      }
    });
}
