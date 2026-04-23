import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import RootPage from './page';

// Root page is a pure redirect — mock the deps it uses.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock('@/store/auth.store', () => ({
  useAuthStore: () => ({ status: 'unauthenticated', user: null }),
}));

describe('RootPage', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders without crashing (returns null while redirecting)', () => {
    const { container } = render(<RootPage />);
    expect(container.firstChild).toBeNull();
  });
});
