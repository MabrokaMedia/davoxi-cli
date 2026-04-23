import { Command } from 'commander';
import chalk from 'chalk';
import {
  loadConfig,
  getConfigValue,
  setConfigValue,
  getConfigPath,
} from '../config';
import {
  success,
  error,
  info,
  heading,
  printKeyValue,
  isJsonMode,
  printJson,
} from '../output';

const ALLOWED_KEYS = ['api_url', 'api_key'] as const;

export function registerConfigCommands(program: Command): void {
  const config = program
    .command('config')
    .description('Manage CLI configuration');

  // ── set ──
  config
    .command('set <key> <value>')
    .description('Set a configuration value')
    .action((key: string, value: string) => {
      // Normalize key: allow dashes and underscores
      const normalizedKey = key.replace(/-/g, '_');

      if (!ALLOWED_KEYS.includes(normalizedKey as any)) {
        error(
          `Unknown config key: ${key}. Valid keys: ${ALLOWED_KEYS.join(', ')}`
        );
        process.exit(1);
      }

      // Mask the value for api_key in output
      const displayValue =
        normalizedKey === 'api_key'
          ? `${value.substring(0, 6)}...`
          : value;

      setConfigValue(normalizedKey, value);
      success(`Set ${chalk.bold(normalizedKey)} = ${displayValue}`);
    });

  // ── get ──
  config
    .command('get <key>')
    .description('Get a configuration value')
    .action((key: string) => {
      const normalizedKey = key.replace(/-/g, '_');
      const value = getConfigValue(normalizedKey);

      const isSensitive =
        normalizedKey === 'api_key' ||
        normalizedKey === 'access_token' ||
        normalizedKey === 'refresh_token';

      if (isJsonMode()) {
        const maskedValue =
          isSensitive && typeof value === 'string' && value.length > 6
            ? `${value.substring(0, 6)}${'*'.repeat(Math.max(0, value.length - 6))}`
            : value ?? null;
        printJson({ [normalizedKey]: maskedValue });
        return;
      }

      if (value !== undefined) {
        // Mask sensitive values
        const displayValue =
          isSensitive
            ? `${value.substring(0, 6)}${'*'.repeat(Math.max(0, value.length - 6))}`
            : value;
        console.log(`  ${chalk.cyan(normalizedKey)}: ${displayValue}`);
      } else {
        info(`${normalizedKey} is not set`);
      }
    });

  // ── list ──
  config
    .command('list')
    .description('Show all configuration')
    .action(() => {
      const cfg = loadConfig();

      if (isJsonMode()) {
        // Mask sensitive values even in JSON mode
        const masked = { ...cfg };
        if (masked.api_key) masked.api_key = `${masked.api_key.substring(0, 6)}...`;
        if (masked.access_token) masked.access_token = `${masked.access_token.substring(0, 6)}...`;
        if (masked.refresh_token) masked.refresh_token = `${masked.refresh_token.substring(0, 6)}...`;
        printJson(masked);
        return;
      }

      heading('Configuration');
      info(`Config file: ${getConfigPath()}`);
      console.log();

      const entries = Object.entries(cfg);
      if (entries.length === 0) {
        info('No configuration set. Run `davoxi config set <key> <value>` to configure.');
        return;
      }

      printKeyValue(
        entries.map(([key, value]) => {
          let displayValue = value;
          if (
            (key === 'api_key' || key === 'access_token' || key === 'refresh_token') &&
            typeof value === 'string' &&
            value.length > 6
          ) {
            displayValue = `${value.substring(0, 6)}${'*'.repeat(value.length - 6)}`;
          }
          return { label: key, value: displayValue };
        })
      );
      console.log();
    });
}
