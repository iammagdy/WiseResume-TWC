/** HomeBackground — thin layout wrapper. SkyWallpaper (fixed, z-0) provides the actual background. */
interface HomeBackgroundProps {
  children: React.ReactNode;
}

export function HomeBackground({ children }: HomeBackgroundProps) {
  return (
    <div className="relative min-h-full z-10">
      {children}
    </div>
  );
}
