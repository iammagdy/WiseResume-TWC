import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/i18n/LocaleProvider';
import GuidesPage from '@/pages/GuidesPage';
import ExamplesPage from '@/pages/ExamplesPage';
import GuidePage from '@/pages/GuidePage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/lib/guidesData', async () => {
  const actual = await vi.importActual<typeof import('@/lib/guidesData')>('@/lib/guidesData');
  return { ...actual, getGuides: vi.fn().mockResolvedValue([]) };
});

vi.mock('@/lib/resumeExamples', () => ({
  getResumeExamples: vi.fn().mockResolvedValue([]),
}));

function renderPage(page: React.ReactNode, locale: 'en' | 'ar') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <LocaleProvider initialLocale={locale}>
        <MemoryRouter>{page}</MemoryRouter>
      </LocaleProvider>
    </QueryClientProvider>,
  );
}

describe('public guides and examples locale shells', () => {
  it('renders Arabic guide labels without presenting English content as Arabic', () => {
    renderPage(<GuidesPage />, 'ar');
    expect(screen.getByRole('heading', { name: 'أدلة التطور المهني' })).toBeInTheDocument();
    expect(screen.getByText('المحتوى التفصيلي للأدلة متاح حالياً بالإنجليزية ويخضع للمراجعة قبل نشر النسخة العربية.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Career Guides' })).not.toBeInTheDocument();
  });

  it('renders Arabic example labels without presenting English examples as Arabic', () => {
    renderPage(<ExamplesPage />, 'ar');
    expect(screen.getByRole('heading', { name: 'أمثلة للسير الذاتية' })).toBeInTheDocument();
    expect(screen.getByText('نعرض النسخة العربية بعد مراجعة الأمثلة مهنياً ولغوياً. يمكنك حالياً تصفح المكتبة الإنجليزية.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Resume Examples' })).not.toBeInTheDocument();
  });

  it('does not expose an English guide body on an Arabic detail route', () => {
    renderPage(<GuidePage />, 'ar');
    expect(screen.getByRole('heading', { name: 'الدليل المهني قيد المراجعة' })).toBeInTheDocument();
    expect(screen.getByText('المحتوى متاح حالياً بالإنجليزية ويخضع للمراجعة المهنية واللغوية قبل نشر النسخة العربية.')).toBeInTheDocument();
  });

  it('keeps English route content in English', () => {
    const { unmount } = renderPage(<GuidesPage />, 'en');
    expect(screen.getByRole('heading', { name: 'Career Guides' })).toBeInTheDocument();
    unmount();
    renderPage(<ExamplesPage />, 'en');
    expect(screen.getByRole('heading', { name: 'Resume Examples' })).toBeInTheDocument();
  });
});
