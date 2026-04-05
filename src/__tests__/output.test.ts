import {
  setJsonMode,
  isJsonMode,
  printTable,
  printKeyValue,
  success,
  error,
  warn,
  info,
  heading,
  formatDate,
  formatCurrency,
  printJson,
} from '../output';

// Capture console output
let consoleLogSpy: jest.SpyInstance;
let consoleErrorSpy: jest.SpyInstance;

beforeEach(() => {
  consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  setJsonMode(false);
});

afterEach(() => {
  consoleLogSpy.mockRestore();
  consoleErrorSpy.mockRestore();
});

// ── JSON Mode ────────────────────────────────────────────────────────
describe('JSON mode toggle', () => {
  it('defaults to false', () => {
    expect(isJsonMode()).toBe(false);
  });

  it('can be toggled on', () => {
    setJsonMode(true);
    expect(isJsonMode()).toBe(true);
  });

  it('can be toggled back off', () => {
    setJsonMode(true);
    setJsonMode(false);
    expect(isJsonMode()).toBe(false);
  });
});

// ── printJson ────────────────────────────────────────────────────────
describe('printJson', () => {
  it('outputs formatted JSON to console.log', () => {
    printJson({ foo: 'bar', num: 42 });
    expect(consoleLogSpy).toHaveBeenCalledWith(
      JSON.stringify({ foo: 'bar', num: 42 }, null, 2),
    );
  });
});

// ── printTable ───────────────────────────────────────────────────────
describe('printTable', () => {
  const columns = [
    { header: 'ID', key: 'id' },
    { header: 'Name', key: 'name' },
  ];

  it('prints "No results found" for empty rows in non-JSON mode', () => {
    printTable(columns, []);
    const output = consoleLogSpy.mock.calls[0][0];
    expect(output).toContain('No results');
  });

  it('renders a table for non-empty rows', () => {
    printTable(columns, [{ id: '1', name: 'Alice' }]);
    expect(consoleLogSpy).toHaveBeenCalled();
    const output = consoleLogSpy.mock.calls[0][0];
    // Table output should contain the row data
    expect(output).toContain('Alice');
  });

  it('outputs JSON array in JSON mode', () => {
    setJsonMode(true);
    const rows = [{ id: '1', name: 'Bob' }];
    printTable(columns, rows);
    expect(consoleLogSpy).toHaveBeenCalledWith(JSON.stringify(rows, null, 2));
  });

  it('supports nested keys', () => {
    const nestedCols = [{ header: 'Voice', key: 'config.voice' }];
    printTable(nestedCols, [{ config: { voice: 'alloy' } }]);
    const output = consoleLogSpy.mock.calls[0][0];
    expect(output).toContain('alloy');
  });

  it('supports custom formatters', () => {
    const cols = [
      { header: 'Price', key: 'price', formatter: (v: number) => `$${v}` },
    ];
    printTable(cols, [{ price: 9.99 }]);
    const output = consoleLogSpy.mock.calls[0][0];
    expect(output).toContain('$9.99');
  });
});

// ── printKeyValue ────────────────────────────────────────────────────
describe('printKeyValue', () => {
  it('prints label-value pairs in non-JSON mode', () => {
    printKeyValue([
      { label: 'Name', value: 'Acme' },
      { label: 'ID', value: '123' },
    ]);
    expect(consoleLogSpy).toHaveBeenCalledTimes(2);
    const firstCall = consoleLogSpy.mock.calls[0][0] as string;
    expect(firstCall).toContain('Acme');
  });

  it('outputs JSON object in JSON mode', () => {
    setJsonMode(true);
    printKeyValue([
      { label: 'Name', value: 'Acme' },
      { label: 'ID', value: '123' },
    ]);
    const parsed = JSON.parse(consoleLogSpy.mock.calls[0][0]);
    expect(parsed).toEqual({ Name: 'Acme', ID: '123' });
  });
});

// ── Message functions ────────────────────────────────────────────────
describe('success', () => {
  it('logs success message in non-JSON mode', () => {
    success('Done!');
    const output = consoleLogSpy.mock.calls[0][0];
    expect(output).toContain('Done!');
  });

  it('logs JSON in JSON mode', () => {
    setJsonMode(true);
    success('Done!');
    const parsed = JSON.parse(consoleLogSpy.mock.calls[0][0]);
    expect(parsed.status).toBe('success');
    expect(parsed.message).toBe('Done!');
  });
});

describe('error', () => {
  it('logs to stderr in non-JSON mode', () => {
    error('Failed!');
    const output = consoleErrorSpy.mock.calls[0][0];
    expect(output).toContain('Failed!');
  });

  it('logs JSON in JSON mode', () => {
    setJsonMode(true);
    error('Failed!');
    const parsed = JSON.parse(consoleLogSpy.mock.calls[0][0]);
    expect(parsed.status).toBe('error');
    expect(parsed.message).toBe('Failed!');
  });
});

describe('warn', () => {
  it('logs warning message', () => {
    warn('Careful!');
    const output = consoleLogSpy.mock.calls[0][0];
    expect(output).toContain('Careful!');
  });

  it('logs JSON in JSON mode', () => {
    setJsonMode(true);
    warn('Careful!');
    const parsed = JSON.parse(consoleLogSpy.mock.calls[0][0]);
    expect(parsed.status).toBe('warning');
  });
});

describe('info', () => {
  it('logs info message', () => {
    info('Note');
    const output = consoleLogSpy.mock.calls[0][0];
    expect(output).toContain('Note');
  });

  it('logs JSON in JSON mode', () => {
    setJsonMode(true);
    info('Note');
    const parsed = JSON.parse(consoleLogSpy.mock.calls[0][0]);
    expect(parsed.status).toBe('info');
  });
});

describe('heading', () => {
  it('prints heading in non-JSON mode', () => {
    heading('Section Title');
    // heading prints blank line, title, blank line = 3 calls
    expect(consoleLogSpy).toHaveBeenCalledTimes(3);
    const titleCall = consoleLogSpy.mock.calls[1][0];
    expect(titleCall).toContain('Section Title');
  });

  it('does not print anything in JSON mode', () => {
    setJsonMode(true);
    heading('Section Title');
    expect(consoleLogSpy).not.toHaveBeenCalled();
  });
});

// ── Formatting helpers ───────────────────────────────────────────────
describe('formatDate', () => {
  it('formats a valid ISO date string', () => {
    const result = formatDate('2025-01-15T12:00:00Z');
    // Should contain month, day, and year
    expect(result).toMatch(/Jan/);
    expect(result).toMatch(/15/);
    expect(result).toMatch(/2025/);
  });

  it('returns dash indicator for undefined', () => {
    const result = formatDate(undefined);
    // formatDate returns chalk.dim('-') which includes ANSI codes
    expect(result).toContain('-');
  });
});

describe('formatCurrency', () => {
  it('formats whole dollar amounts', () => {
    expect(formatCurrency(10)).toBe('$10.00');
  });

  it('formats fractional amounts', () => {
    expect(formatCurrency(9.5)).toBe('$9.50');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });
});
