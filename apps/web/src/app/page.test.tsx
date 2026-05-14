import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TechOrbitHomepage from './page';

describe('TechOrbitHomepage', () => {
  it('renders hero, product cards, and the begin-with section', () => {
    render(<TechOrbitHomepage />);

    expect(
      screen.getByRole('heading', { level: 1, name: /empowering the future/i }),
    ).toBeTruthy();

    expect(
      screen.getByRole('heading', { level: 3, name: /techforce/i }),
    ).toBeTruthy();
    expect(
      screen.getByRole('heading', { level: 3, name: /techproject/i }),
    ).toBeTruthy();

    expect(screen.getByRole('heading', { level: 3, name: /find a project/i })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 3, name: /find talent/i })).toBeTruthy();

    const techforce = screen.getByRole('link', { name: /enter techforce/i });
    expect(techforce.getAttribute('href')).toBe('/techforce/dashboard');

    const createAccountLinks = screen.getAllByRole('link', { name: /create account/i });
    expect(createAccountLinks.length).toBeGreaterThan(0);
    expect(createAccountLinks[0]?.getAttribute('href')).toBe('/register');
  });
});
