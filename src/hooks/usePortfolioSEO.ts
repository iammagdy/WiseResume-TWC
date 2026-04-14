import { useEffect } from 'react';
import { EDGE_FUNCTIONS_URL } from '@/lib/supabaseConstants';
import type { PublicProfile } from '@/hooks/usePublicPortfolio';

export function usePortfolioSEO(profile: PublicProfile | undefined | null) {
  useEffect(() => {
    if (profile) {
      const name = profile.fullName || profile.username;
      
      // Title
      document.title = profile.metaTitle || (profile.jobTitle ? `${name} — ${profile.jobTitle}` : name);

      // Theme
      if (profile.theme) {
        document.documentElement.setAttribute("data-theme", profile.theme);
      } else {
        document.documentElement.removeAttribute("data-theme");
      }

      // Meta Description
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', 'description');
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', profile.metaDescription || profile.portfolioBio || `${name}'s professional portfolio`);

      // Robots meta: respect the user's noindex preference
      let robotsMeta = document.querySelector('meta[name="robots"]');
      if (!robotsMeta) {
        robotsMeta = document.createElement('meta');
        robotsMeta.setAttribute('name', 'robots');
        document.head.appendChild(robotsMeta);
      }
      robotsMeta.setAttribute('content', profile.seoNoindex ? 'noindex, nofollow' : 'index, follow');

      // OpenGraph / Twitter tags
      const setMeta = (prop: string, val: string, attr = 'property') => {
        let el = document.querySelector(`meta[${attr}="${prop}"]`);
        if (!el) { el = document.createElement('meta'); el.setAttribute(attr, prop); document.head.appendChild(el); }
        el.setAttribute('content', val);
      };
      
      const ogTitle = profile.metaTitle || (profile.jobTitle ? `${name} — ${profile.jobTitle}` : `${name}'s Portfolio`);
      const ogDesc = profile.metaDescription || profile.portfolioBio || `${name}'s professional portfolio`;
      const ogImageUrl = `${EDGE_FUNCTIONS_URL}/functions/v1/og-image?username=${encodeURIComponent(profile.username)}`;
      
      setMeta('og:title', ogTitle);
      setMeta('og:description', ogDesc);
      setMeta('og:type', 'profile');
      setMeta('og:image', ogImageUrl);
      setMeta('og:image:width', '1200');
      setMeta('og:image:height', '630');
      setMeta('twitter:card', 'summary_large_image', 'name');
      setMeta('twitter:title', ogTitle, 'name');
      setMeta('twitter:description', ogDesc, 'name');
      setMeta('twitter:image', ogImageUrl, 'name');

      // Load Google Fonts for premium themes
      const pStyle = profile.portfolioStyle || 'minimal';
      const needsFiraCode = pStyle === 'developer-terminal' || pStyle === 'neon-cyber';
      const needsSpaceGrotesk = pStyle === 'creative-spotlight' || pStyle === 'neon-cyber';
      const fontFamilies: string[] = [];
      if (needsFiraCode) fontFamilies.push('Fira+Code:wght@400;600;700');
      if (needsSpaceGrotesk) fontFamilies.push('Space+Grotesk:wght@400;500;600;700');
      
      if (fontFamilies.length > 0) {
        const linkId = 'pf-theme-fonts';
        let link = document.getElementById(linkId) as HTMLLinkElement | null;
        if (!link) {
          link = document.createElement('link');
          link.id = linkId;
          link.rel = 'stylesheet';
          document.head.appendChild(link);
        }
        link.href = `https://fonts.googleapis.com/css2?${fontFamilies.map(f => `family=${f}`).join('&')}&display=swap`;
      }
    }
    
    return () => {
      document.title = 'WiseResume';
      document.documentElement.removeAttribute("data-theme");
      const fontLink = document.getElementById('pf-theme-fonts');
      if (fontLink) fontLink.remove();
      const robotsMetaCleanup = document.querySelector('meta[name="robots"]');
      if (robotsMetaCleanup) robotsMetaCleanup.remove();
    };
  }, [profile]);
}
