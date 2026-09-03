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
    expect(screen.getByText(/Remote Jobs Feed Integrated into WiseResume/i)).toBeInTheDocument();
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

  it('filters releases when category and month selector are both active', () => {
    render(
      <MemoryRouter initialEntries={['/whats-new']}>
        <LocaleProvider>
          <WhatsNewPage />
        </LocaleProvider>
      </MemoryRouter>
    );

    // Select month button for August 2026 using exact match
    const augButton = screen.getByRole('button', { name: 'August 2026', exact: true });
    fireEvent.click(augButton);

    // Select category button for Security & Legal
    const securityButton = screen.getByRole('button', { name: /Security & Legal/i });
    fireEvent.click(securityButton);

    expect(screen.getByText(/Updated Legal Policies & Compliance Transparency/i)).toBeInTheDocument();
  });

  describe('Monthly Progressive Disclosure Architecture', () => {
    it('renders recent months (September and August 2026) expanded by default and older months collapsed', () => {
      render(
        <MemoryRouter initialEntries={['/whats-new']}>
          <LocaleProvider>
            <WhatsNewPage />
          </LocaleProvider>
        </MemoryRouter>
      );

      // September 2026 and August 2026 should be expanded
      const hideSepBtn = screen.getByRole('button', { name: /Hide September 2026 updates/i });
      expect(hideSepBtn).toHaveAttribute('aria-expanded', 'true');

      const hideAugBtn = screen.getByRole('button', { name: /Hide August 2026 updates/i });
      expect(hideAugBtn).toHaveAttribute('aria-expanded', 'true');

      // July 2026 should be collapsed by default
      const showJulBtn = screen.getByRole('button', { name: /Show July 2026 updates/i });
      expect(showJulBtn).toHaveAttribute('aria-expanded', 'false');

      // July content should not be in document initially
      expect(screen.queryByText(/Authenticated Workspace Announcements & Notifications/i)).not.toBeInTheDocument();
    });

    it('expands an older month when its expand button is clicked and collapses when clicked again', () => {
      render(
        <MemoryRouter initialEntries={['/whats-new']}>
          <LocaleProvider>
            <WhatsNewPage />
          </LocaleProvider>
        </MemoryRouter>
      );

      const showJulBtn = screen.getByRole('button', { name: /Show July 2026 updates/i });
      fireEvent.click(showJulBtn);

      // Should now be expanded
      expect(screen.getByRole('button', { name: /Hide July 2026 updates/i })).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByText(/Authenticated Workspace Announcements & Notifications/i)).toBeInTheDocument();

      // Click collapse
      const hideJulBtn = screen.getByRole('button', { name: /Hide July 2026 updates/i });
      fireEvent.click(hideJulBtn);

      // Should be collapsed again
      expect(screen.queryByText(/Authenticated Workspace Announcements & Notifications/i)).not.toBeInTheDocument();
    });

    it('expands a collapsed month when selected from the month jump bar', () => {
      render(
        <MemoryRouter initialEntries={['/whats-new']}>
          <LocaleProvider>
            <WhatsNewPage />
          </LocaleProvider>
        </MemoryRouter>
      );

      // Click July 2026 in jump bar
      const julJumpBtn = screen.getByRole('button', { name: 'July 2026', exact: true });
      fireEvent.click(julJumpBtn);

      // July 2026 should now be exposed
      expect(screen.getByText(/Authenticated Workspace Announcements & Notifications/i)).toBeInTheDocument();
    });

    it('automatically exposes matching monthly groups when a filter is applied without manual expansion', () => {
      render(
        <MemoryRouter initialEntries={['/whats-new']}>
          <LocaleProvider>
            <WhatsNewPage />
          </LocaleProvider>
        </MemoryRouter>
      );

      // Click "Fixes" type filter (which matches April 2026 apr-2026-pdf-export-layout)
      const fixesBtn = screen.getByRole('button', { name: 'Fixes', exact: true });
      fireEvent.click(fixesBtn);

      // April 2026 item should be automatically exposed without clicking expand
      expect(screen.getByText(/Smarter AI Error Guidance, Cleaner PDFs & Reliable Sessions/i)).toBeInTheDocument();
    });

    it('renders correct Arabic accessible labels for monthly expand/collapse controls', () => {
      render(
        <MemoryRouter initialEntries={['/ar/whats-new']}>
          <LocaleProvider initialLocale="ar">
            <WhatsNewPage />
          </LocaleProvider>
        </MemoryRouter>
      );

      // Recent month September 2026 is expanded
      expect(screen.getByRole('button', { name: /إخفاء تحديثات سبتمبر 2026/i })).toHaveAttribute('aria-expanded', 'true');

      // Older month July 2026 is collapsed with Arabic accessible label
      const showJulArBtn = screen.getByRole('button', { name: /عرض تحديثات يوليو 2026/i });
      expect(showJulArBtn).toHaveAttribute('aria-expanded', 'false');

      // Expand July 2026
      fireEvent.click(showJulArBtn);
      expect(screen.getByRole('button', { name: /إخفاء تحديثات يوليو 2026/i })).toHaveAttribute('aria-expanded', 'true');
    });

    it('does not duplicate featured updates as full feed cards in the default September feed', () => {
      render(
        <MemoryRouter initialEntries={['/whats-new']}>
          <LocaleProvider>
            <WhatsNewPage />
          </LocaleProvider>
        </MemoryRouter>
      );

      // Latest Highlights contains the featured releases
      expect(screen.getByRole('heading', { name: /Latest Highlights/i })).toBeInTheDocument();

      // September 2026 section has the compact reference note
      expect(screen.getByText(/This month also includes 3 major updates featured in the Latest Highlights section above/i)).toBeInTheDocument();

      // September 2026 section articles: check that non-featured items are present
      expect(screen.getByText(/Efficient Cloud Autosave & Cache Synchronization/i)).toBeInTheDocument();
      expect(screen.getByText(/Protected Visitor Inquiries for Public Portfolios/i)).toBeInTheDocument();
      expect(screen.getByText(/Optimized Background Account Synchronization/i)).toBeInTheDocument();

      // Check article count under September section: should be exactly 3 articles (not 6)
      const sepSection = document.getElementById('month-2026-09');
      expect(sepSection).not.toBeNull();
      const articlesInSep = sepSection!.querySelectorAll('article');
      expect(articlesInSep.length).toBe(3);
    });
  });
});
