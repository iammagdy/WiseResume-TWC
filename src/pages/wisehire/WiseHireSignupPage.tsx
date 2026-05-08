import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function WiseHireSignupPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const inviteToken = searchParams.get('invite') ?? '';
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');

  useEffect(() => {
    if (isAuthenticated) navigate('/wisehire/dashboard');
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-800 rounded-2xl p-8 border border-slate-700">
        <h1 className="text-2xl font-bold text-white mb-6">WiseHire Signup</h1>
        <p className="text-slate-400 mb-8">Please use the regular sign-up flow for now. WiseHire is being migrated to our new engine.</p>
        <Button onClick={() => navigate('/auth?mode=signup')} className="w-full bg-blue-600">Go to Sign Up</Button>
      </div>
    </div>
  );
}
