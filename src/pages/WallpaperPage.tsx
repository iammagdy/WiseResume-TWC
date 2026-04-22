import logoSrc from '@/assets/wiseresume-logo-light.webp';
import { AuroraBackground } from '@/components/landing/AuroraBackground';

export default function WallpaperPage() {
  return (
    <div
      id="wallpaper-root"
      style={{
        width: '1920px',
        height: '1080px',
        position: 'relative',
        overflow: 'hidden',
        background: '#0a0a0f',
      }}
    >
      <AuroraBackground product="jobseeker" />

      <div
        style={{
          position: 'absolute',
          top: '36px',
          left: '48px',
          zIndex: 10,
        }}
      >
        <img
          src={logoSrc}
          alt="WiseResume"
          style={{
            width: '48px',
            height: '48px',
            objectFit: 'contain',
            borderRadius: '12px',
          }}
        />
      </div>
    </div>
  );
}
