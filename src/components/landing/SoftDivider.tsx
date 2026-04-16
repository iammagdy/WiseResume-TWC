export function SoftDivider({ product = 'wiseresume' }: { product?: 'wiseresume' | 'wisehire' }) {
  const color = product === 'wisehire'
    ? 'rgba(29,78,216,0.13)'
    : 'rgba(158,27,34,0.10)';
  return (
    <div
      aria-hidden="true"
      style={{
        width: '100%',
        height: 1,
        background: `linear-gradient(to right, transparent 0%, ${color} 20%, ${color} 80%, transparent 100%)`,
        margin: 0,
      }}
    />
  );
}
