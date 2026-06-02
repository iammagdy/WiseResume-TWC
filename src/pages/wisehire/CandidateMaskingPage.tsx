import { useState, useCallback, useEffect, useRef } from 'react';
import { ShieldCheck, Upload, Download, Trash2, AlertCircle, X, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { MiniSpinner } from '@/components/ui/MiniSpinner';
import { WiseHireShell } from '@/components/wisehire/WiseHireShell';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MaskedCVCard } from '@/components/wisehire/MaskedCVCard';
import { useMaskCVs, type MaskResult } from '@/hooks/wisehire/useMaskCVs';
import { useMaskSessions, useInvalidateMaskSessions } from '@/hooks/wisehire/useMaskSessions';
import { cn } from '@/lib/utils';
import JSZip from 'jszip';
import { format } from 'date-fns';

const MAX_FILES = 10;
const MAX_FILE_SIZE_MB = 5;

const SESSION_KEY = 'wisehire_mask_results';

export default function CandidateMaskingPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<MaskResult[] | null>(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      return stored ? (JSON.parse(stored) as MaskResult[]) : null;
    } catch {
      return null;
    }
  });
  const [byokNeeded, setByokNeeded] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const maskCVs = useMaskCVs();
  const { data: pastSessions = [] } = useMaskSessions();
  const invalidateSessions = useInvalidateMaskSessions();

  const autoLoadedRef = useRef(false);
  useEffect(() => {
    if (autoLoadedRef.current) return;
    if (results !== null) { autoLoadedRef.current = true; return; }
    if (pastSessions.length === 0) return;
    autoLoadedRef.current = true;
    const latest = pastSessions[0];
    setResults(latest.results);
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(latest.results)); } catch { /* quota */ }
  }, [pastSessions, results]);

  const addFiles = useCallback((incoming: File[]) => {
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name));
      const fresh = incoming.filter(
        (f) => !existing.has(f.name) && f.type === 'application/pdf' && f.size <= MAX_FILE_SIZE_MB * 1024 * 1024
      );
      return [...prev, ...fresh].slice(0, MAX_FILES);
    });
  }, []);

  function removeFile(name: string) {
    setFiles((prev) => prev.filter((f) => f.name !== name));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    addFiles(Array.from(e.dataTransfer.files));
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  }

  async function handleProcess() {
    setByokNeeded(false);
    setResults(null);
    try {
      const data = await maskCVs.mutateAsync(files);
      setResults(data);
      try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(data)); } catch { /* quota */ }
      invalidateSessions();
    } catch (err: unknown) {
      if ((err as Error & { code?: string }).code === 'requires_api_key') {
        setByokNeeded(true);
      }
    }
  }

  async function handleDownloadAll(targetResults?: MaskResult[]) {
    const toDownload = targetResults ?? results;
    if (!toDownload) return;
    const zip = new JSZip();
    toDownload.forEach((r) => {
      const highlighted = r.maskedText.replace(/\[([^\]]+)\]/g, (_: string, label: string) =>
        `<mark style="background:#fef08a;color:#713f12;border-radius:3px;padding:0 3px;font-family:monospace;font-size:.82em;font-weight:700;border:1px solid #fde047">[${label}]</mark>`
      );
      const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${r.label} – Anonymised CV</title>` +
        `<style>body{font-family:Georgia,serif;max-width:750px;margin:40px auto;padding:0 24px;color:#1a202c;line-height:1.75;background:#fff}` +
        `h1{color:#1e40af;font-size:1.25rem}hr{border:none;border-top:1px solid #e2e8f0;margin:20px 0}` +
        `.cv-body{font-size:.9rem;line-height:1.8;color:#374151}.footer{margin-top:40px;font-size:.72rem;color:#94a3b8;text-align:center;border-top:1px solid #e2e8f0;padding-top:16px}</style></head>` +
        `<body><h1>${r.label}</h1><p style="font-size:.8rem;color:#64748b">Source: ${r.filename} · WiseHire CV Masking</p><hr>` +
        `<div class="cv-body">${highlighted.replace(/\n/g, '<br>')}</div>` +
        `<div class="footer">Anonymised for bias-free candidate review.</div></body></html>`;
      zip.file(`${r.label.replace(' ', '_')}_masked.html`, html);
    });
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'masked_cvs.zip';
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleReset() {
    setFiles([]);
    setResults(null);
    setByokNeeded(false);
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
  }

  function loadSession(sessionResults: MaskResult[]) {
    setResults(sessionResults);
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionResults)); } catch { /* quota */ }
    setFiles([]);
    setByokNeeded(false);
  }

  const canProcess = files.length > 0 && !maskCVs.isPending;

  return (
    <WiseHireShell>
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            CV Masking
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload up to {MAX_FILES} PDF CVs — AI strips all personal information so you can share them bias-free.
          </p>
        </div>

        {/* Upload zone (hidden when results are shown) */}
        {!results && (
          <div className="rounded-xl border bg-card p-5 space-y-4">
            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={cn(
                'relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors cursor-pointer',
                dragOver
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                  : 'border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:bg-blue-50/40 dark:hover:bg-blue-950/20',
              )}
              onClick={() => document.getElementById('cv-file-input')?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && document.getElementById('cv-file-input')?.click()}
              aria-label="Upload PDF CVs"
            >
              <input
                id="cv-file-input"
                type="file"
                accept="application/pdf"
                multiple
                className="sr-only"
                onChange={handleFileInput}
                disabled={maskCVs.isPending}
              />
              <Upload className="h-8 w-8 text-blue-500 mb-2" />
              <p className="text-sm font-medium text-center">
                Drag & drop PDF CVs here, or <span className="text-blue-600 dark:text-blue-400 underline">browse</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PDF only · max {MAX_FILE_SIZE_MB} MB per file · up to {MAX_FILES} files
              </p>
            </div>

            {/* File list */}
            {files.length > 0 && (
              <ul className="space-y-1.5">
                {files.map((f) => (
                  <li
                    key={f.name}
                    className="flex items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm"
                  >
                    <span className="truncate text-xs font-medium">{f.name}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-muted-foreground">
                        {(f.size / 1024).toFixed(0)} KB
                      </span>
                      <button
                        onClick={() => removeFile(f.name)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        aria-label={`Remove ${f.name}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {files.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {files.length} / {MAX_FILES} files selected
              </p>
            )}

            {byokNeeded && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Your plan requires an OpenAI or Anthropic API key to use CV Masking.{' '}
                  <a href="/wisehire/settings" className="underline font-medium">
                    Add your key in Settings.
                  </a>
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleProcess}
              disabled={!canProcess}
              className="w-full sm:w-auto gap-2 bg-blue-700 hover:bg-blue-800 text-white"
            >
              {maskCVs.isPending ? (
                <>
                  <MiniSpinner size={16} />
                  Masking {files.length} CV{files.length !== 1 ? 's' : ''}…
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  Mask All ({files.length})
                </>
              )}
            </Button>
          </div>
        )}

        {/* Loading skeleton */}
        {maskCVs.isPending && (
          <div className="space-y-3">
            {files.map((f) => (
              <div key={f.name} className="rounded-xl border bg-card p-5 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-24 bg-muted rounded" />
                    <div className="h-2.5 w-40 bg-muted rounded" />
                  </div>
                </div>
                <div className="mt-3 h-2 w-full bg-muted rounded" />
                <div className="mt-1.5 h-2 w-3/4 bg-muted rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        {results && !maskCVs.isPending && (
          <>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-sm font-medium text-muted-foreground">
                {results.length} CV{results.length !== 1 ? 's' : ''} anonymised
              </p>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => handleDownloadAll()} className="gap-1.5">
                  <Download className="h-3.5 w-3.5" />
                  Download All as ZIP
                </Button>
                <Button size="sm" variant="ghost" onClick={handleReset} className="gap-1.5 text-muted-foreground">
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear & start over
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {results.map((r) => (
                <MaskedCVCard key={r.label} result={r} />
              ))}
            </div>
          </>
        )}

        {/* Previous sessions */}
        {pastSessions.length > 0 && (
          <div className="rounded-xl border bg-card overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium hover:bg-muted/30 transition-colors"
              onClick={() => setHistoryOpen((o) => !o)}
              aria-expanded={historyOpen}
            >
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Previous Sessions ({pastSessions.length})
              </span>
              {historyOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {historyOpen && (
              <ul className="divide-y border-t">
                {pastSessions.map((session) => (
                  <li
                    key={session.id}
                    className="px-5 py-3 flex items-center justify-between gap-4 cursor-pointer hover:bg-muted/20 transition-colors"
                    onClick={() => loadSession(session.results)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && loadSession(session.results)}
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {session.results.length} CV{session.results.length !== 1 ? 's' : ''} anonymised
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(session.created_at), 'MMM d, yyyy · h:mm a')}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1.5 text-muted-foreground shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadAll(session.results);
                      }}
                      aria-label="Download this session as ZIP"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </WiseHireShell>
  );
}
