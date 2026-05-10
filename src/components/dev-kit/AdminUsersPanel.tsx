import { useState, useEffect, useCallback } from 'react';
import { databases, DATABASE_ID, Query, ID } from '@/lib/appwrite';
import { COLLECTIONS } from '@/lib/appwrite-collections';
import { User, Shield, Trash2, Search, Zap, Crown, Loader2, FileText, ExternalLink, RefreshCw } from 'lucide-react';
import { ActAsDialog, type ActAsSession } from './ActAsDialog';
import { devKitAuthHeaders } from '@/lib/devkit/devKitAuth';
import { unwrapAdminResponse, formatEdgeError } from '@/lib/devkit/edgeResponse';
import { appwriteFunctions } from '@/lib/appwrite-functions';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export const AdminUsersPanel = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actAsSession, setActAsSession] = useState<ActAsSession | null>(null);
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null);
  
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch Profiles
      const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.profiles, [
        Query.orderDesc('$createdAt'),
        Query.limit(100)
      ]);
      
      const profiles = res.documents;
      
      // 2. Enrich with Subscriptions, Credits, and Resume Counts
      const enrichedUsers = await Promise.all(profiles.map(async (profile: any) => {
        try {
          const [subs, credits, resumes] = await Promise.all([
            databases.listDocuments(DATABASE_ID, COLLECTIONS.subscriptions, [Query.equal('user_id', profile.user_id), Query.limit(1)]),
            databases.listDocuments(DATABASE_ID, COLLECTIONS.ai_credits, [Query.equal('user_id', profile.user_id), Query.limit(1)]),
            databases.listDocuments(DATABASE_ID, COLLECTIONS.resumes, [Query.equal('user_id', profile.user_id), Query.limit(0)]) // Just get total
          ]);

          return {
            ...profile,
            plan: subs.documents[0]?.plan || 'free',
            credits: credits.documents[0]?.daily_limit || 0,
            resumeCount: resumes.total
          };
        } catch (err) {
          return { ...profile, plan: 'free', credits: 0, resumeCount: 0 };
        }
      }));

      setUsers(enrichedUsers);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleDeleteUser = async (profileId: string) => {
    if (!confirm('Delete this user profile? (Auth account remains)')) return;
    try {
      await databases.deleteDocument(DATABASE_ID, COLLECTIONS.profiles, profileId);
      toast.success('User profile removed');
      fetchUsers();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleUpdatePlan = async (userId: string, plan: string) => {
    try {
      const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.subscriptions, [Query.equal('user_id', userId)]);
      if (res.total > 0) {
        await databases.updateDocument(DATABASE_ID, COLLECTIONS.subscriptions, res.documents[0].$id, { plan });
      } else {
        await databases.createDocument(DATABASE_ID, COLLECTIONS.subscriptions, ID.unique(), { user_id: userId, plan });
      }
      toast.success(`Plan set to ${plan.toUpperCase()}`);
      fetchUsers(); // Refresh to show real plan
    } catch (e: any) { toast.error(e.message); }
  };

  const handleImpersonate = async (userId: string, email: string) => {
    setImpersonatingId(userId);
    try {
      const tuple = await appwriteFunctions.invoke('admin-impersonate', {
        headers: devKitAuthHeaders(),
        body: { action: 'claim', target_user_id: userId },
      });
      const session = unwrapAdminResponse<ActAsSession>(tuple, 'admin-impersonate');
      setActAsSession(session);
    } catch (err) {
      toast.error('Impersonation failed', {
        description: formatEdgeError(err, 'Failed to generate session link'),
      });
    } finally {
      setImpersonatingId(null);
    }
  };

  const filtered = users.filter(u => 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <p className="text-sm text-muted-foreground font-mono">Loading Real-Time User Data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ActAsDialog session={actAsSession} onClose={() => setActAsSession(null)} />
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search real users..." 
            className="pl-10 bg-white/5 border-white/10 rounded-2xl h-11" 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
          />
        </div>
        <Button onClick={fetchUsers} variant="outline" size="icon" className="rounded-xl border-white/10 bg-white/5">
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filtered.map(u => (
          <div key={u.$id} className="p-5 rounded-3xl bg-card border border-border hover:border-blue-500/30 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className={cn(
                "h-14 w-14 rounded-2xl flex items-center justify-center border",
                u.plan === 'premium' ? "bg-amber-500/10 border-amber-500/20" : 
                u.plan === 'pro' ? "bg-blue-500/10 border-blue-500/20" : 
                "bg-white/5 border-white/10"
              )}>
                {u.plan === 'premium' ? <Crown className="text-amber-400" size={24} /> : 
                 u.plan === 'pro' ? <Shield className="text-blue-400" size={24} /> : 
                 <User size={24} className="text-white/40" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-white text-lg">{u.full_name || 'Anonymous'}</p>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter",
                    u.plan === 'premium' ? "bg-amber-500 text-black" : 
                    u.plan === 'pro' ? "bg-blue-500 text-white" : 
                    "bg-white/10 text-white/50"
                  )}>
                    {u.plan}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">{u.user_id}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-blue-400/70 flex items-center gap-1">
                    <FileText size={12} /> {u.resumeCount} Resumes
                  </span>
                  <span className="text-xs text-yellow-400/70 flex items-center gap-1">
                    <Zap size={12} /> {u.credits} Credits
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
               <div className="flex bg-white/5 rounded-2xl p-1 border border-white/10">
                  {['free', 'pro', 'premium'].map((p) => (
                    <button 
                      key={p}
                      onClick={() => handleUpdatePlan(u.user_id, p)} 
                      className={cn(
                        "px-4 py-2 text-[10px] uppercase font-black rounded-xl transition-all",
                        u.plan === p ? "bg-white text-black shadow-xl" : "text-white/40 hover:text-white hover:bg-white/5"
                      )}
                    >
                      {p}
                    </button>
                  ))}
               </div>

               <div className="flex gap-2">
                 <Button 
                   size="sm" 
                   variant="outline" 
                   className="rounded-2xl border-white/10 bg-white/5 h-10 px-4 hover:bg-blue-500 hover:text-white transition-all"
                   onClick={() => handleImpersonate(u.user_id, u.email)}
                   disabled={impersonatingId === u.user_id}
                 >
                   {impersonatingId === u.user_id ? <Loader2 size={14} className="animate-spin mr-2"/> : <ExternalLink size={14} className="mr-2"/>}
                   Act As
                 </Button>
                 <Button 
                   size="sm" 
                   variant="destructive" 
                   className="rounded-2xl h-10 w-10 p-0"
                   onClick={() => handleDeleteUser(u.$id)}
                 >
                   <Trash2 size={16}/>
                 </Button>
               </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

import { RefreshCw } from 'lucide-react';
