/**
 * Stub — the legacy multi-provider DevKit panel has been retired. The new
 * OpenRouter and Groq DevKit panels (Task #7) replace it. Kept so the
 * existing DevTools navigation entry doesn't break the build until that
 * task lands.
 */

export function AIProviderPanel() {
  return (
    <div className="p-6 text-sm text-muted-foreground">
      <p className="mb-2 font-medium text-foreground">Legacy provider panel removed</p>
      <p>
        The multi-provider key manager has been replaced by the dedicated
        OpenRouter and Groq panels. They will appear here once the DevKit
        UI is reconnected.
      </p>
    </div>
  );
}

export default AIProviderPanel;
