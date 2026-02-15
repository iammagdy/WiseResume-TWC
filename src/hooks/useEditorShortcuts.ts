import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface UseEditorShortcutsOptions {
  onSave: () => void;
  onExport?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  resumeId?: string | null;
}

export function useEditorShortcuts({ onSave, onExport, onUndo, onRedo, resumeId }: UseEditorShortcutsOptions) {
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      switch (e.key.toLowerCase()) {
        case 's':
          e.preventDefault();
          onSave();
          toast.success('Saved ✓', { duration: 1500 });
          break;
        case 'p':
          e.preventDefault();
          if (resumeId) navigate('/preview');
          break;
        case 'd':
          e.preventDefault();
          onExport?.();
          break;
        case 'z':
          e.preventDefault();
          if (e.shiftKey) {
            onRedo?.();
          } else {
            onUndo?.();
          }
          break;
        case 'y':
          e.preventDefault();
          onRedo?.();
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onSave, onExport, onUndo, onRedo, resumeId, navigate]);
}
