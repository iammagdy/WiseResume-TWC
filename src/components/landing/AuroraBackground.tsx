import Aurora from './Aurora';

export function AuroraBackground() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -1,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
      aria-hidden="true"
    >
      <Aurora
        colorStops={['#7c0404', '#706666', '#8e0101']}
        blend={0.47}
        amplitude={1.0}
        speed={1.3}
      />
    </div>
  );
}
