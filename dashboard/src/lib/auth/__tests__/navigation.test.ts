import { describe, expect, test } from 'vitest';

import { getNavigationItemsForRole } from '../navigation';

describe('getNavigationItemsForRole', () => {
  test('admin ve links operacionais e administrativos', () => {
    const hrefs = getNavigationItemsForRole('admin').map((item) => item.href);

    expect(hrefs).toContain('/dashboard/approval');
    expect(hrefs).toContain('/dashboard/users');
    expect(hrefs).toContain('/dashboard/asset-types');
    expect(hrefs).toContain('/dashboard/audit');
  });

  test('tech nao ve links admin-only', () => {
    const hrefs = getNavigationItemsForRole('tech').map((item) => item.href);

    expect(hrefs).toContain('/dashboard/assets');
    expect(hrefs).not.toContain('/dashboard/users');
    expect(hrefs).not.toContain('/dashboard/audit');
  });

  test('viewer recebe apenas navegacao de leitura', () => {
    const hrefs = getNavigationItemsForRole('viewer').map((item) => item.href);

    expect(hrefs).toEqual([
      '/dashboard',
      '/dashboard/assets',
      '/dashboard/manejos',
      '/dashboard/monitoramentos',
      '/dashboard/map',
    ]);
  });
});
