import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Link2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ShortLinkPage() {
  const { linkId } = useParams<{ linkId: string }>();
  const navigate = useNavigate();
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!linkId) {
      setNotFound(true);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const { EDGE_FUNCTIONS_URL, EDGE_FUNCTIONS_ANON_KEY } = await import('@/lib/supabaseConstants');
        const res = await fetch(
          `${EDGE_FUNCTIONS_URL}/functions/v1/resolve-short-link?id=${encodeURIComponent(linkId)}`,
          {
            headers: {
              apikey: EDGE_FUNCTIONS_ANON_KEY,
              Authorization: `Bearer ${EDGE_FUNCTIONS_ANON_KEY}`,
            },
          }
        );

        if (cancelled) return;

        if (!res.ok) {
          setNotFound(true);
          return;
        }

        const result = await res.json();

        if (result?.target_url) {
          // Universal redirect via target_url (relative path)
          navigate(result.target_url, { replace: true });
        } else if (result?.username) {
          // Legacy portfolio link fallback
          navigate(`/p/${result.username}?ref=${linkId}`, { replace: true });
        } else {
          setNotFound(true);
        }
      } catch {
        if (!cancelled) setNotFound(true);
      }
    })();

    return () => { cancelled = true; };
  }, [linkId, navigate]);

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4 max-w-sm"
        >
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Link Not Found</h1>
          <p className="text-sm text-muted-foreground">
            This short link doesn't exist or may have been deleted.
          </p>
          <Button onClick={() => navigate('/')} className="rounded-xl h-11">
            Create Your Portfolio
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center gap-4"
      >
        <motion.div
          className="w-10 h-10 rounded-full border-2 border-muted border-t-primary"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
        />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link2 className="w-4 h-4" />
          Redirecting…
        </div>
      </motion.div>
    </div>
  );
}
