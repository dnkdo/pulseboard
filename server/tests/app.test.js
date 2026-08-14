import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { spawn } from 'node:child_process';
import request from 'supertest';
import app from '../src/app.js';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(serverRoot, relativePath), 'utf-8'));
}

describe('server/package.json', () => {
  it('lists express as a dependency', () => {
    const pkg = readJson('package.json');
    expect(typeof pkg.dependencies.express).toBe('string');
  });

  it('declares a start script that runs src/index.js', () => {
    const pkg = readJson('package.json');
    expect(pkg.scripts.start).toMatch(/src\/index\.js/);
  });
});

describe('app.js exported Express instance', () => {
  it('exports an object with Express application methods', () => {
    expect(typeof app.listen).toBe('function');
    expect(typeof app.handle).toBe('function');
    expect(typeof app.use).toBe('function');
    expect(typeof app.get).toBe('function');
  });

  it('responds 200 with an ok status on GET /health', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('responds 404 for an undefined route', async () => {
    const res = await request(app).get('/does-not-exist');
    expect(res.status).toBe(404);
  });
});

describe('server startup (npm start)', () => {
  let child;

  afterEach(() => {
    if (child && !child.killed) {
      child.kill();
    }
  });

  it('starts without error and logs that it is listening on a port', async () => {
    const startedOutput = await new Promise((resolve, reject) => {
      child = spawn(process.execPath, ['src/index.js'], {
        cwd: serverRoot,
        env: { ...process.env, PORT: '3999' },
      });

      let stdout = '';
      let stderr = '';
      const timeout = setTimeout(() => {
        reject(new Error(`Server did not report listening within timeout. stdout=${stdout} stderr=${stderr}`));
      }, 10000);

      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
        if (/listening on port/i.test(stdout)) {
          clearTimeout(timeout);
          resolve(stdout);
        }
      });

      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      child.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });

      child.on('exit', (code) => {
        if (code !== null && code !== 0) {
          clearTimeout(timeout);
          reject(new Error(`Server process exited early with code ${code}. stderr=${stderr}`));
        }
      });
    });

    expect(startedOutput).toMatch(/listening on port 3999/i);
  });
});
