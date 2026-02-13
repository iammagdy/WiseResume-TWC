import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Briefcase, Settings, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useJobApplications } from '@/hooks/useJobApplications';

interface LocalNotification {
  id: string;
  type: 'application' | 'system';
  message: string;
  timestamp: string;
  read: boolean;
}

const LS_KEY = 'wr-notifications';

function getStoredNotifications(): LocalNotification[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]');
  } catch { return []; }
}

function saveNotifications(n: LocalNotification[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(n));
}

type FilterTab = 'all' | 'applications' | 'system';

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: applications } = useJobApplications();
  const [notifications, setNotifications] = useState<LocalNotification[]>([]);
  const [filter, setFilter] = useState<FilterTab>('all');

  // Merge stored + computed reminders
  useEffect(() => {
    const stored = getStoredNotifications();
    const reminderNotifs: LocalNotification[] = [];

    if (applications) {
      const now = new Date();
      applications.forEach(app => {
        if (app.remind_at && new Date(app.remind_at) <= now) {
          const existingId = `reminder-${app.id}`;
          if (!stored.some(n => n.id === existingId)) {
            reminderNotifs.push({
              id: existingId,
              type: 'application',
              message: `Reminder: Follow up on "${app.job_title}" at ${app.company}`,
              timestamp: app.remind_at,
              read: false,
            });
          }
        }
      });
    }

    if (reminderNotifs.length > 0) {
      const merged = [...reminderNotifs, ...stored];
      saveNotifications(merged);
      setNotifications(merged);
    } else {
      setNotifications(stored);
    }
  }, [applications]);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
      saveNotifications(updated);
      return updated;
    });
  }, []);

  const clearAll = useCallback(() => {
    saveNotifications([]);
    setNotifications([]);
  }, []);

  const filtered = notifications.filter(n => {
    if (filter === 'all') return true;
    if (filter === 'applications') return n.type === 'application';
    return n.type === 'system';
  });

  const TABS: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
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
        {notifications.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearAll} className="text-destructive gap-1">
            <Trash2 className="w-4 h-4" /> Clear
          </Button>
        )}
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
                onClick={() => markAsRead(n.id)}
                className={`glass-card rounded-xl p-4 flex items-start gap-3 cursor-pointer transition-colors ${
                  !n.read ? 'border-l-2 border-l-primary' : 'opacity-70'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  n.type === 'application' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                }`}>
                  {n.type === 'application' ? <Briefcase className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(n.timestamp), { addSuffix: true })}
                  </p>
                </div>
                {!n.read && <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />}
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
