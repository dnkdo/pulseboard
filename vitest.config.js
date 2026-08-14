import { defineConfig, configDefaults } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, 'client/**', 'server/**'],
    // tests/vercel-config.test.js shells out to `vite build` / `vercel build`
    // against the shared client/dist and .vercel/output directories, and
    // tests/vitest-runner.test.js spawns a full nested `npm test` that reuses
    // the same checkout. Running test files concurrently lets those file
    // writes race across processes (stale hashed asset paths, ENOENT mid
    // copy); keep root-suite files sequential so build state stays coherent.
    fileParallelism: false,
  },
});
