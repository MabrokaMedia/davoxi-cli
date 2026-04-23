import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { DavoxiConfig } from './types';

const CONFIG_DIR = path.join(os.homedir(), '.davoxi');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

const DEFAULT_API_URL = 'https://api.davoxi.com';

function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  } else {
    fs.chmodSync(CONFIG_DIR, 0o700);
  }
}

export function loadConfig(): DavoxiConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
      return JSON.parse(raw) as DavoxiConfig;
    }
  } catch {
    // Corrupted config — start fresh
  }
  return {};
}

export function saveConfig(config: DavoxiConfig): void {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), {
    encoding: 'utf-8',
    mode: 0o600,
  });
}

export function getConfigValue(key: string): string | undefined {
  const config = loadConfig();
  return (config as Record<string, string | undefined>)[key];
}

export function setConfigValue(key: string, value: string): void {
  const config = loadConfig();
  (config as Record<string, string | undefined>)[key] = value;
  saveConfig(config);
}

/**
 * Validate that a URL is safe to use as an API endpoint.
 * Allows https:// for all hosts, and http:// only for localhost/127.0.0.1.
 */
function validateApiUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid API URL: "${url}"`);
  }
  const isLocalhost =
    parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  if (parsed.protocol !== 'https:' && !(isLocalhost && parsed.protocol === 'http:')) {
    throw new Error(
      `Insecure API URL rejected: "${url}". Only https:// URLs are allowed (http:// is permitted for localhost).`
    );
  }
}

/**
 * Resolve the API URL with priority: CLI flag > env var > config file > default.
 */
export function resolveApiUrl(cliFlag?: string): string {
  const url =
    cliFlag ||
    process.env.DAVOXI_API_URL ||
    getConfigValue('api_url') ||
    DEFAULT_API_URL;
  validateApiUrl(url);
  return url;
}

/**
 * Resolve the API key / access token with priority: CLI flag > env var > config file.
 */
export function resolveAuthToken(cliApiKey?: string): string | undefined {
  return (
    cliApiKey ||
    process.env.DAVOXI_API_KEY ||
    getConfigValue('api_key') ||
    getConfigValue('access_token')
  );
}

export function getConfigPath(): string {
  return CONFIG_FILE;
}
