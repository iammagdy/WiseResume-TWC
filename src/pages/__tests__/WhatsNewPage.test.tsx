import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import WhatsNewPage from '../WhatsNewPage';
import { LocaleProvider } from '@/i18n/LocaleProvider';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    user: null,
  }),
}));

vi.mock('@/lib/haptics', () => ({
  default: {
    light: vi.fn(),
  },
}));

describe('WhatsNewPage', () => {
  it('renders the WhatsNew hero header and featured release', () => {
    render(
      <MemoryRouter initialEntries={['/whats-new']}>
        <LocaleProvider>
          <WhatsNewPage />
        </LocaleProvider>
      </MemoryRouter>
    );

    expect(screen.getAllByText(/What's New in WiseResume/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Featured Update/i)).toBeInTheDocument();
    expect(screen.getByText(/Remote Jobs Feed Integrated into Workspace/i)).toBeInTheDocument();
  });

  it('filters release items when category tab is clicked', () => {
    render(
      <MemoryRouter initialEntries={['/whats-new']}>
        <LocaleProvider>
          <WhatsNewPage />
        </LocaleProvider>
      </MemoryRouter>
    );

    const securityCategoryButton = screen.getByRole('button', { name: /Security & Legal/i });
    fireEvent.click(securityCategoryButton);

    expect(screen.getByText(/Updated Legal Policies & Compliance Transparency/i)).toBeInTheDocument();
  });

  it('toggles older 2025 updates when progressive disclosure button is clicked', () => {
    render(
      <MemoryRouter initialEntries={['/whats-new']}>
        <LocaleProvider>
          <WhatsNewPage />
        </LocaleProvider>
      </MemoryRouter>
    );

    expect(screen.queryByText(/WiseResume Official Launch/i)).not.toBeInTheDocument();

    const showOlderBtn = screen.getByRole('button', { name: /Show Older 2025 Updates/i });
    fireEvent.click(showOlderBtn);

    expect(screen.getByText(/WiseResume Official Launch/i)).toBeInTheDocument();
  });

  it('renders canonical footer legal links', () => {
    render(
      <MemoryRouter initialEntries={['/whats-new']}>
        <LocaleProvider>
          <WhatsNewPage />
        </LocaleProvider>
      </MemoryRouter>
    );

    const privacyLink = screen.getByRole('link', { name: /Privacy Policy/i });
    const termsLink = screen.getByRole('link', { name: /Terms of Service/i });
    const refundLink = screen.getByRole('link', { name: /Refund Policy/i });

    expect(privacyLink).toHaveAttribute('href', '/privacy');
    expect(termsLink).toHaveAttribute('href', '/terms');
    expect(refundLink).toHaveAttribute('href', '/refund-policy');
  });

  it('renders Arabic RTL content correctly for /ar/whats-new route', () => {
    render(
      <MemoryRouter initialEntries={['/ar/whats-new']}>
        <LocaleProvider initialLocale="ar">
          <WhatsNewPage />
        </LocaleProvider>
      </MemoryRouter>
    );

    expect(screen.getByText(/مركز تحديثات المنتجات/i)).toBeInTheDocument();
    expect(screen.getByText(/ما الجديد في WiseResume/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /سياسة الخصوصية/i })).toHaveAttribute('href', '/ar/privacy');
    expect(screen.getByRole('link', { name: /شروط الخدمة/i })).toHaveAttribute('href', '/ar/terms');
    expect(screen.getByRole('link', { name: /سياسة الاسترداد/i })).toHaveAttribute('href', '/ar/refund-policy');
  });
});
