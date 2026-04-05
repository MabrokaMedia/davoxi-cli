import { Command } from 'commander';
import chalk from 'chalk';
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

export function registerBillingCommands(program: Command): void {
  const billing = program
    .command('billing')
    .description('View billing and subscription info');

  // Default action — show subscription
  billing.action(async () => {
    const spinner = createSpinner('Fetching subscription...');
    try {
      const client = createClient(program);
      const sub = await client.getSubscription();
      spinner.stop();

      if (isJsonMode()) {
        printJson(sub);
        return;
      }

      heading('Current Subscription');

      const statusColor =
        sub.status === 'active'
          ? chalk.green(sub.status)
          : sub.status === 'past_due'
            ? chalk.yellow(sub.status)
            : chalk.red(sub.status);

      printKeyValue([
        { label: 'Plan', value: chalk.bold(sub.plan) },
        { label: 'Status', value: statusColor },
        { label: 'Monthly Cost', value: formatCurrency(sub.monthly_cost || 0) },
        { label: 'Usage Limit', value: sub.usage_limit?.toLocaleString() },
        { label: 'Period Start', value: formatDate(sub.current_period_start) },
        { label: 'Period End', value: formatDate(sub.current_period_end) },
      ]);
      console.log();
    } catch (err: any) {
      spinner.stop();
      error(err.message || String(err));
      process.exit(1);
    }
  });

  // ── invoices ──
  billing
    .command('invoices')
    .description('List invoices')
    .action(async () => {
      const spinner = createSpinner('Fetching invoices...');
      try {
        const client = createClient(program);
        const invoices = await client.listInvoices();
        spinner.stop();

        printTable(
          [
            { header: 'Invoice ID', key: 'invoice_id' },
            { header: 'Date', key: 'date', formatter: formatDate },
            { header: 'Amount', key: 'amount', formatter: (v: number) => formatCurrency(v || 0) },
            {
              header: 'Status',
              key: 'status',
              formatter: (v: string) =>
                v === 'paid'
                  ? chalk.green(v)
                  : v === 'pending'
                    ? chalk.yellow(v)
                    : chalk.red(v),
            },
          ],
          invoices
        );
      } catch (err: any) {
        spinner.stop();
        error(err.message || String(err));
        process.exit(1);
      }
    });
}
