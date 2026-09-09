import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, CreditCard, Crown, Gem, Loader2, ShieldCheck } from 'lucide-react';
import { useLocale } from '@/i18n/LocaleProvider';
import { clearPlanAttemptKey, createBillingCheckoutSession, getDefaultCheckoutProvider, getOrCreatePlanAttemptKey, openServerCheckout, type BillingCheckoutPlan, type BillingCheckoutProvider } from '@/lib/billingCheckout';

export interface PaymentConfirmationModalProps { open: boolean; onOpenChange: (open: boolean) => void; plan: BillingCheckoutPlan; environment?: string; onSuccess?: () => void; }
const BASE_PLAN_PRICES: Record<BillingCheckoutPlan, number> = { pro: 5, premium: 10 };

export function PaymentConfirmationModal({ open, onOpenChange, plan, environment, onSuccess }: PaymentConfirmationModalProps) {
  const { locale } = useLocale();
  const [provider, setProvider] = useState<BillingCheckoutProvider>(getDefaultCheckoutProvider());
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isUltimate = plan === 'premium'; const planName = isUltimate ? 'Ultimate' : 'Pro'; const price = BASE_PLAN_PRICES[plan];
  const copy = locale === 'ar' ? {
    upgrade: `الترقية إلى ${isUltimate ? 'Ultimate' : 'Pro'}`,
    description: 'اشتراك شهري مع اختيار مزوّد الدفع.',
    fullAccess: 'وصول كامل', popular: 'الأكثر شيوعًا', monthly: 'اشتراك شهري متجدد',
    cancelAnytime: 'يمكنك الإلغاء في أي وقت؛ يستمر الوصول خلال الفترة المدفوعة.',
    chooseProvider: 'اختر مزوّد الدفع', primary: 'رئيسي', alternative: 'بديل',
    whopCopy: 'يمكن تطبيق أكواد الخصم بأمان أثناء الدفع عبر Whop.', paypalCopy: 'دفع شهري آمن عبر PayPal.',
    handledBy: 'تتم إدارة الفوترة الشهرية بواسطة', serverVerified: 'دفع تم التحقق منه عبر الخادم',
    connecting: 'جارٍ الاتصال بـ', continueWith: 'المتابعة عبر', cancel: 'إلغاء', unavailable: 'الدفع غير متاح مؤقتًا.',
  } : {
    upgrade: `Upgrade to ${planName}`, description: 'A monthly subscription with flexible provider choice.',
    fullAccess: 'Full access', popular: 'Popular', monthly: 'Monthly recurring subscription',
    cancelAnytime: 'Cancel anytime; access follows your paid period.', chooseProvider: 'Choose payment provider',
    primary: 'Primary', alternative: 'Alternative', whopCopy: 'Promo codes can be applied securely during Whop checkout.',
    paypalCopy: 'Secure recurring checkout through PayPal.', handledBy: 'Recurring billing handled by',
    serverVerified: 'Server-verified checkout', connecting: 'Connecting to', continueWith: 'Continue with', cancel: 'Cancel',
    unavailable: 'Checkout is temporarily unavailable.',
  };
  useEffect(() => { if (open) { setProvider(getDefaultCheckoutProvider()); setCheckoutError(null); setIsSubmitting(false); } }, [open]);

  const handleCheckout = async () => {
    setIsSubmitting(true); setCheckoutError(null);
    try {
      try { sessionStorage.setItem('billing_pending_plan', plan); } catch {}
      const result = await createBillingCheckoutSession(plan, { provider, idempotencyKey: getOrCreatePlanAttemptKey(plan), environment });
      if (!result.ok) { if (!result.retryable) clearPlanAttemptKey(plan); setCheckoutError(result.message); setIsSubmitting(false); return; }
      if (!openServerCheckout(result.session, environment)) { setCheckoutError('Checkout URL verification failed.'); setIsSubmitting(false); return; }
      onSuccess?.();
    } catch (error) { setCheckoutError(error instanceof Error ? error.message : copy.unavailable); setIsSubmitting(false); }
  };

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl p-0">
      <div className="border-b border-border bg-gradient-to-br from-primary/15 via-primary/5 to-background p-6"><DialogHeader className="text-left"><div className="flex items-center gap-3"><div className={`flex h-11 w-11 items-center justify-center rounded-xl ${isUltimate ? 'bg-amber-500/15 text-amber-600' : 'bg-primary/15 text-primary'}`}>{isUltimate ? <Gem className="h-6 w-6" /> : <Crown className="h-6 w-6" />}</div><div><DialogTitle className="text-xl">{copy.upgrade}</DialogTitle><DialogDescription className="mt-1">{copy.description}</DialogDescription></div><Badge className="ml-auto" variant={isUltimate ? 'default' : 'secondary'}>{isUltimate ? copy.fullAccess : copy.popular}</Badge></div></DialogHeader></div>
      <div className="space-y-5 p-6">
        <div className="rounded-xl border border-border bg-card p-4"><div className="flex items-end justify-between"><div><p className="text-sm font-semibold">{planName}</p><p className="text-xs text-muted-foreground">{copy.monthly}</p></div><p className="text-2xl font-bold">${price.toFixed(2)}<span className="text-xs font-normal text-muted-foreground"> / month</span></p></div><div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><Check className="h-3.5 w-3.5 text-emerald-500" />{copy.cancelAnytime}</div></div>
        <fieldset className="space-y-2"><legend className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{copy.chooseProvider}</legend><div className="grid gap-3 sm:grid-cols-2">{(['whop', 'paypal'] as const).map((option) => <button key={option} type="button" onClick={() => setProvider(option)} aria-pressed={provider === option} className={`rounded-xl border p-4 text-left transition ${provider === option ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border hover:bg-muted/40'}`}><div className="flex items-center justify-between"><span className="font-semibold">{option === 'whop' ? 'Whop' : 'PayPal'}</span>{option === 'whop' ? <Badge variant="secondary">{copy.primary}</Badge> : <Badge variant="outline">{copy.alternative}</Badge>}</div><p className="mt-1 text-xs text-muted-foreground">{option === 'whop' ? copy.whopCopy : copy.paypalCopy}</p></button>)}</div></fieldset>
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground"><CreditCard className="h-3.5 w-3.5 text-primary" />{copy.handledBy} {provider === 'whop' ? 'Whop' : 'PayPal'}</div><div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground"><ShieldCheck className="h-3 w-3 text-emerald-500" />{copy.serverVerified}</div>{checkoutError && <div role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{checkoutError}</div>}
      </div>
      <div className="border-t border-border bg-card/95 p-5"><Button type="button" className="h-11 w-full gap-2" onClick={handleCheckout} disabled={isSubmitting}>{isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}{isSubmitting ? `${copy.connecting} ${provider === 'whop' ? 'Whop' : 'PayPal'}…` : `${copy.continueWith} ${provider === 'whop' ? 'Whop' : 'PayPal'}`}</Button><Button type="button" variant="ghost" className="mt-2 h-8 w-full text-xs text-muted-foreground" onClick={() => onOpenChange(false)} disabled={isSubmitting}>{copy.cancel}</Button></div>
    </DialogContent>
  </Dialog>;
}
