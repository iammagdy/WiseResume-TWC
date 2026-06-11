import { useCallback, useEffect, useRef, useState } from 'react';

import { GripVertical } from 'lucide-react';

import type { ResumeData, SuperTailorResult, TemplateId } from '@/types/resume';

import { applyTailorCompareHighlights } from '@/lib/tailorCompareHighlights';

import { ScaledResumePage } from './ScaledResumePage';

import { cn } from '@/lib/utils';



interface TailorResumeCompareSliderProps {

  beforeResume: ResumeData;

  afterResume: ResumeData;

  templateId: TemplateId;

  tailorResult?: SuperTailorResult | null;

  className?: string;

}



function clampPosition(pct: number) {

  return Math.min(100, Math.max(0, pct));

}



export function TailorResumeCompareSlider({

  beforeResume,

  afterResume,

  templateId,

  tailorResult,

  className,

}: TailorResumeCompareSliderProps) {

  const [position, setPosition] = useState(50);

  const positionRef = useRef(50);

  const dragging = useRef(false);



  const scrollRef = useRef<HTMLDivElement | null>(null);

  const stageRef = useRef<HTMLDivElement | null>(null);

  const beforeClipRef = useRef<HTMLDivElement | null>(null);

  const beforeSizerRef = useRef<HTMLDivElement | null>(null);

  const handleRef = useRef<HTMLDivElement | null>(null);

  const beforeInnerRef = useRef<HTMLElement | null>(null);
  const afterInnerRef = useRef<HTMLElement | null>(null);



  const [stageWidth, setStageWidth] = useState(0);

  const [rawHeights, setRawHeights] = useState({ before: 0, after: 0 });



  const stageHeight = Math.max(rawHeights.before, rawHeights.after);



  const applyHighlights = useCallback(() => {
    applyTailorCompareHighlights(beforeInnerRef.current, beforeResume, afterResume, tailorResult, { side: 'before' });
    applyTailorCompareHighlights(afterInnerRef.current, beforeResume, afterResume, tailorResult, { side: 'after' });
  }, [afterResume, beforeResume, tailorResult]);

  const handleBeforeMount = useCallback((root: HTMLElement | null) => {
    beforeInnerRef.current = root;
    requestAnimationFrame(() => applyHighlights());
  }, [applyHighlights]);

  const handleAfterMount = useCallback((root: HTMLElement | null) => {
    afterInnerRef.current = root;
    requestAnimationFrame(() => applyHighlights());
  }, [applyHighlights]);



  useEffect(() => {

    applyHighlights();

  }, [applyHighlights, templateId]);



  const applyPositionToDom = useCallback((pct: number) => {

    const p = clampPosition(pct);

    positionRef.current = p;

    if (beforeClipRef.current) {

      beforeClipRef.current.style.width = `${p}%`;

    }

    if (handleRef.current) {

      handleRef.current.style.left = `${p}%`;

    }

  }, []);



  const commitPosition = useCallback((pct: number) => {

    const p = clampPosition(pct);

    applyPositionToDom(p);

    setPosition(p);

  }, [applyPositionToDom]);



  const updateFromClientX = useCallback((clientX: number) => {

    const stage = stageRef.current;

    if (!stage) return;

    const rect = stage.getBoundingClientRect();

    const pct = ((clientX - rect.left) / rect.width) * 100;

    applyPositionToDom(pct);

  }, [applyPositionToDom]);



  useEffect(() => {

    applyPositionToDom(position);

  }, [applyPositionToDom, position, stageWidth]);



  useEffect(() => {

    const stage = stageRef.current;

    if (!stage) return;

    const ro = new ResizeObserver(() => {

      setStageWidth(stage.offsetWidth);

      if (beforeSizerRef.current) {

        beforeSizerRef.current.style.width = `${stage.offsetWidth}px`;

      }

    });

    ro.observe(stage);

    setStageWidth(stage.offsetWidth);

    return () => ro.disconnect();

  }, [stageHeight]);



  const onBeforeLayout = useCallback((layout: { scaledHeight: number }) => {

    setRawHeights((h) => ({ ...h, before: layout.scaledHeight }));

  }, []);



  const onAfterLayout = useCallback((layout: { scaledHeight: number }) => {

    setRawHeights((h) => ({ ...h, after: layout.scaledHeight }));

  }, []);



  useEffect(() => {

    setRawHeights({ before: 0, after: 0 });

  }, [templateId, beforeResume, afterResume]);



  useEffect(() => {

    const onMove = (e: PointerEvent) => {

      if (!dragging.current) return;

      e.preventDefault();

      updateFromClientX(e.clientX);

    };

    const onUp = () => {

      if (!dragging.current) return;

      dragging.current = false;

      setPosition(positionRef.current);

    };

    window.addEventListener('pointermove', onMove, { passive: false });

    window.addEventListener('pointerup', onUp);

    return () => {

      window.removeEventListener('pointermove', onMove);

      window.removeEventListener('pointerup', onUp);

    };

  }, [updateFromClientX]);



  return (

    <div className={cn('jmw-compare', className)}>

      <div className="jmw-compare__toolbar">

        <p className="jmw-compare__hint">Drag the handle — scroll to read the full CV at equal scale</p>

        <div className="jmw-compare__legend" aria-hidden>

          <span><i className="jmw-compare__legend-swatch jmw-compare__legend-swatch--added" /> Added</span>
          <span><i className="jmw-compare__legend-swatch jmw-compare__legend-swatch--removed" /> Removed</span>

        </div>

      </div>



      <div className="jmw-compare__scroll" ref={scrollRef}>

        <div

          className="jmw-compare__stage"

          ref={stageRef}

          style={{ height: stageHeight > 0 ? stageHeight : undefined }}

        >

          <div

            className="jmw-compare__layer jmw-compare__layer--after"

            style={{ minHeight: stageHeight > 0 ? stageHeight : undefined }}

          >

            <ScaledResumePage

              resume={afterResume}

              templateId={templateId}

              innerClassName="jmw-compare__after-doc"

              onMount={handleAfterMount}

              onLayout={onAfterLayout}

              minContainerHeight={stageHeight}

            />

            <span className="jmw-compare__badge jmw-compare__badge--after">After</span>

          </div>



          <div

            className="jmw-compare__layer jmw-compare__layer--before"

            ref={beforeClipRef}

            style={{

              width: `${position}%`,

              minHeight: stageHeight > 0 ? stageHeight : undefined,

            }}

          >

            <div ref={beforeSizerRef} className="jmw-compare__before-sizer">

              <ScaledResumePage
                resume={beforeResume}
                templateId={templateId}
                innerClassName="jmw-compare__before-doc"
                onMount={handleBeforeMount}
                onLayout={onBeforeLayout}
                minContainerHeight={stageHeight}
              />

            </div>

            <span className="jmw-compare__badge jmw-compare__badge--before">Before</span>

          </div>



          <div

            className="jmw-compare__handle"

            ref={handleRef}

            style={{ left: `${position}%`, height: stageHeight > 0 ? stageHeight : '100%' }}

            role="slider"

            aria-label="Compare before and after"

            aria-valuemin={0}

            aria-valuemax={100}

            aria-valuenow={Math.round(position)}

            tabIndex={0}

            onPointerDown={(e) => {

              dragging.current = true;

              handleRef.current?.setPointerCapture(e.pointerId);

              updateFromClientX(e.clientX);

            }}

            onKeyDown={(e) => {

              if (e.key === 'ArrowLeft') commitPosition(positionRef.current - 2);

              if (e.key === 'ArrowRight') commitPosition(positionRef.current + 2);

              if (e.key === 'Home') commitPosition(0);

              if (e.key === 'End') commitPosition(100);

            }}

          >

            <div className="jmw-compare__handle-grip" aria-hidden>

              <GripVertical className="w-4 h-4" />

            </div>

          </div>

        </div>

      </div>

    </div>

  );

}

