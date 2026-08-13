import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const clientDir = path.join(repoRoot, 'client');

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(repoRoot, relativePath), 'utf-8'));
}

describe('client/package.json dependencies', () => {
  const pkg = readJson('client/package.json');

  it('lists react and react-dom as dependencies satisfying ^18', () => {
    expect(pkg.dependencies).toBeDefined();
    expect(pkg.dependencies.react).toMatch(/^[\^~]?18\./);
    expect(pkg.dependencies['react-dom']).toMatch(/^[\^~]?18\./);
  });

  it('lists vite as a devDependency', () => {
    expect(pkg.devDependencies).toBeDefined();
    expect(typeof pkg.devDependencies.vite).toBe('string');
  });

  it('lists @vitejs/plugin-react as a devDependency', () => {
    expect(pkg.devDependencies).toBeDefined();
    expect(typeof pkg.devDependencies['@vitejs/plugin-react']).toBe('string');
  });

  it('does not list react/react-dom/vite in the wrong dependency bucket', () => {
    expect(pkg.devDependencies.react).toBeUndefined();
    expect(pkg.devDependencies['react-dom']).toBeUndefined();
    expect(pkg.dependencies.vite).toBeUndefined();
  });
});

describe('client/vite.config.js', () => {
  it('exists on disk', () => {
    expect(existsSync(path.join(clientDir, 'vite.config.js'))).toBe(true);
  });

  it('registers the React plugin so JSX compiles', () => {
    const source = readFileSync(path.join(clientDir, 'vite.config.js'), 'utf-8');
    expect(source).toMatch(/from ['"]@vitejs\/plugin-react['"]/);
    expect(source).toMatch(/plugins:\s*\[\s*react\(\)/);
    expect(source).toMatch(/export default defineConfig/);
  });
});

describe('client entry point', () => {
  it('index.html loads src/main.jsx as a module', () => {
    const html = readFileSync(path.join(clientDir, 'index.html'), 'utf-8');
    expect(html).toMatch(/<div id="root">/);
    expect(html).toMatch(/src=["']\/src\/main\.jsx["']/);
  });

  it('main.jsx mounts App into the #root element', () => {
    const main = readFileSync(path.join(clientDir, 'src', 'main.jsx'), 'utf-8');
    expect(main).toMatch(/createRoot/);
    expect(main).toMatch(/getElementById\(['"]root['"]\)/);
  });
});

describe('npm run dev starts the Vite dev server', () => {
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

  it('boots without error and prints the ready message', async () => {
    const port = '5183';
    const result = await new Promise((resolve, reject) => {
      let output = '';
      let settled = false;

      child = spawn(
        'npm',
        ['run', 'dev', '--', '--port', port, '--strictPort'],
        { cwd: clientDir, stdio: ['ignore', 'pipe', 'pipe'], detached: true },
      );

      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(new Error(`Vite dev server did not become ready in time. Output so far:\n${output}`));
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
  }, 25000);
});
