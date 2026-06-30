import { useNavigate } from 'react-router-dom';
import { Bell, Briefcase, Settings, Trash2, CheckCheck } from 'lucide-react';
import { BackButton } from '@/components/ui/BackButton';
import { motion, AnimatePresence } from 'framer-motion';
import { isToday, isYesterday, isThisWeek, format } from 'date-fns';
import { safeFormatDistanceToNow } from '@/lib/dateUtils';
import { Button } from '@/components/ui/button';
import { useNotifications, useNotificationMutations, Notification } from '@/hooks/useNotifications';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect } from 'react';
import { client } from '@/lib/appwrite';
import { useQueryClient } from '@tanstack/react-query';
import { useLocale } from '@/i18n/LocaleProvider';
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
  const { t } = useLocale();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: notifications = [] } = useNotifications();
  const { markAsRead, markAllAsRead, clearAll } = useNotificationMutations();
  const [filter, setFilter] = useState<FilterTab>('all');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Realtime subscription for notifications via Appwrite Realtime
  useEffect(() => {
    if (!user) return;
    const unsubscribe = client.subscribe(
      'databases.main.collections.notifications.documents',
      () => { queryClient.invalidateQueries({ queryKey: ['notifications'] }); },
    );
    return () => { unsubscribe(); };
  }, [user, queryClient]);

  const filtered = notifications.filter(n => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.is_read;
    if (filter === 'applications') return n.type === 'application';
    return n.type === 'system';
  }).sort((a, b) => new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime());

  const handleClick = (n: Notification) => {
    if (!n.is_read) markAsRead.mutate(n.$id);
    if (n.link) navigate(n.link);
  };

  const TABS: { key: FilterTab; label: string }[] = [
    { key: 'all', label: t('app.notificationsPage.tabs.all', 'الكل') },
    { key: 'unread', label: t('app.notificationsPage.tabs.unread', 'غير المقروءة') },
    { key: 'applications', label: t('app.notificationsPage.tabs.applications', 'الطلبات') },
    { key: 'system', label: t('app.notificationsPage.tabs.system', 'النظام') },
  ];

  return (
    <div className="flex-1 min-h-0 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <header className="lg:hidden shrink-0 sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <BackButton />
          <Bell className="w-5 h-5 text-primary" />
          <h1 className="text-page-title flex-1">{t('app.notificationsPage.title', 'الإشعارات')}</h1>
          <div className="flex items-center gap-1">
            {notifications.some(n => !n.is_read) && (
              <Button variant="ghost" size="sm" onClick={() => markAllAsRead.mutate(undefined, { onSuccess: () => toast.success(t('app.notificationsPage.toasts.markedRead', 'تم تعليم كل الإشعارات كمقروءة')) })} className="gap-1 text-xs">
                <CheckCheck className="w-3.5 h-3.5" /> {t('app.notificationsPage.actions.readAll', 'قراءة الكل')}
              </Button>
            )}
            {notifications.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setShowClearConfirm(true)} className="text-destructive gap-1 text-xs">
                <Trash2 className="w-3.5 h-3.5" /> {t('app.notificationsPage.actions.clear', 'مسح')}
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Filter Tabs */}
      <div className="shrink-0 px-4 pt-3 pb-1 flex gap-2 lg:max-w-none mx-auto w-full">
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
      <div className="flex-1 overflow-y-auto overscroll-y-contain px-4 mt-2 pb-6 space-y-2 lg:max-w-none mx-auto w-full">
        <AnimatePresence>
          {filtered.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Bell className="w-12 h-12 mb-3 opacity-30" />
              <p className="font-medium">{t('app.notificationsPage.empty.title', 'لا توجد إشعارات بعد')}</p>
              <p className="text-sm mt-1">{t('app.notificationsPage.empty.description', 'أنت مطّلع على كل شيء حالياً!')}</p>
            </motion.div>
          ) : (
            (() => {
              const groups: { label: string; items: typeof filtered }[] = [];
              filtered.forEach(n => {
                const d = new Date(n.$createdAt);
                let label = format(d, 'MMMM d, yyyy');
                if (isToday(d)) label = t('app.notificationsPage.groups.today', 'اليوم');
                else if (isYesterday(d)) label = t('app.notificationsPage.groups.yesterday', 'أمس');
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
                        key={n.$id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        onClick={() => handleClick(n)}
                        className={`bg-card border shadow-soft-sm rounded-xl p-4 flex items-start gap-3 cursor-pointer transition-colors ${
                          !n.is_read ? 'border-primary/40 bg-primary/5' : 'border-border opacity-70'
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
                            {safeFormatDistanceToNow(n.$createdAt, { addSuffix: true }, t('app.notificationsPage.groups.recently', 'قبل قليل'))}
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
            <AlertDialogTitle>{t('app.notificationsPage.clearDialog.title', 'مسح كل الإشعارات؟')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('app.notificationsPage.clearDialog.description', 'سيؤدي هذا إلى حذف كل إشعاراتك نهائياً. لا يمكن التراجع عن هذا الإجراء.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel', 'إلغاء')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => clearAll.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('app.notificationsPage.clearDialog.confirm', 'مسح الكل')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
