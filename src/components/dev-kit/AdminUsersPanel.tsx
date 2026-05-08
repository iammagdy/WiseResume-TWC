import { useState, useEffect } from 'react';
import { databases, DATABASE_ID, Query, ID } from '@/lib/appwrite';
import { User, Shield, Trash2, Search, Zap, Crown, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export const AdminUsersPanel = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await databases.listDocuments(DATABASE_ID, 'profiles', [
        Query.orderDesc('$createdAt'),
        Query.limit(50)
      ]);
      setUsers(res.documents);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleUpdateCredits = async (userId: string, amount: number) => {
    try {
      const res = await databases.listDocuments(DATABASE_ID, 'ai_credits', [Query.equal('user_id', userId)]);
      if (res.total > 0) {
        await databases.updateDocument(DATABASE_ID, 'ai_credits', res.documents[0].$id, { daily_limit: amount });
      } else {
        await databases.createDocument(DATABASE_ID, 'ai_credits', ID.unique(), { user_id: userId, daily_limit: amount, daily_usage: 0 });
      }
      toast.success('Credits updated successfully!');
    } catch (e: any) { toast.error(e.message); }
  };

  const handleUpdatePlan = async (userId: string, plan: string) => {
    try {
      const res = await databases.listDocuments(DATABASE_ID, 'subscriptions', [Query.equal('user_id', userId)]);
      if (res.total > 0) {
        await databases.updateDocument(DATABASE_ID, 'subscriptions', res.documents[0].$id, { plan });
      } else {
        await databases.createDocument(DATABASE_ID, 'subscriptions', ID.unique(), { user_id: userId, plan });
      }
      toast.success(`Plan changed to ${plan.toUpperCase()}`);
    } catch (e: any) { toast.error(e.message); }
  };

  const filtered = users.filter(u => 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search users..." className="pl-10 bg-white/5 border-white/10 rounded-2xl" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filtered.map(u => (
          <div key={u.$id} className="p-5 rounded-3xl bg-card border border-border hover:border-blue-500/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                <User size={20} className="text-blue-400" />
              </div>
              <div>
                <p className="font-bold text-white text-lg">{u.full_name || 'Anonymous'}</p>
                <p className="text-xs text-muted-foreground font-mono">{u.user_id}</p>
                <p className="text-sm text-blue-400/70">{u.email}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
               <div className="flex bg-muted/40 rounded-xl p-1 border border-border">
                  <button onClick={() => handleUpdatePlan(u.user_id, 'free')} className="px-3 py-1.5 text-[10px] uppercase font-bold rounded-lg hover:bg-white/5 transition-colors">Free</button>
                  <button onClick={() => handleUpdatePlan(u.user_id, 'pro')} className="px-3 py-1.5 text-[10px] uppercase font-bold rounded-lg bg-blue-600 text-white shadow-lg">Pro</button>
                  <button onClick={() => handleUpdatePlan(u.user_id, 'premium')} className="px-3 py-1.5 text-[10px] uppercase font-bold rounded-lg hover:bg-white/5 transition-colors">Premium</button>
               </div>

               <div className="flex gap-2">
                 <Button size="sm" variant="outline" className="rounded-xl border-white/5 bg-white/5 h-9" onClick={() => handleUpdateCredits(u.user_id, 100)}>
                   <Zap size={14} className="mr-2 text-yellow-400"/> +100 Credits
                 </Button>
                 <Button size="sm" variant="destructive" className="rounded-xl h-9">
                   <Trash2 size={14}/>
                 </Button>
               </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
