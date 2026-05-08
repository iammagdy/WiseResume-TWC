import { useState, useEffect } from 'react';
import { databases, DATABASE_ID, Query } from '@/lib/appwrite';
import { Briefcase, Mail, CheckCircle2, UserPlus, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export const WiseHireWaitlistPanel = () => {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWaitlist = async () => {
    try {
      const res = await databases.listDocuments(DATABASE_ID, 'wisehire_waitlist', [
        Query.orderDesc('$createdAt')
      ]);
      setEntries(res.documents);
    } catch (e) {} finally { setLoading(false); }
  };

  useEffect(() => { fetchWaitlist(); }, []);

  const handleApprove = async (id: string) => {
    toast.success('User invited to WiseHire!');
    // Logical placeholder for sending email and marking as invited
  };

  return (
    <div className="space-y-4">
      {entries.map(e => (
        <div key={e.$id} className="p-6 rounded-3xl bg-card border border-border flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400"><Briefcase size={22}/></div>
            <div>
              <p className="font-black text-lg text-white tracking-tight">{e.name}</p>
              <p className="text-sm text-blue-400/60 font-medium">{e.email} • {e.company_name}</p>
              <div className="flex items-center gap-2 mt-2 text-[10px] uppercase font-bold text-muted-foreground">
                 <Clock size={12}/> Request Date: {new Date(e.$createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>
          <Button onClick={() => handleApprove(e.$id)} className="rounded-2xl h-10 px-6 bg-white text-black hover:bg-white/90 font-bold uppercase italic">
             <UserPlus size={16} className="mr-2"/> Grant Access
          </Button>
        </div>
      ))}
      {!loading && entries.length === 0 && (
         <div className="p-12 text-center text-muted-foreground border border-dashed border-border rounded-3xl uppercase font-black italic tracking-widest opacity-20">
           Waitlist Empty
         </div>
      )}
    </div>
  );
};
