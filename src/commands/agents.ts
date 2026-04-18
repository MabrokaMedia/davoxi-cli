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
import { createAgentSchema, updateAgentSchema } from '@davoxi/validation';

export function registerAgentCommands(program: Command): void {
  const agents = program.command('agents').description('Manage voice agents');

  // ── list ──
  agents
    .command('list')
    .description('List agents for a business')
    .requiredOption('--business <id>', 'Business ID')
    .action(async (opts) => {
      const spinner = createSpinner('Fetching agents...');
      try {
        const client = createClient(program);
        const data = await client.listAgents(opts.business);
        spinner.stop();

        printTable(
          [
            { header: 'Agent ID', key: 'agent_id' },
            { header: 'Description', key: 'description' },
            { header: 'Enabled', key: 'enabled' },
            {
              header: 'Tags',
              key: 'trigger_tags',
              formatter: (v: string[]) => (v?.length ? v.join(', ') : chalk.dim('-')),
            },
            {
              header: 'Invocations',
              key: 'stats.total_invocations',
              formatter: (v: number) => (v != null ? v.toLocaleString() : chalk.dim('-')),
            },
            {
              header: 'Avg Rating',
              key: 'stats.avg_caller_rating',
              formatter: (v: number) =>
                v != null ? `${v.toFixed(1)}/5` : chalk.dim('-'),
            },
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
  agents
    .command('get')
    .description('Get agent details')
    .requiredOption('--business <id>', 'Business ID')
    .requiredOption('--agent <agentId>', 'Agent ID')
    .action(async (opts) => {
      const spinner = createSpinner('Fetching agent...');
      try {
        const client = createClient(program);
        const agent = await client.getAgent(opts.business, opts.agent);
        spinner.stop();

        if (isJsonMode()) {
          printJson(agent);
          return;
        }

        heading(`Agent: ${chalk.bold(agent.agent_id)}`);
        printKeyValue([
          { label: 'Agent ID', value: agent.agent_id },
          { label: 'Business ID', value: agent.business_id },
          { label: 'Description', value: agent.description },
          { label: 'Enabled', value: agent.enabled },
          { label: 'System Prompt', value: agent.system_prompt },
          { label: 'Trigger Tags', value: agent.trigger_tags },
          { label: 'Tools', value: agent.tools?.length ? agent.tools.map(t => t.name).join(', ') : undefined },
          { label: 'Knowledge Sources', value: agent.knowledge_sources },
          { label: 'Invocations', value: agent.stats?.total_invocations },
          { label: 'Resolved', value: agent.stats?.resolved_invocations },
          { label: 'Avg Latency', value: agent.stats?.avg_latency_ms != null ? `${agent.stats.avg_latency_ms}ms` : undefined },
          { label: 'Avg Rating', value: agent.stats?.avg_caller_rating != null ? `${agent.stats.avg_caller_rating.toFixed(1)}/5` : undefined },
        ]);
        console.log();
      } catch (err: any) {
        spinner.stop();
        error(err.message || String(err));
        process.exit(1);
      }
    });

  // ── create ──
  agents
    .command('create')
    .description('Create a new agent')
    .requiredOption('--business <id>', 'Business ID')
    .requiredOption('--description <desc>', 'Agent description')
    .option('--prompt <prompt>', 'System prompt for the agent')
    .option('--tags <tags>', 'Comma-separated trigger tags')
    .option('--enabled <value>', 'Enable or disable agent (true/false)', 'true')
    .action(async (opts) => {
      if (opts.enabled !== 'true' && opts.enabled !== 'false') {
        error('--enabled must be "true" or "false"');
        process.exit(1);
      }

      const body: Record<string, unknown> = {
        description: opts.description,
        enabled: opts.enabled === 'true',
      };

      if (opts.prompt !== undefined) body.system_prompt = opts.prompt;
      if (opts.tags !== undefined) body.trigger_tags = opts.tags.split(',').map((t: string) => t.trim());

      const validated = createAgentSchema.safeParse(body);
      if (!validated.success) {
        error(validated.error.issues.map((i) => i.message).join('\n'));
        process.exit(1);
      }

      const spinner = createSpinner('Creating agent...');
      try {
        const client = createClient(program);
        const agent = await client.createAgent(opts.business, body as any);
        spinner.stop();

        if (isJsonMode()) {
          printJson(agent);
          return;
        }

        success(
          `Agent ${chalk.bold(agent.agent_id)} created for business ${opts.business}`
        );
      } catch (err: any) {
        spinner.stop();
        error(err.message || String(err));
        process.exit(1);
      }
    });

  // ── update ──
  agents
    .command('update')
    .description('Update an agent')
    .requiredOption('--business <id>', 'Business ID')
    .requiredOption('--agent <agentId>', 'Agent ID')
    .option('--description <desc>', 'Agent description')
    .option('--prompt <prompt>', 'System prompt')
    .option('--tags <tags>', 'Comma-separated trigger tags')
    .option('--enabled <value>', 'Enable or disable agent (true/false)')
    .action(async (opts) => {
      if (opts.enabled !== undefined && opts.enabled !== 'true' && opts.enabled !== 'false') {
        error('--enabled must be "true" or "false"');
        process.exit(1);
      }

      const body: Record<string, unknown> = {};

      if (opts.description !== undefined) body.description = opts.description;
      if (opts.prompt !== undefined) body.system_prompt = opts.prompt;
      if (opts.tags !== undefined)
        body.trigger_tags = opts.tags.split(',').map((t: string) => t.trim());
      if (opts.enabled !== undefined)
        body.enabled = opts.enabled === 'true';

      if (Object.keys(body).length === 0) {
        error('No update options provided. Use --description, --prompt, --tags, or --enabled.');
        process.exit(1);
      }

      const validated = updateAgentSchema.safeParse(body);
      if (!validated.success) {
        error(validated.error.issues.map((i) => i.message).join('\n'));
        process.exit(1);
      }

      const spinner = createSpinner('Updating agent...');
      try {
        const client = createClient(program);
        const agent = await client.updateAgent(opts.business, opts.agent, body as any);
        spinner.stop();

        if (isJsonMode()) {
          printJson(agent);
          return;
        }

        success(`Agent ${chalk.bold(opts.agent)} updated`);
      } catch (err: any) {
        spinner.stop();
        error(err.message || String(err));
        process.exit(1);
      }
    });

  // ── delete ──
  agents
    .command('delete')
    .description('Delete an agent')
    .requiredOption('--business <id>', 'Business ID')
    .requiredOption('--agent <agentId>', 'Agent ID')
    .option('--force', 'Skip confirmation prompt')
    .action(async (opts) => {
      let spinner: ReturnType<typeof createSpinner> | undefined;
      try {
        if (!opts.force) {
          const ok = await confirm(
            `Are you sure you want to delete agent ${chalk.bold(opts.agent)}? This cannot be undone.`
          );
          if (!ok) {
            error('Cancelled');
            return;
          }
        }

        spinner = createSpinner('Deleting agent...');
        const client = createClient(program);
        await client.deleteAgent(opts.business, opts.agent);
        spinner.stop();

        success(`Agent ${chalk.bold(opts.agent)} deleted`);
      } catch (err: any) {
        spinner?.stop();
        error(err.message || String(err));
        process.exit(1);
      }
    });

  // ── deploy ──
  agents
    .command('deploy')
    .description('Enable an agent in production')
    .requiredOption('--business <id>', 'Business ID')
    .requiredOption('--agent <agentId>', 'Agent ID')
    .action(async (opts) => {
      const spinner = createSpinner('Deploying agent...');
      try {
        const client = createClient(program);
        await client.updateAgent(opts.business, opts.agent, { enabled: true });
        spinner.stop();

        success(`Agent ${chalk.bold(opts.agent)} is now ${chalk.green('live')} in production`);
      } catch (err: any) {
        spinner.stop();
        error(err.message || String(err));
        process.exit(1);
      }
    });
}
