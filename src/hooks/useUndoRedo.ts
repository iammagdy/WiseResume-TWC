import { useState, useEffect, useRef, useCallback } from 'react';
import type { ResumeData } from '@/types/resume';

interface UndoEntry {
  snapshot: ResumeData;
  description: string;
}

function describeChange(prev: ResumeData, next: ResumeData): string {
  // Skills
  const addedSkills = next.skills.filter(s => !prev.skills.includes(s));
  const removedSkills = prev.skills.filter(s => !next.skills.includes(s));
  if (addedSkills.length) return `Added skill '${addedSkills[0]}'`;
  if (removedSkills.length) return `Removed skill '${removedSkills[0]}'`;

  // Summary
  if (prev.summary !== next.summary) {
    const diff = Math.abs((next.summary?.length || 0) - (prev.summary?.length || 0));
    return `Updated summary (${diff} chars changed)`;
  }

  // Contact
  if (JSON.stringify(prev.contactInfo) !== JSON.stringify(next.contactInfo)) return 'Updated contact info';

  // Experience
  if (prev.experience.length !== next.experience.length) {
    return next.experience.length > prev.experience.length ? 'Added work experience' : 'Removed work experience';
  }
  if (JSON.stringify(prev.experience) !== JSON.stringify(next.experience)) {
    const changed = next.experience.find((e, i) => JSON.stringify(e) !== JSON.stringify(prev.experience[i]));
    return changed ? `Updated experience at ${changed.company || 'company'}` : 'Updated experience';
  }

  // Education
  if (prev.education.length !== next.education.length) return 'Updated education';
  if (JSON.stringify(prev.education) !== JSON.stringify(next.education)) return 'Updated education';

  // Certifications
  if (JSON.stringify(prev.certifications) !== JSON.stringify(next.certifications)) return 'Updated certifications';

  // Template
  if (prev.templateId !== next.templateId) return `Changed template to ${next.templateId}`;

  return 'Updated resume';
}

const MAX_HISTORY = 50;

export function useUndoRedo(currentResume: ResumeData | null) {
  const [history, setHistory] = useState<UndoEntry[]>([]);
  const [pointer, setPointer] = useState(-1);
  // Keep pointer in a ref too so the snapshot effect doesn't re-register
  // every time pointer state changes (which caused a double JSON.stringify per undo/redo)
  const pointerRef = useRef(-1);
  const isUndoRedoRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const lastSnapshotRef = useRef<string>('');

  // Record changes with debounce — depends only on currentResume, NOT on pointer state
  useEffect(() => {
    if (!currentResume || isUndoRedoRef.current) {
      isUndoRedoRef.current = false;
      return;
    }

    const json = JSON.stringify(currentResume);
    if (json === lastSnapshotRef.current) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const prevJson = lastSnapshotRef.current;
      lastSnapshotRef.current = json;

      setHistory(prev => {
        // If pointer is not at the end, discard redo stack
        const base = prev.slice(0, pointerRef.current + 1);

        let desc = 'Updated resume';
        if (prevJson && base.length > 0) {
          try {
            const prevResume = JSON.parse(prevJson) as ResumeData;
            desc = describeChange(prevResume, currentResume);
          } catch { /* ignore */ }
        } else if (base.length === 0) {
          desc = 'Initial state';
        }

        const newHistory = [...base, { snapshot: JSON.parse(json), description: desc }];
        if (newHistory.length > MAX_HISTORY) newHistory.shift();

        const newPointer = newHistory.length - 1;
        pointerRef.current = newPointer;
        setPointer(newPointer);
        return newHistory;
      });
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [currentResume]); // ← pointer removed: reads pointerRef.current instead

  const canUndo = pointer > 0;
  const canRedo = pointer < history.length - 1;

  const undoDescription = canUndo ? history[pointer]?.description : '';
  const redoDescription = canRedo ? history[pointer + 1]?.description : '';

  const undo = useCallback((): ResumeData | null => {
    if (!canUndo) return null;
    isUndoRedoRef.current = true;
    const newPointer = pointer - 1;
    pointerRef.current = newPointer;
    setPointer(newPointer);
    const entry = history[newPointer];
    lastSnapshotRef.current = JSON.stringify(entry.snapshot);
    return entry.snapshot;
  }, [canUndo, pointer, history]);

  const redo = useCallback((): ResumeData | null => {
    if (!canRedo) return null;
    isUndoRedoRef.current = true;
    const newPointer = pointer + 1;
    pointerRef.current = newPointer;
    setPointer(newPointer);
    const entry = history[newPointer];
    lastSnapshotRef.current = JSON.stringify(entry.snapshot);
    return entry.snapshot;
  }, [canRedo, pointer, history]);

  return { canUndo, canRedo, undoDescription, redoDescription, undo, redo };
}
