import { describe, it, expect } from 'vitest';

describe('Dashboard', () => {
  it('should be importable', async () => {
    const module = await import('./Dashboard');
    expect(module.Dashboard).toBeDefined();
  });
});
