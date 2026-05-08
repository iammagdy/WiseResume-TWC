import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Link2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { databases, DATABASE_ID, Query } from '@/lib/appwrite';
import { COLLECTIONS } from '@/lib/appwrite-collections';

interface ShortLinkDocument {
  target_url?: string;
  username?: string;
  link_id?: string;
}

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
        const result = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.short_links,
          [Query.equal('link_id', linkId), Query.limit(1)],
        );

        if (cancelled) return;

        if (result.documents.length === 0) {
          setNotFound(true);
          return;
        }

        const doc = result.documents[0] as unknown as ShortLinkDocument;

        // Security: only navigate to relative paths to prevent open redirects.
        if (doc.target_url && typeof doc.target_url === 'string' && doc.target_url.startsWith('/')) {
          // Always append ?ref=<linkId> so portfolio tracking can attribute the visit
          // to this short link (short_link_id is read from the query param on the portfolio page)
          const sep = doc.target_url.includes('?') ? '&' : '?';
          navigate(`${doc.target_url}${sep}ref=${encodeURIComponent(linkId)}`, { replace: true });
        } else if (doc.username) {
          // Legacy portfolio link fallback
          navigate(`/p/${doc.username}?ref=${linkId}`, { replace: true });
        } else {
          setNotFound(true);
        }
      } catch {
        if (!cancelled) setNotFound(true);
      }
    })();

    return () => {
      cancelled = true;
    };
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
