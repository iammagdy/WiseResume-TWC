import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { LanguageSwitcher } from '../LanguageSwitcher';
import { LocaleProvider } from '../LocaleProvider';

describe('LanguageSwitcher', () => {
  beforeEach(() => localStorage.clear());

  it('switches the platform to Arabic and exposes an Arabic label', () => {
    render(
      <LocaleProvider initialLocale="en">
        <LanguageSwitcher />
      </LocaleProvider>,
    );

    fireEvent.change(screen.getByRole('combobox', { name: 'Language' }), { target: { value: 'ar' } });

    expect(document.documentElement).toHaveAttribute('dir', 'rtl');
    expect(screen.getByRole('combobox', { name: 'اللغة' })).toHaveValue('ar');
  });
});
