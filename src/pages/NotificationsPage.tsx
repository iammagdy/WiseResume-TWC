import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Briefcase, Settings, Trash2, CheckCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useNotifications, useNotificationMutations, Notification } from '@/hooks/useNotifications';
import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/safeClient';
import { useQueryClient } from '@tanstack/react-query';

type FilterTab = 'all' | 'unread' | 'applications' | 'system';

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: notifications = [] } = useNotifications();
  const { markAsRead, markAllAsRead, clearAll } = useNotificationMutations();
  const [filter, setFilter] = useState<FilterTab>('all');

  // Realtime subscription for notifications
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('notifications-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  const filtered = notifications.filter(n => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.is_read;
    if (filter === 'applications') return n.type === 'application';
    return n.type === 'system';
  });

  const handleClick = (n: Notification) => {
    if (!n.is_read) markAsRead.mutate(n.id);
    if (n.link) navigate(n.link);
  };

  const TABS: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'unread', label: 'Unread' },
    { key: 'applications', label: 'Applications' },
    { key: 'system', label: 'System' },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 overflow-y-auto overscroll-y-contain pb-6">
      {/* Header */}
      <div className="sticky top-0 z-10 glass-card border-b border-border/50 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/dashboard')} className="p-2 -ml-2 rounded-xl hover:bg-muted/50 min-h-[44px] min-w-[44px] flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold flex-1">Notifications</h1>
        <div className="flex items-center gap-1">
          {notifications.some(n => !n.is_read) && (
            <Button variant="ghost" size="sm" onClick={() => markAllAsRead.mutate()} className="gap-1 text-xs">
              <CheckCheck className="w-3.5 h-3.5" /> Read all
            </Button>
          )}
          {notifications.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => clearAll.mutate()} className="text-destructive gap-1 text-xs">
              <Trash2 className="w-3.5 h-3.5" /> Clear
            </Button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 pt-3 pb-1 flex gap-2">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === t.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="px-4 mt-2 space-y-2">
        <AnimatePresence>
          {filtered.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Bell className="w-12 h-12 mb-3 opacity-30" />
              <p className="font-medium">No notifications yet</p>
              <p className="text-sm mt-1">You're all caught up!</p>
            </motion.div>
          ) : (
            filtered.map(n => (
              <motion.div
                key={n.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                onClick={() => handleClick(n)}
                className={`glass-card rounded-xl p-4 flex items-start gap-3 cursor-pointer transition-colors ${
                  !n.is_read ? 'border-l-2 border-l-primary' : 'opacity-70'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  n.type === 'application' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                }`}>
                  {n.type === 'application' ? <Briefcase className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </p>
                </div>
                {!n.is_read && <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />}
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
