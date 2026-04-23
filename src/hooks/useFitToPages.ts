import { useEffect, useRef, type RefObject } from 'react';
import type { ResumeData, TemplateCustomization } from '@/types/resume';
import {
  prepareForMeasure,
  calculatePDFDimensions,
  DEFAULT_PAGE_WIDTH,
  DEFAULT_PAGE_HEIGHT,
  FOOTER_RESERVED_PT,
} from '@/lib/pdfGenerator';
import {
  PAGE_FORMAT_PX,
  COMPACT_SCALE_MIN,
  AUTO_FIT_SCALE_MAX,
} from '@/lib/templateCustomization';

const SCALE_DELTA_THRESHOLD = 0.005;
const DEBOUNCE_MS = 250;
const REFINE_DELAY_MS = 350;
const MAX_ITERATIONS = 4;

export interface UseFitToPagesArgs {
  /** Ref to the live `[data-resume-template]` element. */
  templateRef: RefObject<HTMLElement | null>;
  /** Current resume from the store. */
  resume: ResumeData | null;
  /** Called when the hook decides the customization.fontScale should change. */
  onScaleComputed: (scale: number) => void;
}

/**
 * Auto-fit the live resume preview into `customization.targetPageCount` pages
 * by computing a `fontScale` that, combined with the `--compact-scale` CSS
 * overrides emitted by `generateCustomizationCSS`, shrinks the rendered DOM
 * height to roughly `target * printablePageHeight`.
 *
 * Behavior:
 * - When `targetPageCount` is undefined → no-op (manual mode).
 * - When set → measures the current rendered height (no scroll perturbation),
 *   projects a new scale linearly, and calls `onScaleComputed` if the delta
 *   is meaningful. After the patch re-renders the template, the hook
 *   re-measures up to `MAX_ITERATIONS - 1` more times to converge (text
 *   re-wrapping at smaller sizes is non-linear, so one shot isn't always
 *   enough).
 *
 * Loop-safety: iteration counter resets only when the inputs that define
 * "what we're trying to fit" change (target, page format, content fingerprint,
 * heading/body font choice). It does NOT reset when fontScale itself changes,
 * which is what prevents an infinite update loop.
 */
export function useFitToPages({ templateRef, resume, onScaleComputed }: UseFitToPagesArgs) {
  const target = resume?.customization?.targetPageCount;
  // Default to 'letter' to match the rest of the app/export pipeline
  // (LivePreviewPanel page-break estimator, pdfGenerator.getPageDimensions).
  // Defaulting to 'a4' here would cause the fit math to use A4 printable
  // height while the actual export uses letter, producing a fontScale that
  // is systematically too large.
  const pageFormat = resume?.customization?.pageFormat ?? 'letter';
  const fontBody = resume?.customization?.fontBody;
  const fontHeading = resume?.customization?.fontHeading;
  // headerAlign affects header wrap height in some templates (e.g. center
  // alignment can stack contact info on multiple lines). Including it in
  // the input key ensures auto-fit re-measures immediately after a
  // toggle, instead of waiting for the next content edit.
  const headerAlign = resume?.customization?.headerAlign;
  const currentScale = resume?.customization?.fontScale ?? 1;

  // Cheap content fingerprint — enough to detect "user added/removed stuff"
  // without serialising the whole resume on every keystroke. The
  // LivePreviewPanel already debounces resume->template renders by ~100ms,
  // and we add another DEBOUNCE_MS here.
  const contentKey = resume ? makeContentKey(resume) : '';

  const iterRef = useRef(0);
  const lastInputKeyRef = useRef<string>('');
  // Latest callback in a ref so the measurement effect doesn't re-fire just
  // because the parent re-rendered with a new closure.
  const cbRef = useRef(onScaleComputed);
  useEffect(() => { cbRef.current = onScaleComputed; }, [onScaleComputed]);

  useEffect(() => {
    if (!target) return;
    const inputKey = `${target}|${pageFormat}|${contentKey}|${fontBody ?? ''}|${fontHeading ?? ''}|${headerAlign ?? ''}`;
    if (lastInputKeyRef.current !== inputKey) {
      lastInputKeyRef.current = inputKey;
      iterRef.current = 0;
    }
    if (iterRef.current >= MAX_ITERATIONS) return;
    if (!templateRef.current) return;

    const t = setTimeout(() => {
      runMeasurement({
        el: templateRef.current,
        target,
        pageFormat,
        currentScale,
        cb: cbRef.current,
        bumpIter: () => { iterRef.current += 1; },
      });
    }, iterRef.current === 0 ? DEBOUNCE_MS : REFINE_DELAY_MS);
    return () => clearTimeout(t);
    // currentScale is intentionally in deps so we re-measure after the patch
    // applies — but iterRef caps the loop so we cannot oscillate forever.
  }, [target, pageFormat, contentKey, fontBody, fontHeading, headerAlign, currentScale, templateRef]);
}

interface RunArgs {
  el: HTMLElement | null;
  target: number;
  pageFormat: 'a4' | 'letter';
  currentScale: number;
  cb: (scale: number) => void;
  bumpIter: () => void;
}

function runMeasurement({ el, target, pageFormat, currentScale, cb, bumpIter }: RunArgs): void {
  if (!el) return;
  const dims = PAGE_FORMAT_PX[pageFormat] || PAGE_FORMAT_PX.letter;
  const pw = dims?.width || DEFAULT_PAGE_WIDTH;
  const ph = dims?.height || DEFAULT_PAGE_HEIGHT;
  const printable = ph - FOOTER_RESERVED_PT;

  const cleanup = prepareForMeasure(el, pw);
  let totalHeight = 0;
  try {
    const r = calculatePDFDimensions(el, pw, ph);
    totalHeight = r.totalHeight;
  } finally {
    cleanup();
  }
  if (totalHeight <= 0) return;

  // Linear projection: assume rendered height scales roughly linearly with
  // --compact-scale. Not perfectly true (text re-wraps at smaller sizes), so
  // we let the effect re-fire with the new currentScale to refine.
  const desired = currentScale * (target * printable) / totalHeight;
  // Auto-fit clamps to [MIN, AUTO_FIT_MAX]. AUTO_FIT_MAX = 1.0 because
  // auto-fit is meant to shrink — never grow — the resume.
  const clamped = Math.max(COMPACT_SCALE_MIN, Math.min(AUTO_FIT_SCALE_MAX, desired));

  bumpIter();

  if (Math.abs(clamped - currentScale) > SCALE_DELTA_THRESHOLD) {
    cb(clamped);
  }
}

function makeContentKey(resume: ResumeData): string {
  // Length-based fingerprint of every section. Cheap to compute and changes
  // whenever the user adds/removes/edits content meaningfully.
  return [
    resume.summary?.length ?? 0,
    resume.experience?.length ?? 0,
    resume.education?.length ?? 0,
    resume.skills?.length ?? 0,
    resume.projects?.length ?? 0,
    resume.certifications?.length ?? 0,
    resume.awards?.length ?? 0,
    resume.publications?.length ?? 0,
    resume.volunteering?.length ?? 0,
    resume.hobbies?.length ?? 0,
    resume.references?.length ?? 0,
    resume.languages?.length ?? 0,
    JSON.stringify(resume.experience ?? []).length,
    JSON.stringify(resume.education ?? []).length,
    JSON.stringify(resume.projects ?? []).length,
    (resume.summary ?? '').length,
  ].join('|');
}
