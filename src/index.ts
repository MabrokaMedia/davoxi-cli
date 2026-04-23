import { Command } from 'commander';
import chalk from 'chalk';
import { setJsonMode } from './output';
import { registerAuthCommands } from './commands/auth';
import { registerBusinessCommands } from './commands/businesses';
import { registerAgentCommands } from './commands/agents';
import { registerUsageCommands } from './commands/usage';
import { registerBillingCommands } from './commands/billing';
import { registerApiKeyCommands } from './commands/api-keys';
import { registerConfigCommands } from './commands/config';

// Read version from package.json
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkg = require('../../package.json');

export function createProgram(): Command {
  const program = new Command();

  program
    .name('davoxi')
    .description(
      `${chalk.bold('Davoxi CLI')} — Manage AI voice agents from the terminal`
    )
    .version(pkg.version, '-v, --version')
    .option('--api-key <key>', 'API key (overrides env var and config)')
    .option('--api-url <url>', 'API base URL (overrides env var and config)')
    .option('--json', 'Output in JSON format')
    .hook('preAction', (thisCommand) => {
      const opts = thisCommand.opts();
      if (opts.json) {
        setJsonMode(true);
      }
      if (opts.apiKey) {
        process.stderr.write('Warning: Passing API key via --api-key flag exposes it in shell history. Use DAVOXI_API_KEY environment variable instead.\n');
      }
    });

  // Register all command groups
  registerAuthCommands(program);
  registerBusinessCommands(program);
  registerAgentCommands(program);
  registerUsageCommands(program);
  registerBillingCommands(program);
  registerApiKeyCommands(program);
  registerConfigCommands(program);

  // Global error handling
  program.exitOverride();

  return program;
}

export async function run(argv: string[]): Promise<void> {
  const program = createProgram();

  try {
    await program.parseAsync(argv);
  } catch (err: any) {
    // Commander exits with a CommanderError for --help and --version
    if (err.code === 'commander.helpDisplayed' || err.code === 'commander.version') {
      process.exit(0);
    }

    if (err.code?.startsWith('commander.')) {
      // Commander already printed the error
    } else {
      console.error(chalk.red(`\n  Error: ${err.message}\n`));
    }

    process.exit(1);
  }
}
