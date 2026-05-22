/* global React, ReactDOM,
   AppProvider, useApp, Sidebar, PageHead, FLAT_NAV,
   PageOverview, PageVoice, PageGettingStarted,
   PageColor, PageType, PageSpacing, PageRadii, PageMotion, PageIconography,
   PageButtons, PageInputs, PageBadges, PageCards, PageScoreRing, PageAiSheet, PageToasts,
   PageBrandLogos, PageBrandTwins, PatternHero, PatternDashboard, PatternEditor
*/
const { useState, useEffect, useCallback } = React;

const PAGES = {
  overview: PageOverview,
  voice: PageVoice,
  'getting-started': PageGettingStarted,
  color: PageColor,
  type: PageType,
  spacing: PageSpacing,
  radii: PageRadii,
  motion: PageMotion,
  iconography: PageIconography,
  buttons: PageButtons,
  inputs: PageInputs,
  badges: PageBadges,
  cards: PageCards,
  'score-ring': PageScoreRing,
  'ai-sheet': PageAiSheet,
  toasts: PageToasts,
  'brand-logos': PageBrandLogos,
  'brand-twins': PageBrandTwins,
  'pattern-hero': PatternHero,
  'pattern-dashboard': PatternDashboard,
  'pattern-editor': PatternEditor,
};

function pageFromHash() {
  const h = window.location.hash.replace(/^#\/?/, '');
  return PAGES[h] ? h : 'overview';
}

function Shell() {
  const [current, setCurrent] = useState(pageFromHash());
  const [query, setQuery] = useState('');
  const scrollerRef = React.useRef(null);

  useEffect(() => {
    const onHash = () => setCurrent(pageFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const pick = useCallback((id) => {
    window.location.hash = `#/${id}`;
    setCurrent(id);
    // smooth-scroll back to top of content
    requestAnimationFrame(() => {
      if (scrollerRef.current) scrollerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      else window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }, []);

  // ⌘K — focus search
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const el = document.querySelector('.ds-search input');
        el && el.focus();
      }
      if (e.key === 'ArrowRight' && (e.metaKey || e.ctrlKey)) {
        const idx = FLAT_NAV.findIndex((x) => x.id === current);
        if (idx < FLAT_NAV.length - 1) pick(FLAT_NAV[idx + 1].id);
      }
      if (e.key === 'ArrowLeft' && (e.metaKey || e.ctrlKey)) {
        const idx = FLAT_NAV.findIndex((x) => x.id === current);
        if (idx > 0) pick(FLAT_NAV[idx - 1].id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, pick]);

  const Page = PAGES[current] || PageOverview;

  return (
    <div className="ds-app">
      <Sidebar current={current} onPick={pick} query={query} setQuery={setQuery} />
      <div className="ds-main" ref={scrollerRef}>
        <PageHead current={current} onPick={pick} />
        <div key={current}>
          <Page onPick={pick} />
        </div>
      </div>
    </div>
  );
}

function Root() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<Root />);
