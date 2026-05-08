import { useState, useCallback, useEffect } from 'react';
import { RefreshCw, Users, FileText, Zap, Globe, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { databases, DATABASE_ID, client as appwriteClient } from '@/lib/appwrite';
import { DevKitErrorCard } from './DevKitErrorCard';

interface OverviewStats {
  totalUsers: number;
  totalResumes: number;
  totalCollections: number;
  region: string;
  latency: number;
  lastUpdate: Date;
}

export const OverviewPanel = () => {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    const start = Date.now();
    try {
      const [users, resumes] = await Promise.all([
        databases.listDocuments(DATABASE_ID, 'profiles'),
        databases.listDocuments(DATABASE_ID, 'resumes')
      ]);

      setStats({
        totalUsers: users.total,
        totalResumes: resumes.total,
        totalCollections: 99,
        region: 'Appwrite Cloud',
        latency: Date.now() - start,
        lastUpdate: new Date()
      });
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (error) return <DevKitErrorCard message={error} onRetry={fetchStats} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
           <Globe size={20} className="text-blue-400" /> Appwrite Infrastructure Status
        </h2>
        <Button size="sm" variant="outline" onClick={fetchStats} disabled={loading}>
          {loading ? <RefreshCw className="animate-spin mr-2" size={14}/> : <RefreshCw size={14} className="mr-2"/>} 
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={<Users size={20}/>} label="Active Users" value={stats?.totalUsers || 0} sub="Email Verified" />
        <StatCard icon={<FileText size={20}/>} label="Total Resumes" value={stats?.totalResumes || 0} sub="All Versions" />
        <StatCard icon={<ShieldCheck size={20}/>} label="Region" value={stats?.region || '---'} subText={`Latency: ${stats?.latency}ms`} />
      </div>

      <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10">
        <p className="text-xs text-blue-400 font-mono">
          [System Note]: Project is 100% Appwrite-Native. Supabase references have been decommissioned.
        </p>
      </div>
    </div>
  );
};

function StatCard({ icon, label, value, sub, subText }: any) {
  return (
    <div className="p-5 rounded-2xl bg-card border border-border shadow-sm">
      <div className="flex items-center gap-3 text-muted-foreground mb-3">
        {icon} <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{sub || subText}</div>
    </div>
  );
}
