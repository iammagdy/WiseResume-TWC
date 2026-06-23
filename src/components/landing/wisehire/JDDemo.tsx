import { useEffect, useState, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Check, FileText, Sparkles } from 'lucide-react';

const JD_LINES = [
  'About the role',
  'We\'re looking for a Senior Frontend Engineer to join our',
  'product team and help build the next generation of our',
  'hiring platform. You\'ll work across the full frontend',
  'stack with React, TypeScript, and modern tooling.',
  '',
  'Requirements',
  '• 5+ years of React & TypeScript experience',
  '• Strong understanding of web performance',
  '• Experience working in agile teams',
  '• Eye for clean, accessible UI design',
  '',
  'Nice to have',
  '• Familiarity with hiring or HR workflows',
  '• GraphQL or REST API design experience',
];

export function JDDemo() {
  const prefersReduced = useReducedMotion();
  const [lineIdx, setLineIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [displayedLines, setDisplayedLines] = useState<string[]>(prefersReduced ? JD_LINES : ['']);
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(!!prefersReduced);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prefersReduced) {
      setDisplayedLines(JD_LINES);
      setDone(true);
      return;
    }
    const startDelay = setTimeout(() => setGenerating(true), 600);
    return () => clearTimeout(startDelay);
  }, [prefersReduced]);

  useEffect(() => {
    if (!done || prefersReduced) return;
    let inner: ReturnType<typeof setTimeout>;
    const t = setTimeout(() => {
      setDone(false);
      setGenerating(false);
      setLineIdx(0);
      setCharIdx(0);
      setDisplayedLines(['']);
      inner = setTimeout(() => setGenerating(true), 600);
    }, 2500);
    return () => {
      clearTimeout(t);
      clearTimeout(inner);
    };
  }, [done]);

  useEffect(() => {
    if (!generating || done) return;
    const currentLine = JD_LINES[lineIdx] ?? '';

    if (charIdx < currentLine.length) {
      const t = setTimeout(() => {
        setDisplayedLines((prev) => {
          const next = [...prev];
          next[lineIdx] = currentLine.slice(0, charIdx + 1);
          return next;
        });
        setCharIdx((i) => i + 1);
      }, 18);
      return () => clearTimeout(t);
    } else {
      const nextIdx = lineIdx + 1;
      if (nextIdx >= JD_LINES.length) {
        setDone(true);
        return;
      }
      const t = setTimeout(() => {
        setLineIdx(nextIdx);
        setCharIdx(0);
        setDisplayedLines((prev) => [...prev, '']);
        if (containerRef.current) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
      }, currentLine === '' ? 60 : 40);
      return () => clearTimeout(t);
    }
  }, [generating, done, lineIdx, charIdx]);

  const isHeader = (s: string) =>
    s === 'About the role' || s === 'Requirements' || s === 'Nice to have';

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 320,
        borderRadius: 16,
        background: 'var(--lp-card)',
        border: '1px solid var(--lp-border-card)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
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
        <FileText className="w-3.5 h-3.5" style={{ color: '#3B82F6', flexShrink: 0 }} />
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--lp-text)' }}>AI JD Writer</span>
        {generating && !done && (
          <span
            className="flex items-center gap-1"
            style={{ marginLeft: 'auto', fontSize: '0.72rem', color: '#3B82F6', fontWeight: 600 }}
          >
            <Sparkles className="w-3 h-3 animate-pulse" />
            Writing…
          </span>
        )}
        {done && (
          <span className="flex items-center gap-1" style={{ marginLeft: 'auto', fontSize: '0.72rem', color: '#34D399', fontWeight: 600 }}>
            <Check className="w-3 h-3" />
            Done
          </span>
        )}
      </div>

      {/* Role input */}
      <div style={{ padding: '10px 14px 0', borderBottom: '1px solid var(--lp-border)' }}>
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
          <span style={{ fontSize: '0.72rem', color: 'var(--lp-text-muted)', flexShrink: 0 }}>Role:</span>
          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--lp-text)' }}>
            Senior Frontend Engineer
          </span>
          <div
            style={{
              marginLeft: 'auto',
              background: '#1D4ED8',
              color: '#fff',
              borderRadius: 6,
              padding: '2px 8px',
              fontSize: '0.72rem',
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            Generate <Sparkles className="w-2.5 h-2.5 inline-block" />
          </div>
        </div>
      </div>

      {/* Generated content */}
      <div
        ref={containerRef}
        style={{
          padding: '10px 14px 14px',
          maxHeight: 220,
          overflowY: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        {displayedLines.map((line, i) => {
          if (line === '') return <div key={i} style={{ height: 6 }} />;
          const header = isHeader(line);
          return (
            <p
              key={i}
              style={{
                fontSize: '0.72rem',
                fontWeight: header ? 700 : 400,
                color: header ? 'var(--lp-text)' : 'var(--lp-text-muted)',
                lineHeight: 1.55,
                marginBottom: header ? 4 : 2,
              }}
            >
              {line}
              {i === displayedLines.length - 1 && !done && (
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
            </p>
          );
        })}
      </div>
    </div>
  );
}
