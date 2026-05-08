import { useState, useEffect } from 'react';
import { databases, DATABASE_ID, Query, ID } from '@/lib/appwrite';
import { Ticket, Plus, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export const CouponsPanel = () => {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [newCode, setNewCode] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchCoupons = async () => {
    try {
      const res = await databases.listDocuments(DATABASE_ID, 'discount_codes');
      setCoupons(res.documents);
    } catch (e) {} finally { setLoading(false); }
  };

  useEffect(() => { fetchCoupons(); }, []);

  const handleAdd = async () => {
    if (!newCode) return;
    try {
      await databases.createDocument(DATABASE_ID, 'discount_codes', ID.unique(), {
        code: newCode.toUpperCase(),
        active: true,
        percent_off: 100 // Default for beta users
      });
      setNewCode('');
      fetchCoupons();
      toast.success('Coupon code generated!');
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-3xl bg-blue-500/5 border border-blue-500/10 flex items-center gap-4">
        <Input 
          placeholder="ENTER NEW CODE (e.g. BETA2026)" 
          className="bg-white/5 border-white/10 rounded-xl uppercase font-black tracking-widest"
          value={newCode}
          onChange={e => setNewCode(e.target.value)}
        />
        <Button onClick={handleAdd} className="rounded-xl h-11 px-8 bg-blue-600 hover:bg-blue-500 font-bold uppercase italic">
          <Plus size={18} className="mr-2"/> Generate
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {coupons.map(c => (
          <div key={c.$id} className="p-5 rounded-2xl bg-card border border-border flex items-center justify-between">
            <div className="flex items-center gap-4">
               <div className="p-2.5 bg-white/5 rounded-xl text-yellow-400"><Ticket size={20}/></div>
               <div>
                  <p className="font-black text-lg tracking-tighter text-white uppercase">{c.code}</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">{c.percent_off}% OFF • ACTIVE</p>
               </div>
            </div>
            <button className="p-2 hover:bg-red-500/10 rounded-lg text-red-400"><Trash2 size={16}/></button>
          </div>
        ))}
      </div>
    </div>
  );
};
