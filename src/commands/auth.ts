import { Command } from 'commander';
import chalk from 'chalk';
import { DavoxiClient } from '../client';
import { loadConfig, saveConfig, resolveApiUrl, resolveAuthToken } from '../config';
import { success, error, printKeyValue, heading, formatDate, isJsonMode, printJson, createSpinner } from '../output';
import { promptInput } from '../utils/prompts';

export function registerAuthCommands(program: Command): void {
  // ── login ──
  program
    .command('login')
    .description('Authenticate with the Davoxi platform')
    .option('--email <email>', 'Email address (skips interactive prompt)')
    .option('--password <password>', 'Password (skips interactive prompt)')
    .action(async (opts) => {
      const email = opts.email || await promptInput('Email:');
      const password = opts.password || await promptInput('Password:', { mask: true });

      const spinner = createSpinner('Authenticating...');
      try {
        const apiUrl = resolveApiUrl(program.opts().apiUrl);
        const client = new DavoxiClient(apiUrl);
        const tokens = await client.login(email, password);

        const existing = loadConfig();
        saveConfig({
          ...existing,
          api_url: apiUrl,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
        });

        spinner.stop();
        success(`Logged in as ${chalk.bold(email)}`);
      } catch (err: any) {
        spinner.stop();
        error(err.message || 'Login failed');
        process.exit(1);
      }
    });

  // ── logout ──
  program
    .command('logout')
    .description('Clear stored credentials')
    .action(() => {
      const existing = loadConfig();
      delete existing.access_token;
      delete existing.refresh_token;
      saveConfig(existing);
      success('Logged out successfully');
    });

  // ── whoami ──
  program
    .command('whoami')
    .description('Display current user profile')
    .action(async () => {
      const spinner = createSpinner('Fetching profile...');

      try {
        const apiUrl = resolveApiUrl(program.opts().apiUrl);
        const token = resolveAuthToken(program.opts().apiKey);
        if (!token) {
          spinner.stop();
          error('Not authenticated. Run `davoxi login` or set DAVOXI_API_KEY.');
          process.exit(1);
        }

        const client = new DavoxiClient(apiUrl, token);
        const user = await client.whoami();

        spinner.stop();

        if (isJsonMode()) {
          printJson(user);
          return;
        }

        heading('Current User');
        printKeyValue([
          { label: 'ID', value: user.id },
          { label: 'Email', value: user.email },
          { label: 'Name', value: user.name },
          { label: 'Role', value: user.role },
          { label: 'Created', value: formatDate(user.created_at) },
        ]);
        console.log();
      } catch (err: any) {
        spinner.stop();
        error(err.message || 'Failed to fetch profile');
        process.exit(1);
      }
    });
}
