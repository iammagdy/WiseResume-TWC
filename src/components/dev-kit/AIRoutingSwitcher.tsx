import { useState, useEffect } from 'react';
import { databases, DATABASE_ID, Query, ID } from '@/lib/appwrite';
import { COLLECTIONS } from '@/lib/appwrite-collections';
import { BrainCircuit, Save, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const FEATURES = [
  { id: 'generate-cover-letter', label: 'Cover Letter Generation' },
  { id: 'tailor-resume', label: 'Resume Tailoring' },
  { id: 'agentic-chat', label: 'AI Chat (Assistant)' },
  { id: 'analyze-resume', label: 'Resume Analysis' },
  { id: 'parse-resume', label: 'Resume Parsing' },
  { id: 'suggest-template', label: 'Template Suggestions' },
];

const PROVIDERS = [
  { id: 'nvidia', label: 'NVIDIA (High Quality)', models: ['nvidia/llama-3.1-nemotron-70b-instruct'] },
  { id: 'groq', label: 'Groq (Ultra Fast)', models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'] },
  { id: 'deepseek', label: 'DeepSeek (Reasoning)', models: ['deepseek-chat'] },
  { id: 'openrouter', label: 'OpenRouter (Flexible)', models: ['meta-llama/llama-3.3-70b-instruct:free'] },
];

export const AIRoutingSwitcher = () => {
  const [routes, setRoutes] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchRoutes = async () => {
    setLoading(true);
    try {
      const res = await databases.listDocuments(DATABASE_ID, 'ai_routing_config');
      const configMap: Record<string, any> = {};
      res.documents.forEach((doc: any) => {
        configMap[doc.feature_id] = doc;
      });
      setRoutes(configMap);
    } catch (err) {
      console.error('Failed to fetch AI routes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRoutes(); }, []);

  const handleUpdateRoute = (featureId: string, provider: string, model: string) => {
    setRoutes(prev => ({
      ...prev,
      [featureId]: { ...prev[featureId], provider, model, feature_id: featureId }
    }));
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      await Promise.all(Object.entries(routes).map(async ([featureId, config]: [string, any]) => {
        if (config.$id) {
          await databases.updateDocument(DATABASE_ID, 'ai_routing_config', config.$id, {
            provider: config.provider,
            model: config.model
          });
        } else {
          await databases.createDocument(DATABASE_ID, 'ai_routing_config', ID.unique(), {
            feature_id: featureId,
            provider: config.provider,
            model: config.model
          });
        }
      }));
      toast.success('AI Routing updated globally!');
      fetchRoutes();
    } catch (err: any) {
      toast.error('Failed to save routes: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="py-20 text-center animate-pulse text-muted-foreground font-mono">Fetching AI Global Config...</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20">
            <BrainCircuit className="text-purple-400" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">AI Global Routing</h2>
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-mono">Master Override Console</p>
          </div>
        </div>
        <Button onClick={saveAll} disabled={saving} className="bg-purple-600 hover:bg-purple-500 text-white rounded-2xl h-12 px-8 font-bold shadow-lg shadow-purple-500/20">
          {saving ? <RefreshCw className="animate-spin mr-2" size={18}/> : <Save className="mr-2" size={18}/>}
          Save All Changes
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {FEATURES.map(feature => {
          const current = routes[feature.id] || { provider: 'nvidia', model: 'default' };
          return (
            <div key={feature.id} className="p-6 rounded-3xl bg-card border border-border flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:border-purple-500/30 transition-all">
              <div className="space-y-1">
                <p className="font-bold text-white text-lg">{feature.label}</p>
                <p className="text-xs text-muted-foreground font-mono uppercase">{feature.id}</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex bg-white/5 rounded-2xl p-1 border border-white/10">
                  {PROVIDERS.map(p => (
                    <button
                      key={p.id}
                      onClick={() => handleUpdateRoute(feature.id, p.id, p.models[0])}
                      className={cn(
                        "px-4 py-2 text-[10px] uppercase font-black rounded-xl transition-all",
                        current.provider === p.id ? "bg-purple-600 text-white shadow-lg" : "text-white/40 hover:text-white"
                      )}
                    >
                      {p.id}
                    </button>
                  ))}
                </div>
                
                <div className="px-4 py-2 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-mono text-purple-400 uppercase">
                  {current.model}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-6 rounded-3xl bg-amber-500/5 border border-amber-500/20 flex items-start gap-4">
        <AlertTriangle className="text-amber-500 shrink-0" size={20} />
        <p className="text-xs text-amber-500/80 leading-relaxed">
          <strong>Caution:</strong> Changing these routes will immediately affect all users. Ensure the selected provider has active API keys in the Appwrite environment variables before switching.
        </p>
      </div>
    </div>
  );
};
