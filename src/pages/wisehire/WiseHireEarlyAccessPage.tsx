import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

export default function WiseHireEarlyAccessPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) navigate('/wisehire/dashboard');
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-800 rounded-2xl p-8 border border-slate-700">
        <h1 className="text-2xl font-bold text-white mb-6">Early Access</h1>
        <p className="text-slate-400 mb-8">Early access codes are now processed through our universal login engine.</p>
        <Button onClick={() => navigate('/auth?mode=signup')} className="w-full bg-blue-600">Proceed to Sign Up</Button>
      </div>
    </div>
  );
}
