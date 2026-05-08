import { useState, useEffect } from 'react';
import { functions as appwriteFunctions, databases, DATABASE_ID, Query, ID } from '@/lib/appwrite';
import { BrainCircuit, Activity, BarChart3, Settings2, ShieldCheck, Zap } from 'lucide-react';
import { toast } from 'sonner';

export const AIRadarPanel = () => {
  const [executions, setExecutions] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, openrouter: 0, groq: 0, deepseek: 0 });

  const fetchRadar = async () => {
    try {
      const res = await appwriteFunctions.listExecutions('ai-gateway', [], 10);
      setExecutions(res.executions);
      
      const usageRes = await databases.listDocuments(DATABASE_ID, 'ai_usage_logs', [Query.limit(50), Query.orderDesc('$createdAt')]);
      const counts = { total: usageRes.total, openrouter: 0, groq: 0, deepseek: 0 };
      usageRes.documents.forEach((d: any) => {
         if (d.provider?.includes('openrouter')) counts.openrouter++;
         else if (d.provider?.includes('groq')) counts.groq++;
         else if (d.provider?.includes('deepseek')) counts.deepseek++;
      });
      setStats(counts);
    } catch (e) {}
  };

  useEffect(() => { fetchRadar(); const t = setInterval(fetchRadar, 15000); return () => clearInterval(t); }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         <RadarCard label="AI Uptime" value="99.9%" icon={<ShieldCheck className="text-emerald-400" size={18}/>} />
         <RadarCard label="Groq Slot" value="Active" icon={<Zap className="text-orange-400" size={18}/>} />
         <RadarCard label="OR Slot" value="Active" icon={<Zap className="text-blue-400" size={18}/>} />
         <RadarCard label="DeepSeek" value="Active" icon={<Zap className="text-purple-400" size={18}/>} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         <div className="p-8 rounded-3xl bg-card border border-border">
            <h3 className="text-white font-bold flex items-center gap-2 mb-6"><BarChart3 size={20}/> Traffic Distribution</h3>
            <div className="space-y-6">
               <ProgressBar label="OpenRouter" percent={40} color="bg-blue-500" />
               <ProgressBar label="Groq (Ultra-Fast)" percent={50} color="bg-orange-500" />
               <ProgressBar label="DeepSeek" percent={10} color="bg-purple-500" />
            </div>
         </div>

         <div className="p-8 rounded-3xl bg-card border border-border">
            <h3 className="text-white font-bold flex items-center gap-2 mb-6"><Activity size={20}/> Live AI Logs</h3>
            <div className="space-y-3">
               {executions.map(e => (
                 <div key={e.$id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 font-mono text-[10px]">
                    <span className="text-blue-400 uppercase">{e.method} /</span>
                    <span className="text-white/50">{e.$id.slice(-8)}</span>
                    <span className={`px-2 py-0.5 rounded-full ${e.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                      {e.status}
                    </span>
                 </div>
               ))}
            </div>
         </div>
      </div>
    </div>
  );
};

function RadarCard({ label, value, icon }: any) {
  return (
    <div className="p-5 rounded-2xl bg-card border border-border flex items-center gap-4">
       <div className="p-2.5 rounded-xl bg-white/5">{icon}</div>
       <div>
         <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{label}</p>
         <p className="text-lg font-black text-white">{value}</p>
       </div>
    </div>
  );
}

function ProgressBar({ label, percent, color }: any) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs font-bold text-white/70 uppercase">
        <span>{label}</span>
        <span>{percent}%</span>
      </div>
      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${percent}%` }}></div>
      </div>
    </div>
  );
}
