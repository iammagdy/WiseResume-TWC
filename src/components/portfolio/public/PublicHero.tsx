import { forwardRef, useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MapPin, Linkedin, Github, Globe, X, Mail, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { TypewriterText, buildTypewriterPhrases } from '@/components/portfolio/public/TypewriterText';
import { isActiveWithin24h } from '@/hooks/useActiveStatus';
import { getThemeById } from '@/lib/portfolioThemes';
import type { PublicProfile, PublicResume } from '@/hooks/usePublicPortfolio';

export interface PublicHeroProps {
  profile: PublicProfile;
  resume: PublicResume;
  pStyle: string;
  accentColor: string;
  initials: string;
  liveLastActiveAt: string | null;
  allSkills: string[];
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0, 0, 0.2, 1] as const } },
};

export const PublicHero = forwardRef<HTMLDivElement, PublicHeroProps>(({
  profile,
  resume,
  pStyle,
  accentColor,
  initials,
  liveLastActiveAt,
  allSkills,
}, ref) => {
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

  const contactHref = profile?.contactEmail ? `mailto:${profile.contactEmail}` : profile?.linkedinUrl || null;

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
          <AvatarImage src={profile.avatarUrl || undefined} />
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
                  background: 'rgba(34,197,94,0.15)',
                  color: '#22c55e',
                  border: '1px solid rgba(34,197,94,0.3)',
                }}>
                  <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
                  Actively Looking
                </span>
              )}
              {profile.availabilityStatus === 'open-to-offers' && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full" style={{
                  background: 'rgba(245,158,11,0.15)',
                  color: '#f59e0b',
                  border: '1px solid rgba(245,158,11,0.3)',
                }}>
                  <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
                  Open to Offers
                </span>
              )}
              {!profile.availabilityStatus && profile.openToWork && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full" style={{
                  background: 'rgba(34,197,94,0.15)',
                  color: '#22c55e',
                  border: '1px solid rgba(34,197,94,0.3)',
                }}>
                  <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
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
                style={{ background: 'rgba(34,197,94,0.10)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)' }}
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22c55e] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22c55e]" />
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

            <div className="pf-fade-entrance" style={{ animationDelay: `${locationDelay}ms` }}>
              {typewriterPhrases.length > 0 ? <TypewriterText phrases={typewriterPhrases} accentColor={accentColor} /> : null}
            </div>

            {(profile.linkedinUrl || profile.githubUrl || profile.websiteUrl || profile.twitterUrl) && (
              <div className={`flex items-center ${heroJustify} gap-2 mb-6`}>
                {profile.linkedinUrl && (
                  <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer"
                    className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 pf-cta-entrance"
                    style={{ background: 'var(--pf-card, rgba(255,255,255,0.06))', border: '1px solid var(--pf-border, rgba(255,255,255,0.1))', animationDelay: `${ctaBaseDelay + (ctaIdx++) * 120}ms` }}
                    title="LinkedIn">
                    <Linkedin className="w-4 h-4" style={{ color: 'var(--pf-fg, #f5f5ff)' }} />
                  </a>
                )}
                {profile.githubUrl && (
                  <a href={profile.githubUrl} target="_blank" rel="noopener noreferrer"
                    className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 pf-cta-entrance"
                    style={{ background: 'var(--pf-card, rgba(255,255,255,0.06))', border: '1px solid var(--pf-border, rgba(255,255,255,0.1))', animationDelay: `${ctaBaseDelay + (ctaIdx++) * 120}ms` }}
                    title="GitHub">
                    <Github className="w-4 h-4" style={{ color: 'var(--pf-fg, #f5f5ff)' }} />
                  </a>
                )}
                {profile.websiteUrl && (
                  <a href={profile.websiteUrl} target="_blank" rel="noopener noreferrer"
                    className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 pf-cta-entrance"
                    style={{ background: 'var(--pf-card, rgba(255,255,255,0.06))', border: '1px solid var(--pf-border, rgba(255,255,255,0.1))', animationDelay: `${ctaBaseDelay + (ctaIdx++) * 120}ms` }}
                    title="Website">
                    <Globe className="w-4 h-4" style={{ color: 'var(--pf-fg, #f5f5ff)' }} />
                  </a>
                )}
                {profile.twitterUrl && (
                  <a href={profile.twitterUrl} target="_blank" rel="noopener noreferrer"
                    className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 pf-cta-entrance"
                    style={{ background: 'var(--pf-card, rgba(255,255,255,0.06))', border: '1px solid var(--pf-border, rgba(255,255,255,0.1))', animationDelay: `${ctaBaseDelay + (ctaIdx++) * 120}ms` }}
                    title="X / Twitter">
                    <X className="w-4 h-4" style={{ color: 'var(--pf-fg, #f5f5ff)' }} />
                  </a>
                )}
              </div>
            )}

            <div className={`flex items-center ${heroJustify} gap-3 flex-wrap`}>
              {profile.contactEmail && (
                <a
                  href={`mailto:${profile.contactEmail}`}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm transition-all hover:scale-105 active:scale-95 shadow-lg pf-cta-entrance"
                  style={{ background: accentColor, color: '#fff', boxShadow: `0 4px 20px -4px ${accentColor}60`, animationDelay: `${ctaBaseDelay + (ctaIdx++) * 120}ms` }}
                >
                  <Mail className="w-4 h-4" /> Get in Touch
                </a>
              )}
            </div>
          </>
        );
      })()}
    </motion.div>
  );
});
PublicHero.displayName = 'PublicHero';
