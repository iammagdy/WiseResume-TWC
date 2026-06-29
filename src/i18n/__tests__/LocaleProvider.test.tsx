import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { BidiText } from '../BidiText';
import { LocaleProvider, useLocale } from '../LocaleProvider';

function Probe() {
  const { locale, direction, setLocale, t } = useLocale();
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span data-testid="direction">{direction}</span>
      <span>{t('common.download')}</span>
      <BidiText data-testid="email">name@example.com</BidiText>
      <button onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')}>switch</button>
    </div>
  );
}

describe('LocaleProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = 'en';
    document.documentElement.dir = 'ltr';
  });

  it('applies Arabic language and direction to the whole document', () => {
    render(<LocaleProvider initialLocale="ar"><Probe /></LocaleProvider>);

    expect(screen.getByTestId('locale')).toHaveTextContent('ar');
    expect(screen.getByTestId('direction')).toHaveTextContent('rtl');
    expect(screen.getByText('تنزيل')).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute('lang', 'ar');
    expect(document.documentElement).toHaveAttribute('dir', 'rtl');
  });

  it('persists user changes and updates document direction', () => {
    render(<LocaleProvider initialLocale="en"><Probe /></LocaleProvider>);

    fireEvent.click(screen.getByRole('button', { name: 'switch' }));

    expect(localStorage.getItem('wiseresume-locale')).toBe('ar');
    expect(document.documentElement).toHaveAttribute('lang', 'ar');
    expect(document.documentElement).toHaveAttribute('dir', 'rtl');
  });

  it('keeps email addresses left-to-right inside Arabic content', () => {
    render(<LocaleProvider initialLocale="ar"><Probe /></LocaleProvider>);
    expect(screen.getByTestId('email')).toHaveAttribute('dir', 'ltr');
  });
});
