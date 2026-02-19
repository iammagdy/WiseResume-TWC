import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye, Link2, Plus, Copy, Trash2, Globe2, Clock, Layers,
  TrendingUp, Check, Loader2, ChevronRight, BarChart2,
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
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

// ── Country → flag emoji ──────────────────────────────────────────────────────
function countryToFlag(country: string | null): string {
  if (!country) return '🌍';
  // Try to convert 2-letter ISO code
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

// ── Short link base URL ───────────────────────────────────────────────────────
const BASE_URL = 'wiseresume.app';
function shortUrl(id: string) { return `${BASE_URL}/l/${id}`; }
function fullShortUrl(id: string) { return `https://${BASE_URL}/l/${id}`; }

// ── Visit Card ────────────────────────────────────────────────────────────────
function VisitCard({ visit, shortLinks }: { visit: PortfolioVisit; shortLinks: ShortLink[] }) {
  const flag = countryToFlag(visit.country);
  const location = [visit.city, visit.country].filter(Boolean).join(', ') || 'Unknown location';
  const timeAgo = formatDistanceToNow(new Date(visit.visited_at), { addSuffix: true });
  const sections = Array.isArray(visit.sections_viewed) ? visit.sections_viewed : [];
  const linkedLink = visit.short_link_id
    ? shortLinks.find(l => l.id === visit.short_link_id)
    : null;

  return (
    <div className="flex flex-col gap-2 py-3 border-b border-border/40 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-2xl shrink-0 leading-none">{flag}</span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{location}</p>
            <p className="text-xs text-muted-foreground">{timeAgo}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />
            {formatDuration(visit.time_spent_seconds)}
          </Badge>
          {linkedLink && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 flex items-center gap-1 text-primary border-primary/30">
              <Link2 className="w-2.5 h-2.5" />
              {linkedLink.label}
            </Badge>
          )}
          {!linkedLink && !visit.short_link_id && (
            <span className="text-[10px] text-muted-foreground">Direct</span>
          )}
        </div>
      </div>
      {sections.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {sections.slice(0, 5).map(s => (
            <span key={s} className="text-[10px] bg-muted px-1.5 py-0.5 rounded-md text-muted-foreground capitalize">
              {s}
            </span>
          ))}
        </div>
      )}
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
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handleCopy}
          title="Copy link"
        >
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
      { userId, portfolioUsername: username, label: newLinkLabel.trim() },
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
          <div>
            {visits.slice(0, 15).map(visit => (
              <VisitCard key={visit.id} visit={visit} shortLinks={shortLinks} />
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
                onDelete={() => {}}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
