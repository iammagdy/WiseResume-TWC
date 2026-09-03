import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import triggerHaptic from '@/lib/haptics';
import { toast } from 'sonner';
import { useLocale } from '@/i18n/LocaleProvider';
import { LanguageSwitcher } from '@/i18n/LanguageSwitcher';
import {
  whatsNewReleases,
  CATEGORY_FILTERS,
  TYPE_FILTERS,
  getAvailableMonthGroups,
  getUpdateType,
  type ReleaseCategory,
  type UpdateType,
  type ReleaseUpdate,
} from '@/data/whatsNewData';
import {
  Sparkles,
  Rocket,
  ChevronDown,
  ChevronUp,
  Filter,
  Calendar,
  Share2,
  Check,
  Zap,
  Tag,
  Clock,
  Layers,
} from 'lucide-react';

export default function WhatsNewPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { locale, direction } = useLocale();

  const lang = (locale === 'ar' ? 'ar' : 'en') as 'en' | 'ar';

  const [activeType, setActiveType] = useState<UpdateType>('all');
  const [activeCategory, setActiveCategory] = useState<ReleaseCategory>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [showOlder, setShowOlder] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Default expanded months: September 2026 and August 2026
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(
    () => new Set(['2026-09', '2026-08'])
  );

  // Check if any filter is active
  const isFilterActive = activeType !== 'all' || activeCategory !== 'all' || selectedMonth !== 'all';

  // Toggle individual month disclosure
  const toggleMonth = (monthKey: string) => {
    triggerHaptic.light();
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(monthKey)) {
        next.delete(monthKey);
      } else {
        next.add(monthKey);
      }
      return next;
    });
  };

  // Month groups derived dynamically
  const monthGroups = useMemo(() => {
    return getAvailableMonthGroups(whatsNewReleases);
  }, []);

  // Curated latest highlights (top 3 featured releases)
  const topHighlights = useMemo(() => {
    return whatsNewReleases.filter((r) => r.featured).slice(0, 3);
  }, []);

  // Filtered releases list
  const filteredReleases = useMemo(() => {
    return whatsNewReleases.filter((release) => {
      // Type filter
      if (activeType !== 'all') {
        const itemType = getUpdateType(release);
        if (itemType !== activeType) {
          return false;
        }
      }

      // Category filter
      if (activeCategory !== 'all' && release.category !== activeCategory) {
        return false;
      }

      // Month filter
      if (selectedMonth !== 'all' && release.monthKey !== selectedMonth) {
        return false;
      }

      // Progressive disclosure: hide 2025 releases unless showOlder is true or user filtered explicitly
      if (!showOlder && release.year < 2026 && selectedMonth === 'all' && activeCategory === 'all' && activeType === 'all') {
        return false;
      }

      return true;
    });
  }, [activeType, activeCategory, selectedMonth, showOlder]);

  // Group filtered releases by month
  const releasesByMonth = useMemo(() => {
    const groups: { monthKey: string; label: { en: string; ar: string }; items: ReleaseUpdate[] }[] = [];
    const map = new Map<string, ReleaseUpdate[]>();

    for (const release of filteredReleases) {
      const key = release.monthKey;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(release);
    }

    for (const group of monthGroups) {
      const items = map.get(group.id);
      if (items && items.length > 0) {
        groups.push({
          monthKey: group.id,
          label: group.label,
          items,
        });
      }
    }

    return groups;
  }, [filteredReleases, monthGroups]);

  const handleGetStarted = () => {
    triggerHaptic.light();
    void Promise.resolve(navigate('/auth?mode=signup')).catch(() => {
      toast.error(
        lang === 'ar'
          ? 'تعذر فتح صفحة التسجيل. يرجى المحاولة مرة أخرى.'
          : 'Could not open sign-up. Please try again.'
      );
    });
  };

  const handleShareAnchor = (id: string) => {
    triggerHaptic.light();
    const url = `${window.location.origin}${window.location.pathname}#${id}`;
    void navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      toast.success(
        lang === 'ar'
          ? 'تم نسخ رابط التحديث إلى الحافظة'
          : 'Update link copied to clipboard'
      );
      setTimeout(() => setCopiedId(null), 2500);
    });
  };

  const resetFilters = () => {
    triggerHaptic.light();
    setActiveType('all');
    setActiveCategory('all');
    setSelectedMonth('all');
    setExpandedMonths(new Set(['2026-09', '2026-08']));
  };

  const handleSelectMonth = (monthId: string) => {
    triggerHaptic.light();
    setSelectedMonth(monthId);
    if (monthId !== 'all') {
      setExpandedMonths((prev) => new Set([...prev, monthId]));
    }
  };

  const renderTypeBadge = (release: ReleaseUpdate) => {
    const type = getUpdateType(release);
    if (type === 'new') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          {lang === 'ar' ? 'جديد' : 'New'}
        </span>
      );
    }
    if (type === 'fixed') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          {lang === 'ar' ? 'إصلاح' : 'Fixed'}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
        {lang === 'ar' ? 'تحسين' : 'Improved'}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground aurora-page-root flex flex-col overflow-x-hidden" dir={direction}>
      {/* Sticky Navigation Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border shadow-xs">
        <div className="flex items-center justify-between px-3 sm:px-6 h-16 max-w-6xl mx-auto w-full gap-2">
          <Link
            to={locale === 'ar' ? '/ar' : '/'}
            className="flex items-center gap-1.5 sm:gap-2 text-base sm:text-lg font-bold text-primary tracking-tight hover:opacity-85 transition-opacity shrink-0"
          >
            <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-primary fill-primary/20" />
            <span>WiseResume</span>
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <LanguageSwitcher className="[&>span]:hidden sm:[&>span]:inline text-xs sm:text-sm [&>select]:min-w-[4.5rem] sm:[&>select]:min-w-28 [&>select]:py-1 sm:[&>select]:py-2 [&>select]:text-xs sm:[&>select]:text-sm [&>select]:px-2 sm:[&>select]:px-3" />
            {isAuthenticated ? (
              <button
                onClick={() => {
                  triggerHaptic.light();
                  navigate('/dashboard');
                }}
                className="text-xs sm:text-sm font-semibold px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs shrink-0"
              >
                {lang === 'ar' ? 'لوحة التحكم' : 'Dashboard'}
              </button>
            ) : (
              <button
                onClick={handleGetStarted}
                className="text-xs sm:text-sm font-semibold px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs shrink-0"
              >
                {lang === 'ar' ? 'ابدأ مجاناً' : 'Get Started Free'}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Hub */}
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14 w-full">
        {/* Page Hero Header */}
        <div className="text-center mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4 border border-primary/20 shadow-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            {lang === 'ar' ? 'مركز تحديثات المنتجات' : 'WiseResume Release Hub'}
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-4 text-foreground">
            {lang === 'ar' ? 'ما الجديد في WiseResume' : "What's New in WiseResume"}
          </h1>

          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            {lang === 'ar'
              ? 'تابع أحدث الميزات، والتحسينات، والتحديثات المعتمدة التي تم إطلاقها في WiseResume.'
              : 'Follow the latest features, enhancements, and verified product improvements shipped to WiseResume.'}
          </p>

          <div className="mt-4 inline-flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-primary" />
              {lang === 'ar' ? 'تحديثات معتمدة حتى سبتمبر 2026' : 'Releases through September 2026'}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-primary" />
              {lang === 'ar' ? `${whatsNewReleases.length} تحديثاً مسجلاً` : `${whatsNewReleases.length} verified updates`}
            </span>
          </div>
        </div>

        {/* Latest Highlights Section */}
        {topHighlights.length > 0 && activeType === 'all' && activeCategory === 'all' && selectedMonth === 'all' && (
          <section className="mb-12" aria-labelledby="highlights-heading">
            <div className="flex items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-primary text-primary-foreground">
                  <Rocket className="w-3.5 h-3.5" />
                  {lang === 'ar' ? 'إصدار بارز' : 'Featured Update'}
                </span>
                <h2 id="highlights-heading" className="text-lg sm:text-xl font-bold text-foreground">
                  {lang === 'ar' ? 'أبرز التحديثات الأخيرة' : 'Latest Highlights'}
                </h2>
              </div>
              <span className="text-xs text-muted-foreground font-medium hidden sm:inline-block">
                {lang === 'ar' ? 'سبتمبر 2026' : 'September 2026'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {topHighlights.map((item) => {
                const Icon = item.icon;
                const isCopied = copiedId === item.id;
                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-primary/20 bg-card p-5 sm:p-6 shadow-xs flex flex-col justify-between relative overflow-hidden transition-all hover:border-primary/40 hover:shadow-sm"
                  >
                    <div className="absolute -top-10 -right-10 w-24 h-24 bg-primary/10 rounded-full blur-xl pointer-events-none" />

                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg ${item.iconBg} flex items-center justify-center flex-shrink-0`}>
                            <Icon className={`w-4 h-4 ${item.categoryText}`} />
                          </div>
                          {renderTypeBadge(item)}
                        </div>
                        <button
                          onClick={() => handleShareAnchor(item.id)}
                          title={lang === 'ar' ? 'نسخ رابط التحديث' : 'Copy update link'}
                          className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors"
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {item.featureArea && (
                        <div className="text-[11px] font-semibold text-primary mb-1">
                          {item.featureArea[lang]}
                        </div>
                      )}

                      <h3 className="text-base font-bold text-foreground mb-2 leading-snug">
                        {item.title[lang]}
                      </h3>

                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-4">
                        {item.description[lang]}
                      </p>
                    </div>

                    <ul className="space-y-1.5 pt-3 border-t border-border/50 text-xs text-muted-foreground">
                      {item.highlights[lang].slice(0, 2).map((hl, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="mt-1 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                          <span>{hl}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Controls Section: Filters & Jump Navigation */}
        <section className="mb-8 space-y-4" aria-label={lang === 'ar' ? 'أدوات التصفية' : 'Update filters'}>
          {/* Row 1: Primary Update Type Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-1 border-b border-border/60">
            <div className="flex items-center gap-2">
              <Tag className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {lang === 'ar' ? 'نوع التحديث' : 'Type'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none snap-x">
              {TYPE_FILTERS.map((type) => {
                const isActive = activeType === type.id;
                return (
                  <button
                    key={type.id}
                    onClick={() => {
                      triggerHaptic.light();
                      setActiveType(type.id);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all snap-start ${
                      isActive
                        ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                        : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    {type.label[lang]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 2: Category Filter Tabs */}
          <div>
            <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <Filter className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'القسم' : 'Product Area'}</span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none snap-x">
              {CATEGORY_FILTERS.map((cat) => {
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      triggerHaptic.light();
                      setActiveCategory(cat.id);
                    }}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all snap-start ${
                      isActive
                        ? 'bg-secondary text-secondary-foreground font-semibold border border-primary/30 shadow-xs'
                        : 'bg-card border border-border/70 text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                    }`}
                  >
                    {cat.label[lang]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 3: Month Jump Selector */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <Calendar className="w-3.5 h-3.5" />
                <span>{lang === 'ar' ? 'الشهر' : 'Month'}</span>
              </div>
              <div className="text-[11px] text-muted-foreground">
                {selectedMonth !== 'all' && (
                  <button
                    onClick={() => setSelectedMonth('all')}
                    className="text-primary hover:underline font-medium"
                  >
                    {lang === 'ar' ? 'عرض جميع الأشهر' : 'View all months'}
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none snap-x">
              <button
                onClick={() => handleSelectMonth('all')}
                className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all snap-start ${
                  selectedMonth === 'all'
                    ? 'bg-foreground text-background font-semibold shadow-xs'
                    : 'bg-background border border-border/60 text-muted-foreground hover:text-foreground'
                }`}
              >
                {lang === 'ar' ? 'جميع الأشهر' : 'All Months'}
              </button>
              {monthGroups.map((month) => {
                const isActive = selectedMonth === month.id;
                return (
                  <button
                    key={month.id}
                    onClick={() => handleSelectMonth(month.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all snap-start ${
                      isActive
                        ? 'bg-foreground text-background font-semibold shadow-xs'
                        : 'bg-background border border-border/60 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {month.label[lang]}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Timeline Feed Grouped by Month */}
        {releasesByMonth.length === 0 ? (
          <div className="text-center py-14 px-4 bg-card border border-border rounded-2xl">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3 text-muted-foreground">
              <Filter className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-foreground mb-1">
              {lang === 'ar' ? 'لم يتم العثور على تحديثات' : 'No updates found'}
            </h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">
              {lang === 'ar'
                ? 'جرّب تغيير خيارات التصفية لعرض التحديثات المتاحة.'
                : 'Try clearing your active filters to see available updates.'}
            </p>
            <button
              onClick={resetFilters}
              className="text-xs font-semibold px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
            >
              {lang === 'ar' ? 'إعادة ضبط التصفية' : 'Reset Filters'}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {releasesByMonth.map((group) => {
              const isExpanded = isFilterActive || expandedMonths.has(group.monthKey);
              const displayedItems =
                !isFilterActive && group.monthKey === '2026-09'
                  ? group.items.filter((item) => !item.featured)
                  : group.items;

              return (
                <section
                  key={group.monthKey}
                  id={`month-${group.monthKey}`}
                  className="rounded-2xl border border-border/70 bg-card/40 p-4 sm:p-5 transition-all"
                >
                  {/* Month Section Header with Accessible Expand/Collapse */}
                  <div className="flex items-center justify-between gap-3 mb-2 pb-2 border-b border-border/60">
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-lg sm:text-xl font-bold text-foreground">
                        {group.label[lang]}
                      </h2>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {lang === 'ar' ? `${group.items.length} تحديثات` : `${group.items.length} updates`}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-mono text-muted-foreground hidden sm:inline-block">
                        {group.monthKey}
                      </span>

                      <button
                        type="button"
                        onClick={() => toggleMonth(group.monthKey)}
                        aria-expanded={isExpanded}
                        aria-controls={`month-content-${group.monthKey}`}
                        aria-label={
                          isExpanded
                            ? (lang === 'ar' ? `إخفاء تحديثات ${group.label.ar}` : `Hide ${group.label.en} updates`)
                            : (lang === 'ar' ? `عرض تحديثات ${group.label.ar}` : `Show ${group.label.en} updates`)
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border/80 bg-background hover:bg-muted/70 text-foreground transition-all shadow-2xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <span>
                          {isExpanded
                            ? (lang === 'ar' ? 'إخفاء' : 'Hide')
                            : (lang === 'ar' ? 'عرض التحديثات' : 'Show updates')}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Cards for this Month */}
                  {isExpanded && (
                    <div id={`month-content-${group.monthKey}`} className="space-y-4 pt-2">
                      {/* Compact reference note for September featured updates shown above in default view */}
                      {!isFilterActive && group.monthKey === '2026-09' && (
                        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs text-muted-foreground">
                          <Rocket className="w-4 h-4 text-primary shrink-0" />
                          <span>
                            {lang === 'ar'
                              ? 'يتضمن هذا الشهر أيضاً 3 تحديثات رئيسية معروضة في قسم "أبرز التحديثات الأخيرة" بالأعلى.'
                              : 'This month also includes 3 major updates featured in the Latest Highlights section above.'}
                          </span>
                        </div>
                      )}

                      {displayedItems.map((entry) => {
                        const Icon = entry.icon;
                        const isCopied = copiedId === entry.id;

                        return (
                          <article
                            key={entry.id}
                            id={entry.id}
                            className="bg-card border border-border/70 hover:border-border rounded-xl p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-all relative group"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2.5 mb-2.5">
                              <div className="flex flex-wrap items-center gap-2">
                                <div
                                  className={`w-7 h-7 rounded-lg ${entry.iconBg} flex items-center justify-center flex-shrink-0`}
                                >
                                  <Icon className={`w-3.5 h-3.5 ${entry.categoryText}`} />
                                </div>
                                {renderTypeBadge(entry)}
                                <span
                                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${entry.categoryBg} ${entry.categoryText}`}
                                >
                                  {entry.categoryLabel[lang]}
                                </span>
                                {entry.featureArea && (
                                  <span className="text-[11px] font-medium text-muted-foreground px-1.5 py-0.5 bg-muted/70 rounded-md">
                                    {entry.featureArea[lang]}
                                  </span>
                                )}
                                <span className="text-xs text-muted-foreground font-medium">
                                  {entry.date}
                                </span>
                              </div>

                              <button
                                onClick={() => handleShareAnchor(entry.id)}
                                title={lang === 'ar' ? 'نسخ رابط التحديث' : 'Copy update link'}
                                className="text-muted-foreground hover:text-foreground opacity-60 hover:opacity-100 p-1.5 rounded-lg hover:bg-muted transition-all"
                              >
                                {isCopied ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                                ) : (
                                  <Share2 className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>

                            <h3 className="text-base sm:text-lg font-bold text-foreground mb-1.5 leading-snug">
                              {entry.title[lang]}
                            </h3>

                            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                              {entry.description[lang]}
                            </p>

                            <ul className="space-y-1.5 pt-2 border-t border-border/40">
                              {entry.highlights[lang].map((highlight, idx) => (
                                <li
                                  key={idx}
                                  className="flex items-start gap-2 text-xs sm:text-sm text-muted-foreground"
                                >
                                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary/70 shrink-0" />
                                  <span>{highlight}</span>
                                </li>
                              ))}
                            </ul>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}

        {/* Progressive Disclosure Toggle for Older Releases */}
        {selectedMonth === 'all' && (
          <div className="mt-8 text-center">
            <button
              onClick={() => {
                triggerHaptic.light();
                setShowOlder((prev) => {
                  const next = !prev;
                  if (next) {
                    setExpandedMonths((current) => new Set([...current, '2025-12', '2025-11', '2025-10']));
                  }
                  return next;
                });
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted/50 transition-colors shadow-2xs"
            >
              {showOlder ? (
                <>
                  <span>{lang === 'ar' ? 'إخفاء التحديثات الأقدم' : 'Hide Older Updates'}</span>
                  <ChevronUp className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>{lang === 'ar' ? 'عرض تحديثات 2025 الأقدم' : 'Show Older 2025 Updates'}</span>
                  <ChevronDown className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}

        {/* Bottom Call to Action Card */}
        <div className="mt-14 rounded-2xl border border-border bg-card p-8 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-xl font-bold mb-2 text-foreground">
            {lang === 'ar' ? 'جاهز لتطوير سيرتك الذاتية؟' : 'Ready to upgrade your resume?'}
          </h2>
          <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto leading-relaxed">
            {lang === 'ar'
              ? 'انضم إلى WiseResume وابدأ في تكييف سيرتك الذاتية وتطوير مسارك المهني مع كل تحديث جديد.'
              : 'Join WiseResume to tailor your CV, track applications, and level up your career search.'}
          </p>
          {isAuthenticated ? (
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-2 h-11 px-7 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors text-sm shadow-xs"
            >
              {lang === 'ar' ? 'الانتقال إلى لوحة التحكم' : 'Go to Dashboard'}
            </button>
          ) : (
            <button
              onClick={handleGetStarted}
              className="inline-flex items-center gap-2 h-11 px-7 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors text-sm shadow-xs"
            >
              {lang === 'ar' ? 'ابدأ مجاناً الان' : 'Get Started Free'}
            </button>
          )}
        </div>
      </main>

      {/* Canonical Footer */}
      <footer className="border-t border-border py-8 text-center text-xs sm:text-sm text-muted-foreground bg-card/30 mt-auto">
        <div className="flex flex-wrap justify-center gap-5 mb-3 font-medium">
          <Link to={locale === 'ar' ? '/ar' : '/'} className="hover:text-foreground transition-colors">
            {lang === 'ar' ? 'الرئيسية' : 'Home'}
          </Link>
          <Link to={locale === 'ar' ? '/ar/pricing' : '/pricing'} className="hover:text-foreground transition-colors">
            {lang === 'ar' ? 'الأسعار' : 'Pricing'}
          </Link>
          <Link to={locale === 'ar' ? '/ar/privacy' : '/privacy'} className="hover:text-foreground transition-colors">
            {lang === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}
          </Link>
          <Link to={locale === 'ar' ? '/ar/terms' : '/terms'} className="hover:text-foreground transition-colors">
            {lang === 'ar' ? 'شروط الخدمة' : 'Terms of Service'}
          </Link>
          <Link to={locale === 'ar' ? '/ar/refund-policy' : '/refund-policy'} className="hover:text-foreground transition-colors">
            {lang === 'ar' ? 'سياسة الاسترداد' : 'Refund Policy'}
          </Link>
        </div>
        <p>© {new Date().getFullYear()} WiseResume. All rights reserved.</p>
      </footer>
    </div>
  );
}
