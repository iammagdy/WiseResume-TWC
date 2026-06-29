import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/i18n/LocaleProvider';
import { LandingToggle } from '../LandingToggle';

describe('LandingToggle locale behavior', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/ar');
    window.scrollTo = vi.fn();
  });

  it('renders Arabic labels and keeps Arabic public routes', () => {
    render(
      <LocaleProvider initialLocale="ar">
        <LandingToggle
          mode="jobseeker"
          onModeChange={vi.fn()}
          prefersReducedMotion
        />
      </LocaleProvider>,
    );

    expect(screen.getByRole('button', { name: 'للأفراد' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'للشركات' }));
    expect(window.location.pathname).toBe('/ar/enterprises');

    fireEvent.click(screen.getByRole('button', { name: 'للأفراد' }));
    expect(window.location.pathname).toBe('/ar');
  });
});
