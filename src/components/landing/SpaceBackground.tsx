/** SpaceBackground — thin layout wrapper. SkyWallpaper (fixed, z-0) provides the actual background. */
export function SpaceBackground({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen z-10">
      {children}
    </div>
  );
}

