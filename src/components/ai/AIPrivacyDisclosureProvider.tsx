import { useState, useCallback, useEffect, createContext, useContext, useRef } from 'react';
import { AIPrivacyDisclosure } from './AIPrivacyDisclosure';
import { useSettingsStore } from '@/store/settingsStore';

function getProviderDisplayName(provider: string): string {
  switch (provider) {
    case 'wiseresume': return 'Wise AI (OpenRouter / Groq)';
    case 'openai': return 'OpenAI';
    case 'anthropic': return 'Anthropic (Claude)';
    case 'gemini': return 'Google Gemini';
    case 'groq': return 'Groq';
    case 'mistral': return 'Mistral AI';
    case 'xai': return 'xAI (Grok)';
    case 'cohere': return 'Cohere';
    case 'openrouter': return 'OpenRouter';
    case 'ollama': return 'Ollama (local)';
    default: return provider;
  }
}

type ResolverFn = (accepted: boolean) => void;

interface DisclosureContextValue {
  requestDisclosure: () => Promise<boolean>;
}

const DisclosureContext = createContext<DisclosureContextValue | null>(null);

export function AIPrivacyDisclosureProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const resolverRef = useRef<ResolverFn | null>(null);
  const aiProvider = useSettingsStore(s => s.aiProvider);

  const requestDisclosure = useCallback((): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setOpen(true);
    });
  }, []);

  const handleAccept = useCallback(() => {
    setOpen(false);
    resolverRef.current?.(true);
    resolverRef.current = null;
  }, []);

  const handleDismiss = useCallback(() => {
    setOpen(false);
    resolverRef.current?.(false);
    resolverRef.current = null;
  }, []);

  return (
    <DisclosureContext.Provider value={{ requestDisclosure }}>
      {children}
      <AIPrivacyDisclosure
        open={open}
        providerName={getProviderDisplayName(aiProvider)}
        onAccept={handleAccept}
        onDismiss={handleDismiss}
      />
    </DisclosureContext.Provider>
  );
}

export function useAIPrivacyDisclosure(): DisclosureContextValue {
  const ctx = useContext(DisclosureContext);
  if (!ctx) throw new Error('useAIPrivacyDisclosure must be used within AIPrivacyDisclosureProvider');
  return ctx;
}
