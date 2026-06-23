import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Archive, Search, Star } from 'lucide-react';

const POOL = [
  { initials: 'LO', name: 'Lisa O.', role: 'Product Designer', tags: ['Figma', 'UX Research'], score: 93, starred: true },
  { initials: 'DH', name: 'David H.', role: 'Backend Eng.', tags: ['Go', 'PostgreSQL'], score: 88, starred: false },
  { initials: 'MR', name: 'Maya R.', role: 'Data Analyst', tags: ['Python', 'SQL'], score: 82, starred: true },
  { initials: 'CN', name: 'Chris N.', role: 'FE Engineer', tags: ['React', 'TypeScript'], score: 79, starred: false },
];

const SEARCH_TERMS = ['React', 'Go', 'Figma', ''];

function avatarBg(i: number) {
  const bgs = [
    'linear-gradient(135deg,#EC4899,#DB2777)',
    'linear-gradient(135deg,#06B6D4,#0891B2)',
    'linear-gradient(135deg,#8B5CF6,#6D28D9)',
    'linear-gradient(135deg,#F59E0B,#D97706)',
  ];
  return bgs[i % bgs.length];
}

export function TalentPoolDemo() {
  const prefersReduced = useReducedMotion();
  const [searchIdx, setSearchIdx] = useState(0);
  const [typedSearch, setTypedSearch] = useState('');

  useEffect(() => {
    if (prefersReduced) {
      setTypedSearch(SEARCH_TERMS[0]);
      setSearchIdx(0);
      return;
    }

    let cancelled = false;
    let charIdx = 0;
    let termIdx = 0;

    const typeNext = () => {
      if (cancelled) return;
      const term = SEARCH_TERMS[termIdx % SEARCH_TERMS.length];

      if (charIdx <= term.length) {
        setTypedSearch(term.slice(0, charIdx));
        setSearchIdx(termIdx % SEARCH_TERMS.length);
        charIdx += 1;
        setTimeout(typeNext, 80);
      } else {
        setTimeout(() => {
          if (cancelled) return;
          charIdx = 0;
          termIdx += 1;
          typeNext();
        }, 1800);
      }
    };

    setTimeout(typeNext, 600);
    return () => { cancelled = true; };
  }, [prefersReduced]);

  const filtered = typedSearch
    ? POOL.filter((p) => p.tags.some((t) => t.toLowerCase().includes(typedSearch.toLowerCase())) || p.role.toLowerCase().includes(typedSearch.toLowerCase()))
    : POOL;

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 320,
        borderRadius: 16,
        background: 'var(--lp-card)',
        border: '1px solid var(--lp-border-card)',
        overflow: 'hidden',
        fontFamily: 'inherit',
      }}
    >
      <div
        style={{
          padding: '10px 14px',
          borderBottom: '1px solid var(--lp-border)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(29,78,216,0.06)',
        }}
      >
        <Archive className="w-3.5 h-3.5" style={{ color: '#3B82F6', flexShrink: 0 }} />
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--lp-text)' }}>Talent Pool</span>
        <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--lp-text-muted)' }}>{POOL.length} saved</span>
      </div>

      <div style={{ padding: '10px 14px 0' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'var(--lp-card-glass)',
            border: '1px solid var(--lp-border-card)',
            borderRadius: 8,
            padding: '6px 10px',
            marginBottom: 10,
          }}
        >
          <Search className="w-3 h-3" style={{ color: 'var(--lp-text-muted)', flexShrink: 0 }} />
          <span style={{ fontSize: '0.72rem', color: typedSearch ? 'var(--lp-text)' : 'var(--lp-text-muted)', flex: 1 }}>
            {typedSearch || 'Search by skill, role…'}
          </span>
          {typedSearch && (
            <span
              style={{
                display: 'inline-block',
                width: 2,
                height: '0.75em',
                background: '#3B82F6',
                marginLeft: 1,
                verticalAlign: 'middle',
                borderRadius: 1,
                animation: prefersReduced ? 'none' : 'lp-blink 0.8s step-end infinite',
              }}
            />
          )}
        </div>
      </div>

      <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {filtered.map((p, i) => (
          <div
            key={p.name}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              borderRadius: 10,
              background: 'var(--lp-card-glass)',
              border: '1px solid var(--lp-border-card)',
              padding: '8px 10px',
              opacity: 1,
              transition: 'opacity 0.3s ease',
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: avatarBg(i),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '0.52rem',
                fontWeight: 800,
                flexShrink: 0,
                marginTop: 1,
              }}
              aria-hidden="true"
            >
              {p.initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--lp-text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.name}
                </span>
                {p.starred && <Star className="w-3 h-3" style={{ color: '#F59E0B', fill: '#F59E0B', flexShrink: 0 }} />}
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#60A5FA', background: 'rgba(96,165,250,0.12)', borderRadius: 4, padding: '1px 5px' }}>
                  {p.score}
                </span>
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--lp-text-muted)', marginBottom: 4 }}>{p.role}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                {p.tags.map((tag) => (
                  <span
                    key={tag}
                    aria-hidden="true"
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 600,
                      color: typedSearch && tag.toLowerCase().includes(typedSearch.toLowerCase()) ? '#3B82F6' : 'var(--lp-text-muted)',
                      background: typedSearch && tag.toLowerCase().includes(typedSearch.toLowerCase()) ? 'rgba(29,78,216,0.12)' : 'var(--lp-card-glass)',
                      border: '1px solid var(--lp-border)',
                      borderRadius: 4,
                      padding: '1px 5px',
                      transition: 'color 0.2s, background 0.2s',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
