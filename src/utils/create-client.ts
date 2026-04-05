import { Command } from 'commander';
import { DavoxiClient } from '@davoxi/client';
import { resolveApiUrl, resolveAuthToken } from '../config';
import { error } from '../output';

/**
 * Create an authenticated DavoxiClient from the root program's options.
 * Resolves API URL and auth token from CLI flags, env vars, and config file.
 * Exits the process if no auth token is available.
 */
export function createClient(program: Command): DavoxiClient {
  const apiUrl = resolveApiUrl(program.opts().apiUrl);
  const token = resolveAuthToken(program.opts().apiKey);
  if (!token) {
    error('Not authenticated. Run `davoxi login` or set DAVOXI_API_KEY.');
    process.exit(1);
  }
  return new DavoxiClient({ apiKey: token, apiUrl });
}
