import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

jest.mock('fs');
jest.mock('os');

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedOs = os as jest.Mocked<typeof os>;

// Must be set before importing config module
mockedOs.homedir.mockReturnValue('/home/testuser');

// Import after mocking so the module-level constants use the mocked homedir
import {
  loadConfig,
  saveConfig,
  getConfigValue,
  setConfigValue,
  resolveApiUrl,
  resolveAuthToken,
  getConfigPath,
} from '../config';

const CONFIG_DIR = path.join('/home/testuser', '.davoxi');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

describe('config', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedOs.homedir.mockReturnValue('/home/testuser');
    delete process.env.DAVOXI_API_URL;
    delete process.env.DAVOXI_API_KEY;
  });

  // ── getConfigPath ──────────────────────────────────────────────────
  describe('getConfigPath', () => {
    it('returns the expected config file path', () => {
      const result = getConfigPath();
      expect(result).toContain('.davoxi');
      expect(result).toContain('config.json');
    });
  });

  // ── loadConfig ─────────────────────────────────────────────────────
  describe('loadConfig', () => {
    it('returns parsed config when file exists', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(
        JSON.stringify({ api_key: 'sk_test123', api_url: 'https://custom.api.com' })
      );

      const config = loadConfig();
      expect(config).toEqual({ api_key: 'sk_test123', api_url: 'https://custom.api.com' });
    });

    it('returns empty object when file does not exist', () => {
      mockedFs.existsSync.mockReturnValue(false);

      const config = loadConfig();
      expect(config).toEqual({});
    });

    it('returns empty object when file contains malformed JSON', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue('not valid json {{{');

      const config = loadConfig();
      expect(config).toEqual({});
    });

    it('returns empty object when readFileSync throws', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockImplementation(() => {
        throw new Error('EACCES');
      });

      const config = loadConfig();
      expect(config).toEqual({});
    });
  });

  // ── saveConfig ─────────────────────────────────────────────────────
  describe('saveConfig', () => {
    it('creates directory if it does not exist and writes config', () => {
      mockedFs.existsSync.mockReturnValue(false);
      mockedFs.mkdirSync.mockReturnValue(undefined);
      mockedFs.writeFileSync.mockReturnValue(undefined);

      saveConfig({ api_key: 'sk_new' });

      expect(mockedFs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('.davoxi'),
        expect.objectContaining({ recursive: true }),
      );
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('config.json'),
        JSON.stringify({ api_key: 'sk_new' }, null, 2),
        expect.objectContaining({ encoding: 'utf-8' }),
      );
    });

    it('does not create directory if it already exists', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.writeFileSync.mockReturnValue(undefined);

      saveConfig({ api_key: 'sk_existing' });

      expect(mockedFs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  // ── getConfigValue / setConfigValue ────────────────────────────────
  describe('getConfigValue', () => {
    it('returns the value for a known key', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify({ api_key: 'sk_val' }));

      expect(getConfigValue('api_key')).toBe('sk_val');
    });

    it('returns undefined for a missing key', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify({}));

      expect(getConfigValue('api_key')).toBeUndefined();
    });
  });

  describe('setConfigValue', () => {
    it('merges the new key into existing config and saves', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify({ api_key: 'old' }));
      mockedFs.writeFileSync.mockReturnValue(undefined);

      setConfigValue('api_url', 'https://new.api.com');

      const writtenData = JSON.parse(
        (mockedFs.writeFileSync as jest.Mock).mock.calls[0][1] as string,
      );
      expect(writtenData).toEqual({
        api_key: 'old',
        api_url: 'https://new.api.com',
      });
    });
  });

  // ── resolveApiUrl ──────────────────────────────────────────────────
  describe('resolveApiUrl', () => {
    it('uses CLI flag when provided', () => {
      expect(resolveApiUrl('https://cli-flag.com')).toBe('https://cli-flag.com');
    });

    it('falls back to env var when no CLI flag', () => {
      process.env.DAVOXI_API_URL = 'https://env-var.com';
      expect(resolveApiUrl()).toBe('https://env-var.com');
    });

    it('falls back to config file value', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(
        JSON.stringify({ api_url: 'https://config-file.com' }),
      );

      expect(resolveApiUrl()).toBe('https://config-file.com');
    });

    it('falls back to default API URL', () => {
      mockedFs.existsSync.mockReturnValue(false);
      expect(resolveApiUrl()).toBe('https://api.davoxi.com');
    });

    it('CLI flag takes priority over env var', () => {
      process.env.DAVOXI_API_URL = 'https://env.com';
      expect(resolveApiUrl('https://cli.com')).toBe('https://cli.com');
    });
  });

  // ── resolveAuthToken ───────────────────────────────────────────────
  describe('resolveAuthToken', () => {
    it('uses CLI API key when provided', () => {
      expect(resolveAuthToken('sk_cli')).toBe('sk_cli');
    });

    it('falls back to DAVOXI_API_KEY env var', () => {
      process.env.DAVOXI_API_KEY = 'sk_env';
      expect(resolveAuthToken()).toBe('sk_env');
    });

    it('falls back to api_key from config', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify({ api_key: 'sk_config' }));

      expect(resolveAuthToken()).toBe('sk_config');
    });

    it('falls back to access_token from config', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(
        JSON.stringify({ access_token: 'tok_access' }),
      );

      expect(resolveAuthToken()).toBe('tok_access');
    });

    it('returns undefined when no auth source is available', () => {
      mockedFs.existsSync.mockReturnValue(false);
      expect(resolveAuthToken()).toBeUndefined();
    });
  });
});
