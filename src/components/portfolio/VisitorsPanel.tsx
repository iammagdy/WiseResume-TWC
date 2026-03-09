import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye, Link2, Plus, Copy, Trash2, Globe2, Clock, Layers,
  TrendingUp, Check, Loader2, ChevronRight, BarChart2,
  ChevronDown, ChevronUp, ExternalLink, Search, MapPin,
  Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  usePortfolioAnalytics,
  useShortLinks,
  useCreateShortLink,
  useDeleteShortLink,
  type PortfolioVisit,
  type ShortLink,
} from '@/hooks/usePortfolioAnalytics';
import { haptics } from '@/lib/haptics';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';

// ── Country → flag emoji ──────────────────────────────────────────────────────
function countryToFlag(country: string | null): string {
  if (!country) return '🌍';
  const code = country.length === 2
    ? country.toUpperCase()
    : COUNTRY_TO_CODE[country] ?? null;
  if (!code) return '🌍';
  return String.fromCodePoint(...[...code].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
}

const COUNTRY_TO_CODE: Record<string, string> = {
  'United States': 'US', 'United Arab Emirates': 'AE', 'United Kingdom': 'GB',
  'Germany': 'DE', 'France': 'FR', 'Canada': 'CA', 'Australia': 'AU',
  'India': 'IN', 'Japan': 'JP', 'Brazil': 'BR', 'Netherlands': 'NL',
  'Spain': 'ES', 'Italy': 'IT', 'Sweden': 'SE', 'Norway': 'NO',
  'Denmark': 'DK', 'Switzerland': 'CH', 'Poland': 'PL', 'Turkey': 'TR',
  'Saudi Arabia': 'SA', 'Egypt': 'EG', 'South Africa': 'ZA',
  'Nigeria': 'NG', 'Pakistan': 'PK', 'Bangladesh': 'BD', 'Indonesia': 'ID',
  'Mexico': 'MX', 'Argentina': 'AR', 'Colombia': 'CO', 'Chile': 'CL',
  'Singapore': 'SG', 'Malaysia': 'MY', 'Philippines': 'PH', 'Thailand': 'TH',
  'Vietnam': 'VN', 'South Korea': 'KR', 'China': 'CN', 'Russia': 'RU',
  'Ukraine': 'UA', 'Romania': 'RO', 'Portugal': 'PT', 'Greece': 'GR',
};

// ── Format seconds to human-readable ─────────────────────────────────────────
function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return '—';
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

// ── Section label map ─────────────────────────────────────────────────────────
const SECTION_DISPLAY: Record<string, string> = {
  'section-hero': 'Hero',
  'section-about': 'About',
  'section-experience': 'Experience',
  'section-education': 'Education',
  'section-skills': 'Skills',
  'section-projects': 'Projects',
  'section-certifications': 'Certs',
  'section-awards': 'Awards',
  'section-publications': 'Publications',
  'section-volunteering': 'Volunteering',
  'section-contact': 'Contact',
};

function sectionLabel(s: string): string {
  return SECTION_DISPLAY[s] ?? s.replace('section-', '').replace(/-/g, ' ');
}

// ── Referrer parser ───────────────────────────────────────────────────────────
interface ReferrerInfo {
  label: string;
  host: string;
  color: string;
  dotColor: string;
}

function parseReferrer(referrer: string | null): ReferrerInfo {
  if (!referrer) return { label: 'Direct', host: '', color: 'text-muted-foreground', dotColor: 'bg-muted-foreground' };
  if (/wiseresume\.ai/i.test(referrer)) return { label: 'Direct', host: '', color: 'text-muted-foreground', dotColor: 'bg-muted-foreground' };
  if (/linkedin/i.test(referrer)) return { label: 'LinkedIn', host: 'linkedin.com', color: 'text-blue-400', dotColor: 'bg-blue-400' };
  if (/google/i.test(referrer)) return { label: 'Google', host: 'google.com', color: 'text-red-400', dotColor: 'bg-red-400' };
  if (/twitter|x\.com/i.test(referrer)) return { label: 'Twitter/X', host: 'x.com', color: 'text-sky-400', dotColor: 'bg-sky-400' };
  if (/github/i.test(referrer)) return { label: 'GitHub', host: 'github.com', color: 'text-foreground', dotColor: 'bg-foreground' };
  try {
    const h = new URL(referrer).hostname.replace(/^www\./, '');
    return { label: h, host: h, color: 'text-muted-foreground', dotColor: 'bg-muted-foreground' };
  } catch {
    return { label: 'Unknown', host: '', color: 'text-muted-foreground', dotColor: 'bg-muted-foreground' };
  }
}

// ── Engagement tier ───────────────────────────────────────────────────────────
interface EngagementTier {
  label: string;
  badgeClass: string;
}

function getEngagementTier(seconds: number | null, sectionCount: number): EngagementTier {
  const timeScore = !seconds ? 0 : seconds >= 120 ? 2 : seconds >= 30 ? 1 : 0;
  const sectionScore = sectionCount >= 4 ? 2 : sectionCount >= 2 ? 1 : 0;
  const total = timeScore + sectionScore;
  if (total >= 3) return { label: 'High', badgeClass: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' };
  if (total >= 1) return { label: 'Med', badgeClass: 'text-amber-400 bg-amber-400/10 border-amber-400/20' };
  return { label: 'Low', badgeClass: 'text-muted-foreground bg-muted/50 border-border/30' };
}

// ── Short link base URL ───────────────────────────────────────────────────────
const BASE_URL = 'resume.thewise.cloud';
function shortUrl(id: string) { return `${BASE_URL}/l/${id}`; }
function fullShortUrl(id: string) { return `https://${BASE_URL}/l/${id}`; }

// ── Visit Card ────────────────────────────────────────────────────────────────
function VisitCard({
  visit,
  shortLinks,
  isExpanded,
  onToggle,
}: {
  visit: PortfolioVisit;
  shortLinks: ShortLink[];
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const flag = countryToFlag(visit.country);
  const location = [visit.city, visit.country].filter(Boolean).join(', ') || 'Unknown location';
  const timeAgo = formatDistanceToNow(new Date(visit.visited_at), { addSuffix: true });
  const exactTime = format(new Date(visit.visited_at), 'MMM d, yyyy · h:mm a');
  const sections = Array.isArray(visit.sections_viewed) ? (visit.sections_viewed as string[]) : [];
  const linkedLink = visit.short_link_id
    ? shortLinks.find(l => l.id === visit.short_link_id)
    : null;
  const engagement = getEngagementTier(visit.time_spent_seconds, sections.length);
  const ref = parseReferrer(visit.referrer);

  // Collapsed: show first 3 section labels inline
  const previewSections = sections.slice(0, 3).map(sectionLabel);
  const remainingCount = sections.length - 3;

  return (
    <div className="border-b border-border/40 last:border-0">
      {/* Collapsed row — always visible */}
      <button
        className="w-full text-left py-3 group"
        onClick={() => { haptics.light(); onToggle(); }}
      >
        <div className="flex items-start justify-between gap-2">
          {/* Left: flag + location */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl shrink-0 leading-none">{flag}</span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{location}</p>
              <p className="text-xs text-muted-foreground">{timeAgo}</p>
            </div>
          </div>
          {/* Right: badges + chevron */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${engagement.badgeClass}`}>
              {engagement.label}
            </span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 flex items-center gap-1 h-5">
              <Clock className="w-2.5 h-2.5" />
              {formatDuration(visit.time_spent_seconds)}
            </Badge>
            {isExpanded
              ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            }
          </div>
        </div>

        {/* Sections preview + referrer hint */}
        {sections.length > 0 && (
          <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-muted-foreground">
              Scrolled {sections.length} section{sections.length !== 1 ? 's' : ''}:
            </span>
            {previewSections.map((s, i) => (
              <span key={i} className="text-[10px] bg-muted/60 px-1.5 py-0.5 rounded-md text-muted-foreground">
                {s}
              </span>
            ))}
            {remainingCount > 0 && (
              <span className="text-[10px] text-muted-foreground">+{remainingCount} more</span>
            )}
          </div>
        )}

        {/* Referrer pill (collapsed) */}
        <div className="mt-1 flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ref.dotColor}`} />
          <span className={`text-[10px] ${ref.color}`}>{ref.label}</span>
          {linkedLink && (
            <>
              <span className="text-[10px] text-muted-foreground">·</span>
              <span className="text-[10px] text-primary">{linkedLink.label}</span>
            </>
          )}
        </div>
      </button>

      {/* Expanded detail */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="pb-3 space-y-2.5">
              {/* Source row */}
              <div className="glass-elevated rounded-xl p-3 space-y-2">
                {/* Exact time */}
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs text-foreground">{exactTime}</span>
                </div>

                {/* Referrer */}
                <div className="flex items-center gap-2">
                  <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className={`text-xs font-medium ${ref.color}`}>{ref.label}</span>
                  {visit.referrer && (
                    <a
                      href={visit.referrer}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors font-mono"
                      onClick={e => e.stopPropagation()}
                    >
                      {ref.host}
                      <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                    </a>
                  )}
                  {!visit.referrer && (
                    <span className="text-[10px] text-muted-foreground font-mono">no referrer</span>
                  )}
                </div>

                {/* Short link attribution */}
                {linkedLink && (
                  <div className="flex items-center gap-2">
                    <Link2 className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="text-xs text-primary font-medium">{linkedLink.label}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{shortUrl(linkedLink.id)}</span>
                  </div>
                )}
              </div>

              {/* All sections */}
              {sections.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[11px] text-muted-foreground font-medium">
                      Sections scrolled ({sections.length})
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {sections.map((s, i) => (
                      <span
                        key={i}
                        className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full"
                      >
                        {sectionLabel(s)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Traffic Source Bar ────────────────────────────────────────────────────────
const SOURCE_COLORS: Record<string, string> = {
  LinkedIn: 'bg-blue-400',
  Google: 'bg-red-400',
  GitHub: 'bg-foreground',
  'Twitter/X': 'bg-sky-400',
  Direct: 'bg-muted-foreground',
  Other: 'bg-border',
};

function TrafficSourceBar({ visits }: { visits: PortfolioVisit[] }) {
  const sources = useMemo(() => {
    const buckets: Record<string, number> = {
      LinkedIn: 0, Google: 0, 'Twitter/X': 0, GitHub: 0, Direct: 0, Other: 0,
    };
    for (const v of visits) {
      const r = v.referrer ?? '';
      if (!r) buckets.Direct++;
      else if (/linkedin/i.test(r)) buckets.LinkedIn++;
      else if (/google/i.test(r)) buckets.Google++;
      else if (/twitter|x\.com/i.test(r)) buckets['Twitter/X']++;
      else if (/github/i.test(r)) buckets.GitHub++;
      else buckets.Other++;
    }
    return Object.entries(buckets)
      .filter(([, n]) => n > 0)
      .sort(([, a], [, b]) => b - a);
  }, [visits]);

  if (visits.length === 0 || sources.length === 0) return null;

  const total = visits.length;

  return (
    <div className="glass-elevated rounded-xl p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Activity className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-semibold text-foreground">Traffic Sources</span>
      </div>
      {/* Segmented bar */}
      <div className="flex h-1.5 rounded-full overflow-hidden gap-px">
        {sources.map(([label, count]) => (
          <div
            key={label}
            className={`${SOURCE_COLORS[label] ?? 'bg-border'} opacity-80 transition-all`}
            style={{ width: `${(count / total) * 100}%` }}
          />
        ))}
      </div>
      {/* Labels */}
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {sources.map(([label, count]) => (
          <div key={label} className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${SOURCE_COLORS[label] ?? 'bg-border'}`} />
            <span className="text-[10px] text-muted-foreground">{label}</span>
            <span className="text-[10px] font-medium text-foreground">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Short Link Row ────────────────────────────────────────────────────────────
function ShortLinkRow({
  link,
  userId,
  onDelete,
}: {
  link: ShortLink;
  userId: string;
  onDelete: (id: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const { mutate: deleteLink, isPending } = useDeleteShortLink();

  const handleCopy = () => {
    navigator.clipboard.writeText(fullShortUrl(link.id));
    setCopied(true);
    toast.success('Link copied!');
    haptics.light();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = () => {
    haptics.light();
    deleteLink({ id: link.id, userId });
    onDelete(link.id);
  };

  return (
    <div className="flex items-center gap-2 py-2.5 border-b border-border/40 last:border-0">
      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Link2 className="w-3.5 h-3.5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate">{link.label}</p>
        <p className="text-[10px] text-muted-foreground font-mono">{shortUrl(link.id)}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
          {link.click_count} clicks
        </Badge>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy} title="Copy link">
          {copied ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={handleDelete}
          disabled={isPending}
          title="Delete link"
        >
          {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
        </Button>
      </div>
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────────
interface VisitorsPanelProps {
  username: string | undefined;
  userId: string | undefined;
  portfolioEnabled: boolean;
}

export function VisitorsPanel({ username, userId, portfolioEnabled }: VisitorsPanelProps) {
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [showCreateLink, setShowCreateLink] = useState(false);
  const [expandedVisitId, setExpandedVisitId] = useState<string | null>(null);

  const { data: analytics, isLoading: analyticsLoading } = usePortfolioAnalytics(
    portfolioEnabled ? username : undefined
  );
  const { data: shortLinks = [], isLoading: linksLoading } = useShortLinks(userId, username);
  const { mutate: createLink, isPending: creating } = useCreateShortLink();

  const handleCreate = () => {
    if (!userId || !username || !newLinkLabel.trim()) {
      toast.error('Enter a label first');
      return;
    }
    haptics.light();
    createLink(
      { userId, portfolioUsername: username, label: newLinkLabel.trim(), targetUrl: `/p/${username.toLowerCase()}` },
      {
        onSuccess: () => {
          setNewLinkLabel('');
          setShowCreateLink(false);
        },
      }
    );
  };

  if (!portfolioEnabled) {
    return (
      <div className="text-center py-8 space-y-2">
        <Globe2 className="w-8 h-8 text-muted-foreground mx-auto" />
        <p className="text-sm text-muted-foreground">Publish your portfolio to start tracking visitors.</p>
      </div>
    );
  }

  const summary = analytics?.summary;
  const visits = analytics?.visits ?? [];

  return (
    <div className="space-y-5">
      {/* ── Summary Stats ── */}
      <div className="grid grid-cols-3 gap-2">
        {analyticsLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))
        ) : (
          <>
            <div className="glass-elevated rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Eye className="w-3.5 h-3.5 text-primary" />
              </div>
              <p className="text-lg font-bold text-foreground">{summary?.total_visits ?? 0}</p>
              <p className="text-[10px] text-muted-foreground">Visits</p>
            </div>
            <div className="glass-elevated rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Globe2 className="w-3.5 h-3.5 text-primary" />
              </div>
              <p className="text-lg font-bold text-foreground">{summary?.unique_countries ?? 0}</p>
              <p className="text-[10px] text-muted-foreground">Countries</p>
            </div>
            <div className="glass-elevated rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Clock className="w-3.5 h-3.5 text-primary" />
              </div>
              <p className="text-lg font-bold text-foreground">
                {formatDuration(summary?.avg_time_seconds ?? null)}
              </p>
              <p className="text-[10px] text-muted-foreground">Avg Time</p>
            </div>
          </>
        )}
      </div>

      {/* ── Recent Visitors ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h4 className="text-sm font-semibold text-foreground">Recent Visitors</h4>
          {visits.length > 0 && (
            <span className="text-[10px] text-muted-foreground ml-auto">tap to expand</span>
          )}
        </div>

        {analyticsLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : visits.length === 0 ? (
          <div className="text-center py-6 space-y-2">
            <BarChart2 className="w-7 h-7 text-muted-foreground mx-auto" />
            <p className="text-xs text-muted-foreground">No visits yet. Share your portfolio to start tracking!</p>
          </div>
        ) : (
          <div className="space-y-0">
            {/* Traffic source bar */}
            <div className="mb-3">
              <TrafficSourceBar visits={visits} />
            </div>

            {visits.slice(0, 15).map(visit => (
              <VisitCard
                key={visit.id}
                visit={visit}
                shortLinks={shortLinks}
                isExpanded={expandedVisitId === visit.id}
                onToggle={() =>
                  setExpandedVisitId(prev => prev === visit.id ? null : visit.id)
                }
              />
            ))}
            {visits.length > 15 && (
              <p className="text-[11px] text-muted-foreground text-center pt-2">
                +{visits.length - 15} more visits
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Short Links ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-semibold text-foreground">Short Links</h4>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1 text-primary"
            onClick={() => { haptics.light(); setShowCreateLink(v => !v); }}
          >
            <Plus className="w-3.5 h-3.5" />
            New Link
          </Button>
        </div>

        <AnimatePresence>
          {showCreateLink && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-3"
            >
              <div className="glass-elevated rounded-xl p-3 space-y-2">
                <p className="text-xs text-muted-foreground">Label this link (e.g. "LinkedIn Bio", "Email Signature")</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. LinkedIn Bio"
                    value={newLinkLabel}
                    onChange={e => setNewLinkLabel(e.target.value)}
                    className="h-9 text-sm"
                    onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
                    maxLength={50}
                  />
                  <Button
                    onClick={handleCreate}
                    disabled={creating || !newLinkLabel.trim()}
                    className="h-9 px-3 rounded-xl shrink-0"
                  >
                    {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Create'}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <ChevronRight className="w-3 h-3" />
                  Creates a short link like <span className="font-mono text-foreground">wiseresume.app/l/xK9mR</span>
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {linksLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
          </div>
        ) : shortLinks.length === 0 ? (
          <div className="text-center py-4 space-y-1">
            <p className="text-xs text-muted-foreground">
              No short links yet. Create one above to track where your visitors come from.
            </p>
          </div>
        ) : (
          <div>
            {shortLinks.map(link => (
              <ShortLinkRow
                key={link.id}
                link={link}
                userId={userId!}
                onDelete={() => { }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
