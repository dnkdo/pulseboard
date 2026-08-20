import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync, readFileSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// tests/vitest-runner.test.js spawns a full nested `npm test` subprocess to
// verify the CLI's end-to-end exit behavior. That nested run shares this same
// checkout's `client/dist` and `.vercel/output` directories with whichever
// top-level `vitest run` triggered it, so if both copies of this file try to
// run `vite build` / `vercel build` at the same time they race and corrupt
// each other's output (stale hashed asset filenames, ENOENT mid-copy). The
// nested subprocess already sets PULSEBOARD_TEST_NO_RECURSE=1 for the same
// reason vitest-runner.test.js short-circuits its own recursive spawn — skip
// the heavy, filesystem-mutating build assertions there too, since the
// top-level run that triggered the recursion already exercises them for real.
const isRecursedRun = process.env.PULSEBOARD_TEST_NO_RECURSE === '1';

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(repoRoot, relativePath), 'utf-8'));
}

describe('vercel.json shape', () => {
  const config = readJson('vercel.json');

  it('is a well-formed vercel v2 config with a builds array', () => {
    expect(config.version).toBe(2);
    expect(Array.isArray(config.builds)).toBe(true);
  });

  it('defines a static-build entry targeting the client workspace', () => {
    const clientBuild = config.builds.find((b) => b.use === '@vercel/static-build');
    expect(clientBuild).toBeDefined();
    expect(clientBuild.src).toBe('client/package.json');
    expect(clientBuild.config?.distDir).toBe('dist');
  });

  it('defines a node entry targeting the server workspace', () => {
    const serverBuild = config.builds.find((b) => b.use === '@vercel/node');
    expect(serverBuild).toBeDefined();
    expect(serverBuild.src).toMatch(/^server\//);
    expect(existsSync(path.join(repoRoot, serverBuild.src))).toBe(true);
  });

  it('routes /api/* to the server build ahead of the SPA catch-all route', () => {
    expect(Array.isArray(config.routes)).toBe(true);

    const serverBuild = config.builds.find((b) => b.use === '@vercel/node');
    const apiRouteIndex = config.routes.findIndex((r) => /api/.test(r.src));
    const catchAllIndex = config.routes.findIndex((r) => r.src === '/(.*)');

    expect(apiRouteIndex).toBeGreaterThanOrEqual(0);
    expect(catchAllIndex).toBeGreaterThanOrEqual(0);
    expect(apiRouteIndex).toBeLessThan(catchAllIndex);
    expect(config.routes[apiRouteIndex].dest).toBe(serverBuild.src);
  });

  it('routes the catch-all rule to the client static output', () => {
    const catchAll = config.routes.find((r) => r.src === '/(.*)');
    expect(catchAll.dest).toMatch(/^client\//);
  });
});

describe('client/package.json build script', () => {
  it('defines a non-empty build script that invokes vite build', () => {
    const pkg = readJson('client/package.json');
    expect(typeof pkg.scripts.build).toBe('string');
    expect(pkg.scripts.build.length).toBeGreaterThan(0);
    expect(pkg.scripts.build).toMatch(/vite build/);
  });
});

describe('client build produces a static output directory', () => {
  it.skipIf(isRecursedRun)('running the workspace build script emits dist/index.html', () => {
    execFileSync('npm', ['run', 'build', '--workspace=client'], {
      cwd: repoRoot,
      stdio: 'pipe',
    });

    const distDir = path.join(repoRoot, 'client', 'dist');
    expect(existsSync(distDir)).toBe(true);
    expect(existsSync(path.join(distDir, 'index.html'))).toBe(true);
  }, 60_000);
});

describe('local vercel build', () => {
  const vercelBin = path.join(repoRoot, 'node_modules', '.bin', 'vercel');
  const projectLinkPath = path.join(repoRoot, '.vercel', 'project.json');

  beforeAll(() => {
    // `vercel build` needs a linked project to skip network calls to the
    // Vercel API (account/team lookup). Provision a local-only link file
    // (gitignored) so the build stays hermetic in CI, matching how
    // `vercel pull` links a real project in the deploy workflow.
    if (!existsSync(projectLinkPath)) {
      mkdirSync(path.dirname(projectLinkPath), { recursive: true });
      writeFileSync(
        projectLinkPath,
        JSON.stringify({
          projectId: 'prj_pulseboard_local_test',
          orgId: 'team_pulseboard_local_test',
          settings: { createdAt: 0 },
        }),
      );
    }
  });

  it.skipIf(isRecursedRun)('completes with no configuration errors and produces the expected build output', () => {
    // `execFileSync` throws on a non-zero exit code, so simply reaching the
    // assertions below already proves the build didn't fail. We avoid
    // matching on human-readable CLI summary text (e.g. "Build completed
    // successfully." vs "Build Completed in ...") since that phrasing is
    // not a stable contract across Vercel CLI versions/output modes;
    // instead we verify the actual build artifacts on disk.
    execFileSync(vercelBin, ['build', '--yes'], {
      cwd: repoRoot,
      encoding: 'utf-8',
      timeout: 120_000,
    });

    const outputDir = path.join(repoRoot, '.vercel', 'output');
    expect(existsSync(path.join(outputDir, 'config.json'))).toBe(true);
    expect(existsSync(path.join(outputDir, 'static', 'client', 'index.html'))).toBe(true);

    const buildOutputConfig = JSON.parse(
      readFileSync(path.join(outputDir, 'config.json'), 'utf-8'),
    );
    const apiRoute = buildOutputConfig.routes.find((r) => /api/.test(r.src));
    expect(apiRoute).toBeDefined();
    expect(existsSync(path.join(outputDir, 'functions', apiRoute.dest.replace(/\.js$/, '.js.func')))).toBe(
      true,
    );
  }, 150_000);

  // Regression test for PLB-164: production smoke checks kept getting a 500
  // (FUNCTION_INVOCATION_FAILED — a crashed function, not an app-level error
  // response) on GET /api/health. server/tests/health.test.js (PLB-163)
  // already proves the *source* module graph degrades gracefully when the db
  // import chain throws, by using vi.doMock to fake the failure at the ESM
  // module-registry level. That's a real gap: it can't catch a failure mode
  // introduced by Vercel's own build step, e.g. a better-sqlite3 native
  // binding bundled for the wrong Node ABI (`npm install` compiling it under
  // one Node major version, the deployed function running another) — which
  // is a real risk here, since `vercel build`'s own dependency install step
  // does not necessarily run under the same Node version as the CI/deploy
  // workflow's pinned actions/setup-node step. This test closes that gap by
  // building the actual deployable function with a real `vercel build`,
  // corrupting *that* artifact's own bundled native binding the same way a
  // bad prebuild would, and asserting GET /api/health on that exact bundle
  // still returns 200 rather than crashing the function.
  it.skipIf(isRecursedRun)(
    'GET /api/health on the real built function artifact returns 200 even when its bundled db native binding is broken',
    () => {
      execFileSync(vercelBin, ['build', '--yes'], {
        cwd: repoRoot,
        encoding: 'utf-8',
        timeout: 120_000,
      });

      const config = readJson('vercel.json');
      const serverBuild = config.builds.find((b) => b.use === '@vercel/node');
      const funcDir = path.join(repoRoot, '.vercel', 'output', 'functions', `${serverBuild.src}.func`);
      const bundledAppPath = path.join(funcDir, serverBuild.src);
      expect(existsSync(bundledAppPath)).toBe(true);

      const bindingPath = path.join(
        funcDir,
        'node_modules',
        'better-sqlite3',
        'build',
        'Release',
        'better_sqlite3.node',
      );
      expect(existsSync(bindingPath)).toBe(true);

      const original = readFileSync(bindingPath);
      writeFileSync(bindingPath, Buffer.from('corrupted-not-a-real-native-binding-plb-164'));

      try {
        const script = `
          import request from 'supertest';
          const { default: app } = await import(${JSON.stringify(bundledAppPath)});
          const health = await request(app).get('/api/health');
          console.log('HEALTH_STATUS:' + health.status);
        `;
        const result = execFileSync(process.execPath, ['--input-type=module', '-e', script], {
          cwd: repoRoot,
          encoding: 'utf-8',
          timeout: 15_000,
        });

        expect(result).toContain('HEALTH_STATUS:200');
      } finally {
        writeFileSync(bindingPath, original);
      }
    },
    150_000,
  );

  it.skipIf(isRecursedRun)('fails with a non-zero exit code on an invalid build config', () => {
    const invalidConfigPath = path.join(repoRoot, '.vercel-invalid-test.json');
    writeFileSync(
      invalidConfigPath,
      JSON.stringify({
        version: 2,
        // Missing/wrong `src` for @vercel/static-build: points at a file
        // that isn't a package.json or build.sh, which Vercel rejects.
        builds: [{ src: 'README.md', use: '@vercel/static-build' }],
      }),
    );

    try {
      expect(() =>
        execFileSync(vercelBin, ['build', '--yes', '--local-config', invalidConfigPath], {
          cwd: repoRoot,
          encoding: 'utf-8',
          timeout: 60_000,
        }),
      ).toThrow();
    } finally {
      rmSync(invalidConfigPath, { force: true });
    }
  }, 70_000);
});
