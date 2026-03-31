import { Command } from 'commander';
import {
  error,
  printTable,
  printKeyValue,
  heading,
  formatDate,
  formatCurrency,
  isJsonMode,
  printJson,
  createSpinner,
} from '../output';
import { createClient } from '../utils/create-client';

export function registerUsageCommands(program: Command): void {
  const usage = program.command('usage').description('View usage and analytics');

  // Default action — show summary
  usage.action(async () => {
    const spinner = createSpinner('Fetching usage summary...');
    try {
      const client = createClient(program);
      const summary = await client.getUsageSummary();
      spinner.stop();

      if (isJsonMode()) {
        printJson(summary);
        return;
      }

      heading('Usage Summary');
      printKeyValue([
        { label: 'Total Calls', value: summary.total_calls?.toLocaleString() },
        { label: 'Total Minutes', value: `${summary.total_minutes?.toFixed(1)} min` },
        { label: 'Total Cost', value: formatCurrency(summary.total_cost || 0) },
        { label: 'Period Start', value: formatDate(summary.period_start) },
        { label: 'Period End', value: formatDate(summary.period_end) },
      ]);
      console.log();
    } catch (err: any) {
      spinner.stop();
      error(err.message || String(err));
      process.exit(1);
    }
  });

  // ── detail ──
  usage
    .command('detail')
    .description('Show detailed usage by resource')
    .action(async () => {
      const spinner = createSpinner('Fetching detailed usage...');
      try {
        const client = createClient(program);
        const data = await client.getUsageDetail();
        spinner.stop();

        printTable(
          [
            { header: 'Resource', key: 'resource_name' },
            { header: 'Type', key: 'resource_type' },
            { header: 'Calls', key: 'calls', formatter: (v: number) => v?.toLocaleString() ?? '-' },
            { header: 'Minutes', key: 'minutes', formatter: (v: number) => v != null ? `${v.toFixed(1)}` : '-' },
            { header: 'Cost', key: 'cost', formatter: (v: number) => v != null ? formatCurrency(v) : '-' },
          ],
          data
        );
      } catch (err: any) {
        spinner.stop();
        error(err.message || String(err));
        process.exit(1);
      }
    });
}
