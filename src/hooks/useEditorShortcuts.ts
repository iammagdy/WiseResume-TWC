import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface UseEditorShortcutsOptions {
  onSave: () => void;
  onExport?: () => void;
  resumeId?: string | null;
}

export function useEditorShortcuts({ onSave, onExport, resumeId }: UseEditorShortcutsOptions) {
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
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onSave, onExport, resumeId, navigate]);
}
