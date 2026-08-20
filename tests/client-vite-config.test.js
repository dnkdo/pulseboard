import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const clientDir = path.join(repoRoot, 'client');
const source = readFileSync(path.join(clientDir, 'vite.config.js'), 'utf-8');

describe('client/vite.config.js', () => {
  it('imports the React plugin from @vitejs/plugin-react', () => {
    expect(source).toMatch(/from ['"]@vitejs\/plugin-react['"]/);
  });

  it('registers the React plugin in the plugins array', () => {
    expect(source).toMatch(/plugins:\s*\[\s*react\(\)/);
  });

  it('is built via defineConfig from vite, not a bare object', () => {
    expect(source).toMatch(/from ['"]vite['"]/);
    expect(source).toMatch(/export default defineConfig/);
  });

  it('does not accidentally reference an unrelated framework plugin', () => {
    expect(source).not.toMatch(/@vitejs\/plugin-vue/);
    expect(source).not.toMatch(/@sveltejs\//);
  });
});

describe('npm run dev', () => {
  let child;

  afterEach(() => {
    if (child && child.pid && !child.killed) {
      try {
        process.kill(-child.pid, 'SIGKILL');
      } catch {
        child.kill('SIGKILL');
      }
    }
  });

  it('starts the Vite dev server without error and exits cleanly on kill', async () => {
    const port = '5184';
    const result = await new Promise((resolve, reject) => {
      let output = '';
      let settled = false;

      child = spawn('npm', ['run', 'dev', '--', '--port', port, '--strictPort'], {
        cwd: clientDir,
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: true,
      });

      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(
            new Error(`Vite dev server did not become ready in time. Output so far:\n${output}`),
          );
        }
      }, 20000);

      child.stdout.on('data', (chunk) => {
        output += chunk.toString();
        if (!settled && /ready in/i.test(output)) {
          settled = true;
          clearTimeout(timer);
          resolve(output);
        }
      });

      child.stderr.on('data', (chunk) => {
        output += chunk.toString();
      });

      child.on('exit', (code) => {
        if (!settled && code !== null && code !== 0) {
          settled = true;
          clearTimeout(timer);
          reject(new Error(`Vite dev server exited early with code ${code}. Output:\n${output}`));
        }
      });

      child.on('error', (err) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          reject(err);
        }
      });
    });

    expect(result).toMatch(/ready in/i);
    expect(result).not.toMatch(/error/i);

    const exitCode = await new Promise((resolve) => {
      child.on('exit', (code) => resolve(code));
      try {
        process.kill(-child.pid, 'SIGTERM');
      } catch {
        child.kill('SIGTERM');
      }
    });
    expect(exitCode === null || exitCode === 0).toBe(true);
  }, 25000);
});
