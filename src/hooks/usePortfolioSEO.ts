import { useEffect } from 'react';
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
      setMeta('og:title', ogTitle);
      setMeta('og:description', ogDesc);
      setMeta('og:type', 'profile');
      const apiUrl = import.meta.env.VITE_API_URL as string | undefined;
      if (apiUrl && profile.username) {
        setMeta('og:image', `${apiUrl}/og-image/${encodeURIComponent(profile.username)}`);
        setMeta('twitter:image', `${apiUrl}/og-image/${encodeURIComponent(profile.username)}`, 'name');
      }
      setMeta('twitter:card', 'summary_large_image', 'name');
      setMeta('twitter:title', ogTitle, 'name');
      setMeta('twitter:description', ogDesc, 'name');

      // JSON-LD Person schema for rich search results
      const jsonLdId = 'pf-jsonld';
      let jsonLdEl = document.getElementById(jsonLdId);
      if (!jsonLdEl) {
        jsonLdEl = document.createElement('script');
        jsonLdEl.id = jsonLdId;
        jsonLdEl.setAttribute('type', 'application/ld+json');
        document.head.appendChild(jsonLdEl);
      }
      const jsonLdData: Record<string, unknown> = {
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: name,
      };
      if (profile.jobTitle) jsonLdData.jobTitle = profile.jobTitle;
      if (profile.portfolioBio) jsonLdData.description = profile.portfolioBio;
      if (profile.username) jsonLdData.url = `https://wiseresume.app/p/${profile.username}`;
      if (profile.linkedinUrl) jsonLdData.sameAs = [profile.linkedinUrl];
      if (profile.githubUrl) {
        jsonLdData.sameAs = [...((jsonLdData.sameAs as string[]) ?? []), profile.githubUrl];
      }
      if (profile.twitterUrl) {
        jsonLdData.sameAs = [...((jsonLdData.sameAs as string[]) ?? []), profile.twitterUrl];
      }
      if (profile.contactEmail) jsonLdData.email = profile.contactEmail;
      jsonLdEl.textContent = JSON.stringify(jsonLdData);

      // Load Google Fonts for premium themes
      const pStyle = profile.portfolioStyle || 'minimal';
      const needsFiraCode = pStyle === 'developer-terminal' || pStyle === 'neon-cyber';
      const needsSpaceGrotesk = pStyle === 'creative-spotlight' || pStyle === 'neon-cyber';
      const fontFamilies: string[] = [];
      if (needsFiraCode) fontFamilies.push('Fira+Code:wght@400;600;700');
      if (needsSpaceGrotesk) fontFamilies.push('Space+Grotesk:wght@400;500;600;700');
      
      if (fontFamilies.length > 0) {
        const preconnectId = 'pf-fonts-preconnect';
        if (!document.getElementById(preconnectId)) {
          const preconnect = document.createElement('link');
          preconnect.id = preconnectId;
          preconnect.rel = 'preconnect';
          preconnect.href = 'https://fonts.googleapis.com';
          document.head.appendChild(preconnect);

          const preconnectGstatic = document.createElement('link');
          preconnectGstatic.id = 'pf-fonts-preconnect-gstatic';
          preconnectGstatic.rel = 'preconnect';
          preconnectGstatic.href = 'https://fonts.gstatic.com';
          preconnectGstatic.crossOrigin = 'anonymous';
          document.head.appendChild(preconnectGstatic);
        }

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
      const jsonLdCleanup = document.getElementById('pf-jsonld');
      if (jsonLdCleanup) jsonLdCleanup.remove();
      const fontLink = document.getElementById('pf-theme-fonts');
      if (fontLink) fontLink.remove();
      const preconnectLink = document.getElementById('pf-fonts-preconnect');
      if (preconnectLink) preconnectLink.remove();
      const preconnectGstaticLink = document.getElementById('pf-fonts-preconnect-gstatic');
      if (preconnectGstaticLink) preconnectGstaticLink.remove();
      const robotsMetaCleanup = document.querySelector('meta[name="robots"]');
      if (robotsMetaCleanup) robotsMetaCleanup.remove();
    };
  }, [profile]);
}
