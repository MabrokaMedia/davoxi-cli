jest.mock('@davoxi/client', () => ({
  DavoxiClient: jest.fn().mockImplementation((opts: any) => ({
    _opts: opts,
  })),
}));

jest.mock('../config', () => ({
  resolveApiUrl: jest.fn(),
  resolveAuthToken: jest.fn(),
}));

jest.mock('../output', () => ({
  error: jest.fn(),
}));

import { Command } from 'commander';
import { DavoxiClient } from '@davoxi/client';
import { resolveApiUrl, resolveAuthToken } from '../config';
import { error } from '../output';
import { createClient } from '../utils/create-client';

const mockedResolveApiUrl = resolveApiUrl as jest.MockedFunction<typeof resolveApiUrl>;
const mockedResolveAuthToken = resolveAuthToken as jest.MockedFunction<typeof resolveAuthToken>;
const MockedDavoxiClient = DavoxiClient as jest.MockedClass<typeof DavoxiClient>;

describe('createClient', () => {
  let program: Command;
  const originalExit = process.exit;

  beforeEach(() => {
    jest.clearAllMocks();
    program = new Command();
    program.option('--api-url <url>');
    program.option('--api-key <key>');
    // Prevent commander from calling process.exit
    program.exitOverride();
    process.exit = jest.fn() as any;
  });

  afterEach(() => {
    process.exit = originalExit;
  });

  it('creates a DavoxiClient with resolved API URL and token', () => {
    program.parse(['--api-url', 'https://custom.api.com', '--api-key', 'sk_test'], { from: 'user' });

    mockedResolveApiUrl.mockReturnValue('https://custom.api.com');
    mockedResolveAuthToken.mockReturnValue('sk_test');

    const client = createClient(program);

    expect(mockedResolveApiUrl).toHaveBeenCalledWith('https://custom.api.com');
    expect(mockedResolveAuthToken).toHaveBeenCalledWith('sk_test');
    expect(MockedDavoxiClient).toHaveBeenCalledWith({
      apiKey: 'sk_test',
      apiUrl: 'https://custom.api.com',
    });
    expect(client).toBeDefined();
  });

  it('exits with error when no auth token is available', () => {
    program.parse([], { from: 'user' });

    mockedResolveApiUrl.mockReturnValue('https://api.davoxi.com');
    mockedResolveAuthToken.mockReturnValue(undefined);

    createClient(program);

    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('Not authenticated'),
    );
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('uses default API URL when none provided', () => {
    program.parse([], { from: 'user' });

    mockedResolveApiUrl.mockReturnValue('https://api.davoxi.com');
    mockedResolveAuthToken.mockReturnValue('sk_default');

    createClient(program);

    expect(MockedDavoxiClient).toHaveBeenCalledWith({
      apiKey: 'sk_default',
      apiUrl: 'https://api.davoxi.com',
    });
  });
});
