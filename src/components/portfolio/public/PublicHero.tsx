import { forwardRef, useMemo, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MapPin, Linkedin, Github, Globe, X, Mail, Sparkles, PlayCircle, CalendarDays } from 'lucide-react';
import { motion } from 'framer-motion';
import { TypewriterText, buildTypewriterPhrases } from '@/components/portfolio/public/TypewriterText';
import { isActiveWithin24h } from '@/hooks/useActiveStatus';
import { getThemeById } from '@/lib/portfolioThemes';
import { safeHref } from '@/lib/urlUtils';
import { getPublicAvatarSources } from '@/lib/publicAvatar';
import type { PublicProfile, PublicResume } from '@/hooks/usePublicPortfolio';

export interface PublicHeroProps {
  profile: PublicProfile;
  resume: PublicResume;
  pStyle: string;
  accentColor: string;
  initials: string;
  liveLastActiveAt: string | null;
  allSkills: string[];
  videoIntroUrl?: string | null;
  schedulingUrl?: string | null;
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0, 0, 0.2, 1] as const } },
};

function getVideoEmbedUrl(url: string): string | null {
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?rel=0&modestbranding=1`;
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}?dnt=1`;
  const loomMatch = url.match(/loom\.com\/(?:share|embed)\/([a-zA-Z0-9]+)/);
  if (loomMatch) return `https://www.loom.com/embed/${loomMatch[1]}`;
  return null;
}

function getVideoThumbnailUrl(url: string): string | null {
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
  return null;
}

export const PublicHero = forwardRef<HTMLDivElement, PublicHeroProps>(({
  profile,
  resume,
  pStyle,
  accentColor,
  initials,
  liveLastActiveAt,
  allSkills,
  videoIntroUrl,
  schedulingUrl,
}, ref) => {
  const [embedError, setEmbedError] = useState(false);
  const themeConfig = getThemeById(pStyle);
  const typewriterPhrases = useMemo(
    () => buildTypewriterPhrases(profile, allSkills),
    [profile, allSkills]
  );
  
  const heroBg: React.CSSProperties = pStyle === 'developer-terminal'
    ? { background: `linear-gradient(180deg, color-mix(in srgb, ${accentColor} 8%, #1a1b26), #1a1b26 70%)` }
    : pStyle === 'creative-spotlight'
    ? { background: `radial-gradient(ellipse 120% 80% at 30% -10%, color-mix(in srgb, ${accentColor} 18%, transparent), transparent 60%), radial-gradient(ellipse 80% 60% at 80% 20%, rgba(168,85,247,0.08), transparent)` }
    : pStyle === 'executive-suite'
    ? { background: `linear-gradient(180deg, color-mix(in srgb, ${accentColor} 4%, #ffffff), #ffffff 50%)` }
    : pStyle === 'freelancer-starter'
    ? { background: `linear-gradient(180deg, color-mix(in srgb, ${accentColor} 6%, #ffffff), #ffffff 60%)` }
    : pStyle === 'neon-cyber'
    ? { background: `radial-gradient(ellipse 60% 50% at 50% 0%, color-mix(in srgb, ${accentColor} 20%, transparent), transparent)` }
    : pStyle === 'bold-dark'
    ? { background: `radial-gradient(ellipse 90% 50% at 50% 0%, color-mix(in srgb, ${accentColor} 22%, transparent), transparent)` }
    : pStyle === 'glass-pro'
    ? { background: `radial-gradient(ellipse 90% 60% at 50% -5%, color-mix(in srgb, ${accentColor} 16%, transparent), transparent)` }
    : pStyle === 'classic-clean'
    ? { background: `linear-gradient(180deg, color-mix(in srgb, ${accentColor} 6%, #ffffff), #ffffff 60%)` }
    : { background: `radial-gradient(ellipse 80% 40% at 50% 0%, color-mix(in srgb, ${accentColor} 14%, transparent), transparent)` };

  const heroAlign = themeConfig?.layout.heroAlign || 'center';
  const isSplitHero = heroAlign === 'split';
  const heroAlignClass = heroAlign === 'left' ? 'items-start text-left'
    : isSplitHero ? 'items-center text-center md:flex-row md:items-center md:text-left md:gap-12'
    : 'items-center text-center';
  const heroJustify = heroAlign === 'center' ? 'justify-center' : 'justify-center md:justify-start';

  const contactHref = profile?.linkedinUrl || null;
  const avatarSources = profile.avatarUrl
    ? getPublicAvatarSources(profile.avatarUrl, [160, 288, 432], '144px')
    : null;

  return (
    <motion.div
      ref={ref}
      variants={fadeUp}
      className={`relative flex flex-col ${heroAlignClass} pt-16 pb-12 px-4 ${isSplitHero ? 'md:flex-row md:flex-wrap' : ''}`}
      style={heroBg}
    >
      {pStyle !== 'classic-clean' && (
        <div className="pf-hero-ambient rounded-2xl" aria-hidden="true" />
      )}

      {/* Avatar — animated gradient ring */}
      <div className="relative mb-6">
        <div
          aria-hidden="true"
          className="pf-avatar-ring"
          style={{ background: `conic-gradient(${accentColor}, transparent, ${accentColor})` }}
        />
        <Avatar className="h-36 w-36 relative z-10 border-[3px]" style={{ borderColor: accentColor }}>
          <AvatarFallback
            className="text-4xl font-black"
            style={{ background: `linear-gradient(135deg, ${accentColor}, color-mix(in srgb, ${accentColor} 60%, purple))`, color: '#fff' }}
          >
            {initials}
          </AvatarFallback>
          {avatarSources && (
            <AvatarImage
              src={avatarSources.src}
              srcSet={avatarSources.srcSet}
              sizes={avatarSources.sizes}
              width={144}
              height={144}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              alt={`${profile.fullName || 'Portfolio'} avatar`}
            />
          )}
        </Avatar>
      </div>

      <h1 className="relative z-[1] text-4xl sm:text-5xl md:text-6xl font-black leading-tight mb-3 max-w-full break-words" style={{ fontFamily: 'var(--pf-heading-font)' }}>
        {profile.fullName || 'Anonymous'}
      </h1>

      {(() => {
        const nameLen = (profile.fullName || 'Anonymous').length;
        const badgeDelay = nameLen * 35 + 200 + 100;
        const locationDelay = badgeDelay + 200;
        const ctaBaseDelay = badgeDelay + 150;
        let ctaIdx = 0;
        return (
          <>
            <div className={`flex items-center ${heroJustify} gap-2.5 flex-wrap mb-3 pf-badge-entrance`} style={{ animationDelay: `${badgeDelay}ms` }}>
              {profile.jobTitle && (
                <span className="inline-flex items-center gap-1.5 text-sm font-bold px-4 py-1.5 rounded-full"
                  style={{ background: `color-mix(in srgb, ${accentColor} 15%, transparent)`, color: accentColor, border: `1px solid color-mix(in srgb, ${accentColor} 35%, transparent)` }}>
                  {profile.jobTitle}
                </span>
              )}
              {profile.availabilityStatus === 'actively-looking' && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full" style={{
                  background: 'color-mix(in srgb, var(--pf-success) 15%, transparent)',
                  color: 'var(--pf-success)',
                  border: '1px solid color-mix(in srgb, var(--pf-success) 30%, transparent)',
                }}>
                  <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--pf-success)' }} />
                  Actively Looking
                </span>
              )}
              {profile.availabilityStatus === 'open-to-offers' && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full" style={{
                  background: 'color-mix(in srgb, var(--pf-warning) 15%, transparent)',
                  color: 'var(--pf-warning)',
                  border: '1px solid color-mix(in srgb, var(--pf-warning) 30%, transparent)',
                }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: 'var(--pf-warning)' }} />
                  Open to Offers
                </span>
              )}
              {!profile.availabilityStatus && profile.openToWork && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full" style={{
                  background: 'color-mix(in srgb, var(--pf-success) 15%, transparent)',
                  color: 'var(--pf-success)',
                  border: '1px solid color-mix(in srgb, var(--pf-success) 30%, transparent)',
                }}>
                  <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--pf-success)' }} />
                  Open to Work
                </span>
              )}
            </div>

            {(profile.availabilityStatus === 'actively-looking' || (!profile.availabilityStatus && profile.openToWork)) && isActiveWithin24h(liveLastActiveAt) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: [0, 0, 0.2, 1] }}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mb-3"
                style={{ background: 'color-mix(in srgb, var(--pf-success) 10%, transparent)', color: 'var(--pf-success)', border: '1px solid color-mix(in srgb, var(--pf-success) 25%, transparent)' }}
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: 'var(--pf-success)' }} />
                  <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: 'var(--pf-success)' }} />
                </span>
                Active today — responds within 24h
              </motion.div>
            )}

            {profile.availabilityHeadline && (
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4"
                style={{
                  background: `color-mix(in srgb, ${accentColor} 8%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${accentColor} 20%, transparent)`,
                }}
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" style={{ color: accentColor }} />
                <span className="text-xs font-medium" style={{
                  color: accentColor,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {profile.availabilityHeadline}
                </span>
              </div>
            )}

            <div className={`flex items-center ${heroJustify} gap-3 mb-3 flex-wrap pf-fade-entrance`} style={{ animationDelay: `${locationDelay}ms` }}>
              {profile.location && (
                <span className="inline-flex items-center gap-1 text-sm" style={{ color: 'var(--pf-muted, #9ca3af)' }}>
                  <MapPin className="w-3.5 h-3.5" />{profile.location}
                </span>
              )}
              {profile.industry && (
                <span className="text-xs px-2.5 py-1 rounded-full" style={{
                  background: 'var(--pf-card, rgba(255,255,255,0.06))',
                  border: '1px solid var(--pf-border, rgba(255,255,255,0.08))',
                  color: 'var(--pf-muted, #9ca3af)',
                }}>
                  {profile.industry}
                </span>
              )}
            </div>

            <div className="pf-fade-entrance w-full max-w-md" style={{ animationDelay: `${locationDelay}ms` }}>
              {typewriterPhrases.length > 0 ? <TypewriterText phrases={typewriterPhrases} accentColor={accentColor} /> : null}
            </div>

            {(profile.linkedinUrl || profile.githubUrl || profile.websiteUrl || profile.twitterUrl) && (
              <div className={`flex items-center ${heroJustify} gap-2 mb-6`}>
                {safeHref(profile.linkedinUrl) && (
                  <a href={safeHref(profile.linkedinUrl)} target="_blank" rel="noopener noreferrer"
                    aria-label="LinkedIn"
                    className="w-11 h-11 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 pf-cta-entrance"
                    style={{ background: 'var(--pf-card, rgba(255,255,255,0.06))', border: '1px solid var(--pf-border, rgba(255,255,255,0.1))', animationDelay: `${ctaBaseDelay + (ctaIdx++) * 120}ms` }}
                    title="LinkedIn">
                    <Linkedin className="w-4 h-4" style={{ color: 'var(--pf-fg, #f5f5ff)' }} />
                  </a>
                )}
                {safeHref(profile.githubUrl) && (
                  <a href={safeHref(profile.githubUrl)} target="_blank" rel="noopener noreferrer"
                    aria-label="GitHub"
                    className="w-11 h-11 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 pf-cta-entrance"
                    style={{ background: 'var(--pf-card, rgba(255,255,255,0.06))', border: '1px solid var(--pf-border, rgba(255,255,255,0.1))', animationDelay: `${ctaBaseDelay + (ctaIdx++) * 120}ms` }}
                    title="GitHub">
                    <Github className="w-4 h-4" style={{ color: 'var(--pf-fg, #f5f5ff)' }} />
                  </a>
                )}
                {safeHref(profile.websiteUrl) && (
                  <a href={safeHref(profile.websiteUrl)} target="_blank" rel="noopener noreferrer"
                    aria-label="Website"
                    className="w-11 h-11 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 pf-cta-entrance"
                    style={{ background: 'var(--pf-card, rgba(255,255,255,0.06))', border: '1px solid var(--pf-border, rgba(255,255,255,0.1))', animationDelay: `${ctaBaseDelay + (ctaIdx++) * 120}ms` }}
                    title="Website">
                    <Globe className="w-4 h-4" style={{ color: 'var(--pf-fg, #f5f5ff)' }} />
                  </a>
                )}
                {safeHref(profile.twitterUrl) && (
                  <a href={safeHref(profile.twitterUrl)} target="_blank" rel="noopener noreferrer"
                    aria-label="X / Twitter"
                    className="w-11 h-11 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 pf-cta-entrance"
                    style={{ background: 'var(--pf-card, rgba(255,255,255,0.06))', border: '1px solid var(--pf-border, rgba(255,255,255,0.1))', animationDelay: `${ctaBaseDelay + (ctaIdx++) * 120}ms` }}
                    title="X / Twitter">
                    <X className="w-4 h-4" style={{ color: 'var(--pf-fg, #f5f5ff)' }} />
                  </a>
                )}
              </div>
            )}

            <div className={`flex items-center ${heroJustify} gap-3 flex-wrap`}>
              {safeHref(schedulingUrl) && (
                <a
                  href={safeHref(schedulingUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm transition-all hover:scale-105 active:scale-95 pf-cta-entrance"
                  style={{
                    background: 'var(--pf-card, rgba(255,255,255,0.06))',
                    border: `1px solid color-mix(in srgb, ${accentColor} 40%, transparent)`,
                    color: accentColor,
                    animationDelay: `${ctaBaseDelay + (ctaIdx++) * 120}ms`,
                  }}
                >
                  <CalendarDays className="w-4 h-4" /> Book a Call
                </a>
              )}
            </div>
          </>
        );
      })()}

      {videoIntroUrl && getVideoEmbedUrl(videoIntroUrl) && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="w-full max-w-xl mt-8 px-2"
        >
          <div
            className="rounded-2xl overflow-hidden relative"
            style={{
              background: 'var(--pf-card, rgba(255,255,255,0.03))',
              border: `1px solid color-mix(in srgb, ${accentColor} 25%, transparent)`,
              aspectRatio: '16/9',
            }}
          >
            {!embedError ? (
              <iframe
                src={getVideoEmbedUrl(videoIntroUrl)!}
                title="Video Introduction"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full border-0"
                onError={() => setEmbedError(true)}
              />
            ) : (
              /* Thumbnail fallback — click to open original URL */
              <a
                href={safeHref(videoIntroUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-full h-full group relative"
                aria-label="Watch video introduction"
              >
                {getVideoThumbnailUrl(videoIntroUrl) ? (
                  <img
                    src={getVideoThumbnailUrl(videoIntroUrl)!}
                    alt="Video thumbnail"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 w-full h-full" style={{ background: 'var(--pf-card, rgba(0,0,0,0.4))' }} />
                )}
                <div className="relative z-10 flex flex-col items-center gap-2">
                  <PlayCircle className="w-14 h-14 drop-shadow-lg transition-transform group-hover:scale-110" style={{ color: accentColor }} />
                  <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }}>
                    Watch Introduction
                  </span>
                </div>
              </a>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
});
PublicHero.displayName = 'PublicHero';
