import { useState, useEffect } from 'react';
import { databases, DATABASE_ID, Query } from '@/lib/appwrite';
import { Database, Search, FileJson, Clock, Eye, Layout, User } from 'lucide-react';

export const DatabaseXRay = () => {
  const [resumes, setResumes] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchResumes = async () => {
    try {
      const res = await databases.listDocuments(DATABASE_ID, 'resumes', [Query.limit(20), Query.orderDesc('$createdAt')]);
      setResumes(res.documents);
    } catch (e) {}
  };

  useEffect(() => { fetchResumes(); }, []);

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1">
             <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
             <Input placeholder="Search database documents..." className="pl-10 bg-white/5 border-white/10 rounded-2xl" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {resumes.map(r => (
            <div key={r.$id} className="p-5 rounded-3xl bg-card border border-border flex flex-col gap-4">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                     <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400"><Layout size={16}/></div>
                     <h4 className="font-bold text-white truncate max-w-[150px]">{r.title}</h4>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground bg-white/5 px-2 py-1 rounded-full">{r.$id.slice(-6)}</span>
               </div>
               
               <div className="flex items-center gap-6 text-[10px] uppercase font-black text-muted-foreground tracking-tighter">
                  <span className="flex items-center gap-1"><User size={12}/> {r.user_id.slice(0, 8)}...</span>
                  <span className="flex items-center gap-1"><Clock size={12}/> {new Date(r.$createdAt).toLocaleDateString()}</span>
               </div>

               <div className="p-4 rounded-xl bg-[#05050a] border border-white/5 font-mono text-[10px] text-emerald-400/70 overflow-hidden h-24">
                  {JSON.stringify(r).slice(0, 300)}...
               </div>
            </div>
          ))}
       </div>
    </div>
  );
};

function Input({ ...props }: any) {
  return <input {...props} className={`w-full h-10 px-4 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-blue-500/50 transition-all ${props.className}`} />;
}
