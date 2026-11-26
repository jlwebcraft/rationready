// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadEnv } from 'vite';
import viteConfig from '../../../../vite.config';

describe('Vite Root Environment Configuration', () => {
  it('sets envDir to repository root containing .env.example and restricts envPrefix to VITE_', () => {
    const config = viteConfig as { envDir?: string; envPrefix?: string | string[] };
    expect(config.envDir).toBeDefined();

    const envDir = config.envDir as string;
    expect(existsSync(path.join(envDir, '.env.example'))).toBe(true);
    expect(existsSync(path.join(envDir, 'RATIONREADY_ROADMAP.md'))).toBe(true);
    expect(config.envPrefix).toBe('VITE_');

    const envExample = readFileSync(path.join(envDir, '.env.example'), 'utf-8');
    expect(envExample).toMatch(/^VITE_API_URL=$/m);
  });

  it('loads root .env.example defaults cleanly via Vite loadEnv without exposing non-VITE variables', () => {
    const config = viteConfig as { envDir?: string; envPrefix?: string };
    const envDir = config.envDir as string;
    const prefix = config.envPrefix ?? 'VITE_';
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'rationready-env-test-'));

    try {
      const envTemplate = readFileSync(path.join(envDir, '.env.example'), 'utf-8');
      writeFileSync(path.join(tempDir, '.env'), envTemplate, 'utf-8');

      const loaded = loadEnv('development', tempDir, prefix);
      expect(loaded.VITE_API_URL).toBe('');
      expect(loaded.VITE_APP_TITLE).toBe('RationReady');
      expect(loaded.AWS_REGION).toBeUndefined();
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
