import { Command } from 'commander';
import chalk from 'chalk';
import {
  success,
  error,
  printTable,
  printKeyValue,
  heading,
  formatDate,
  isJsonMode,
  printJson,
  createSpinner,
} from '../output';
import { confirm } from '../utils/prompts';
import { createClient } from '../utils/create-client';

export function registerBusinessCommands(program: Command): void {
  const businesses = program
    .command('businesses')
    .description('Manage businesses');

  // ── list ──
  businesses
    .command('list')
    .description('List all businesses')
    .action(async () => {
      const spinner = createSpinner('Fetching businesses...');
      try {
        const client = createClient(program);
        const data = await client.listBusinesses();
        spinner.stop();

        printTable(
          [
            { header: 'ID', key: 'business_id' },
            { header: 'Name', key: 'name' },
            { header: 'Voice', key: 'voice_config.voice' },
            { header: 'Language', key: 'voice_config.language' },
            { header: 'Phones', key: 'phone_numbers', formatter: (v: string[]) => (v?.length ? v.join(', ') : chalk.dim('-')) },
            { header: 'Created', key: 'created_at', formatter: formatDate },
          ],
          data
        );
      } catch (err: any) {
        spinner.stop();
        error(err.message || String(err));
        process.exit(1);
      }
    });

  // ── get ──
  businesses
    .command('get <id>')
    .description('Get business details')
    .action(async (id: string) => {
      const spinner = createSpinner('Fetching business...');
      try {
        const client = createClient(program);
        const biz = await client.getBusiness(id);
        spinner.stop();

        if (isJsonMode()) {
          printJson(biz);
          return;
        }

        heading(`Business: ${chalk.bold(biz.name)}`);
        printKeyValue([
          { label: 'ID', value: biz.business_id },
          { label: 'Name', value: biz.name },
          { label: 'Phone Numbers', value: biz.phone_numbers },
          { label: 'Voice', value: biz.voice_config?.voice },
          { label: 'Language', value: biz.voice_config?.language },
          { label: 'Personality', value: biz.voice_config?.personality_prompt },
          { label: 'Pipeline', value: biz.voice_config?.pipeline },
          { label: 'Temperature', value: biz.master_config?.temperature },
          { label: 'Max Specialists', value: biz.master_config?.max_specialists_per_turn },
          { label: 'Created', value: formatDate(biz.created_at) },
          { label: 'Updated', value: formatDate(biz.updated_at) },
        ]);
        console.log();
      } catch (err: any) {
        spinner.stop();
        error(err.message || String(err));
        process.exit(1);
      }
    });

  // ── create ──
  businesses
    .command('create')
    .description('Create a new business')
    .requiredOption('--name <name>', 'Business name')
    .option('--phone <numbers...>', 'Phone numbers')
    .option('--voice <voice>', 'Voice (e.g., alloy)')
    .option('--language <lang>', 'Language (e.g., en-US)')
    .option('--personality <prompt>', 'Personality prompt')
    .option('--temperature <temp>', 'Temperature (0-2)', parseFloat)
    .action(async (opts) => {
      if (opts.temperature !== undefined && (isNaN(opts.temperature) || opts.temperature < 0 || opts.temperature > 2)) {
        error('--temperature must be a number between 0 and 2');
        process.exit(1);
      }

      const spinner = createSpinner('Creating business...');
      try {
        const client = createClient(program);
        const body: Record<string, unknown> = { name: opts.name };

        if (opts.phone !== undefined) body.phone_numbers = opts.phone;

        const voiceConfig: Record<string, unknown> = {};
        if (opts.voice !== undefined) voiceConfig.voice = opts.voice;
        if (opts.language !== undefined) voiceConfig.language = opts.language;
        if (opts.personality !== undefined) voiceConfig.personality_prompt = opts.personality;
        if (Object.keys(voiceConfig).length > 0) body.voice_config = voiceConfig;

        const masterConfig: Record<string, unknown> = {};
        if (opts.temperature !== undefined) masterConfig.temperature = opts.temperature;
        if (Object.keys(masterConfig).length > 0) body.master_config = masterConfig;

        const biz = await client.createBusiness(body as any);
        spinner.stop();

        if (isJsonMode()) {
          printJson(biz);
          return;
        }

        success(`Business ${chalk.bold(biz.name)} created (ID: ${biz.business_id})`);
      } catch (err: any) {
        spinner.stop();
        error(err.message || String(err));
        process.exit(1);
      }
    });

  // ── update ──
  businesses
    .command('update <id>')
    .description('Update a business')
    .option('--name <name>', 'Business name')
    .option('--phone <numbers...>', 'Phone numbers')
    .option('--voice <voice>', 'Voice')
    .option('--language <lang>', 'Language')
    .option('--personality <prompt>', 'Personality prompt')
    .option('--temperature <temp>', 'Temperature (0-2)', parseFloat)
    .action(async (id: string, opts) => {
      if (opts.temperature !== undefined && (isNaN(opts.temperature) || opts.temperature < 0 || opts.temperature > 2)) {
        error('--temperature must be a number between 0 and 2');
        process.exit(1);
      }

      const spinner = createSpinner('Updating business...');
      try {
        const client = createClient(program);
        const body: Record<string, unknown> = {};

        if (opts.name !== undefined) body.name = opts.name;
        if (opts.phone !== undefined) body.phone_numbers = opts.phone;

        const voiceConfig: Record<string, unknown> = {};
        if (opts.voice !== undefined) voiceConfig.voice = opts.voice;
        if (opts.language !== undefined) voiceConfig.language = opts.language;
        if (opts.personality !== undefined) voiceConfig.personality_prompt = opts.personality;
        if (Object.keys(voiceConfig).length > 0) body.voice_config = voiceConfig;

        const masterConfig: Record<string, unknown> = {};
        if (opts.temperature !== undefined) masterConfig.temperature = opts.temperature;
        if (Object.keys(masterConfig).length > 0) body.master_config = masterConfig;

        if (Object.keys(body).length === 0) {
          spinner.stop();
          error('No update options provided. Use --name, --phone, --voice, --language, --personality, or --temperature.');
          process.exit(1);
        }

        const biz = await client.updateBusiness(id, body as any);
        spinner.stop();

        if (isJsonMode()) {
          printJson(biz);
          return;
        }

        success(`Business ${chalk.bold(id)} updated`);
      } catch (err: any) {
        spinner.stop();
        error(err.message || String(err));
        process.exit(1);
      }
    });

  // ── delete ──
  businesses
    .command('delete <id>')
    .description('Delete a business')
    .option('--force', 'Skip confirmation prompt')
    .action(async (id: string, opts) => {
      let spinner: ReturnType<typeof createSpinner> | undefined;
      try {
        if (!opts.force) {
          const ok = await confirm(
            `Are you sure you want to delete business ${chalk.bold(id)}? This cannot be undone.`
          );
          if (!ok) {
            error('Cancelled');
            return;
          }
        }

        spinner = createSpinner('Deleting business...');
        const client = createClient(program);
        await client.deleteBusiness(id);
        spinner.stop();

        success(`Business ${chalk.bold(id)} deleted`);
      } catch (err: any) {
        spinner?.stop();
        error(err.message || String(err));
        process.exit(1);
      }
    });
}
