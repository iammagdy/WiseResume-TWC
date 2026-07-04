import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useLocale } from '../LocaleProvider';

function OutsideComponent() {
  const { locale, direction, t } = useLocale();
  return (
    <div>
      <span data-testid="fallback-locale">{locale}</span>
      <span data-testid="fallback-dir">{direction}</span>
      <span data-testid="fallback-t">{t('common.save', 'Save')}</span>
    </div>
  );
}

describe('useLocale fallback context', () => {
  it('returns safe default locale context when rendered outside LocaleProvider without throwing', () => {
    expect(() => render(<OutsideComponent />)).not.toThrow();

    expect(screen.getByTestId('fallback-locale')).toHaveTextContent('en');
    expect(screen.getByTestId('fallback-dir')).toHaveTextContent('ltr');
    expect(screen.getByTestId('fallback-t')).toBeInTheDocument();
  });
});
