import chalk from 'chalk';
import Table from 'cli-table3';
import ora, { Ora } from 'ora';

// ── JSON Mode ──

let jsonMode = false;

export function setJsonMode(enabled: boolean): void {
  jsonMode = enabled;
}

export function isJsonMode(): boolean {
  return jsonMode;
}

// ── Spinner ──

export function createSpinner(text: string): Ora {
  if (jsonMode) {
    // Return a no-op spinner in JSON mode
    return ora({ text, isSilent: true });
  }
  return ora(text).start();
}

// ── JSON Output ──

export function printJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

// ── Table Output ──

export interface ColumnDef {
  header: string;
  key: string;
  width?: number;
  formatter?: (value: any) => string;
}

export function printTable(columns: ColumnDef[], rows: any[]): void {
  if (jsonMode) {
    printJson(rows);
    return;
  }

  if (rows.length === 0) {
    console.log(chalk.dim('  No results found.'));
    return;
  }

  const table = new Table({
    head: columns.map((c) => chalk.cyan.bold(c.header)),
    style: { head: [], border: ['dim'] },
    ...(columns.some((c) => c.width)
      ? { colWidths: columns.map((c) => c.width ?? null) }
      : {}),
  });

  for (const row of rows) {
    table.push(
      columns.map((col) => {
        const value = getNestedValue(row, col.key);
        return col.formatter ? col.formatter(value) : formatValue(value);
      })
    );
  }

  console.log(table.toString());
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((o, k) => (o != null ? o[k] : undefined), obj);
}

function formatValue(value: any): string {
  if (value === null || value === undefined) return chalk.dim('-');
  if (typeof value === 'boolean') {
    return value ? chalk.green('yes') : chalk.red('no');
  }
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(', ') : chalk.dim('none');
  }
  return String(value);
}

// ── Detail Output ──

export function printKeyValue(
  pairs: Array<{ label: string; value: any }>
): void {
  if (jsonMode) {
    const obj: Record<string, any> = {};
    for (const { label, value } of pairs) {
      obj[label] = value;
    }
    printJson(obj);
    return;
  }

  const maxLabel = Math.max(...pairs.map((p) => p.label.length));
  for (const { label, value } of pairs) {
    const paddedLabel = label.padEnd(maxLabel);
    console.log(
      `  ${chalk.cyan(paddedLabel)}  ${formatValue(value)}`
    );
  }
}

// ── Messages ──

export function success(message: string): void {
  if (jsonMode) {
    printJson({ status: 'success', message });
  } else {
    console.log(chalk.green(`  ✓ ${message}`));
  }
}

export function error(message: string): void {
  if (jsonMode) {
    printJson({ status: 'error', message });
  } else {
    console.error(chalk.red(`  ✗ ${message}`));
  }
}

export function warn(message: string): void {
  if (jsonMode) {
    printJson({ status: 'warning', message });
  } else {
    console.log(chalk.yellow(`  ! ${message}`));
  }
}

export function info(message: string): void {
  if (jsonMode) {
    printJson({ status: 'info', message });
  } else {
    console.log(chalk.dim(`  ${message}`));
  }
}

export function heading(title: string): void {
  if (!jsonMode) {
    console.log();
    console.log(chalk.bold(`  ${title}`));
    console.log();
  }
}

// ── Date Formatting ──

export function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return chalk.dim('-');
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}
