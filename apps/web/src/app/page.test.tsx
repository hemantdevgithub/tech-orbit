import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TechOrbitHomepage from './page';

describe('TechOrbitHomepage', () => {
  it('renders the TechOrbit product selector with both cards', () => {
    render(<TechOrbitHomepage />);
    expect(screen.getByRole('heading', { level: 1, name: /techorbit/i })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: /techforce/i })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: /techproject/i })).toBeTruthy();

    const techforce = screen.getByRole('link', { name: /enter techforce/i });
    expect(techforce.getAttribute('href')).toBe('/techforce/dashboard');

    expect(screen.getByRole('link', { name: /sign in/i }).getAttribute('href')).toBe('/login');
    expect(screen.getByRole('link', { name: /create account/i }).getAttribute('href')).toBe(
      '/register',
    );
  });
});
