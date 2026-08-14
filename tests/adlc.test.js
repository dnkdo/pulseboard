import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const adlcConfigPath = path.join(repoRoot, '.adlc.json');

describe('.adlc.json', () => {
  it('is well-formed JSON', () => {
    const raw = readFileSync(adlcConfigPath, 'utf-8');
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  const config = JSON.parse(readFileSync(adlcConfigPath, 'utf-8'));

  it('declares a non-empty test_command referencing the test runner', () => {
    expect(typeof config.test_command).toBe('string');
    expect(config.test_command.length).toBeGreaterThan(0);
    expect(config.test_command).toMatch(/test/);
    expect(config.test_command).toBe('npm test');
  });

  it('declares tech_stack including node and react', () => {
    expect(Array.isArray(config.tech_stack)).toBe(true);
    expect(config.tech_stack).toEqual(expect.arrayContaining(['node', 'react']));
  });

  it('declares required_services as an empty array', () => {
    expect(Array.isArray(config.required_services)).toBe(true);
    expect(config.required_services).toEqual([]);
  });

  it('does not declare required_services as null or omitted', () => {
    expect(config.required_services).not.toBeNull();
    expect('required_services' in config).toBe(true);
  });
});
