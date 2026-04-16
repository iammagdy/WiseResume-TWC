interface SoftDividerProps {
  product?: 'wiseresume' | 'wisehire';
}

export function SoftDivider({ product = 'wiseresume' }: SoftDividerProps) {
  const color = product === 'wisehire'
    ? 'rgba(37,99,235,0.12)'
    : 'rgba(185,28,28,0.10)';

  return (
    <div
      aria-hidden="true"
      style={{
        width: '100%',
        height: '1px',
        background: `linear-gradient(to right, transparent, ${color}, transparent)`,
        margin: '0 auto',
      }}
    />
  );
}
