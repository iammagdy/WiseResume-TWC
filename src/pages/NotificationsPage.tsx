import { useNavigate } from 'react-router-dom';
import { Bell, Briefcase, Settings, Trash2, CheckCheck } from 'lucide-react';
import { BackButton } from '@/components/ui/BackButton';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow, isToday, isYesterday, isThisWeek, format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useNotifications, useNotificationMutations, Notification } from '@/hooks/useNotifications';
import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/safeClient';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type FilterTab = 'all' | 'unread' | 'applications' | 'system';


export default function NotificationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: notifications = [] } = useNotifications();
  const { markAsRead, markAllAsRead, clearAll } = useNotificationMutations();
  const [filter, setFilter] = useState<FilterTab>('all');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

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
    <div className="flex-1 min-h-0 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <header className="shrink-0 sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 pt-safe">
        <div className="flex items-center gap-3">
          <BackButton />
          <Bell className="w-5 h-5 text-primary" />
          <h1 className="text-page-title flex-1">Notifications</h1>
          <div className="flex items-center gap-1">
            {notifications.some(n => !n.is_read) && (
              <Button variant="ghost" size="sm" onClick={() => markAllAsRead.mutate()} className="gap-1 text-xs">
                <CheckCheck className="w-3.5 h-3.5" /> Read all
              </Button>
            )}
            {notifications.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setShowClearConfirm(true)} className="text-destructive gap-1 text-xs">
                <Trash2 className="w-3.5 h-3.5" /> Clear
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Filter Tabs */}
      <div className="shrink-0 px-4 pt-3 pb-1 flex gap-2">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors min-h-[44px] flex items-center ${
              filter === t.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto overscroll-y-contain px-4 mt-2 pb-6 space-y-2">
        <AnimatePresence>
          {filtered.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Bell className="w-12 h-12 mb-3 opacity-30" />
              <p className="font-medium">No notifications yet</p>
              <p className="text-sm mt-1">You're all caught up!</p>
            </motion.div>
          ) : (
            (() => {
              const groups: { label: string; items: typeof filtered }[] = [];
              filtered.forEach(n => {
                const d = new Date(n.created_at);
                let label = format(d, 'MMMM d, yyyy');
                if (isToday(d)) label = 'Today';
                else if (isYesterday(d)) label = 'Yesterday';
                else if (isThisWeek(d)) label = format(d, 'EEEE');
                const existing = groups.find(g => g.label === label);
                if (existing) existing.items.push(n);
                else groups.push({ label, items: [n] });
              });
              return groups.map(group => (
                <div key={group.label}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 pt-3 pb-2">{group.label}</p>
                  <div className="space-y-2">
                    {group.items.map(n => (
                      <motion.div
                        key={n.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        onClick={() => handleClick(n)}
                        className={`bg-card border border-border shadow-soft-sm rounded-xl p-4 flex items-start gap-3 cursor-pointer transition-colors ${
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
                    ))}
                  </div>
                </div>
              ));
            })()
          )}
        </AnimatePresence>
      </div>

      {/* Clear all confirmation */}
      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all notifications?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove all your notifications. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => clearAll.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
