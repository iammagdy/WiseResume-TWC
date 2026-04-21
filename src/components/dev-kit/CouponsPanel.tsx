import { useState, useCallback, useEffect } from 'react';
import { Plus, RefreshCw, ToggleLeft, ToggleRight, Trash2, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { toast } from 'sonner';
import { edgeFunctions } from '@/integrations/supabase/edgeFunctions';
import { getDevKitToken } from '@/contexts/DevKitSessionContext';
import { useIsMounted } from '@/lib/devkit/hooks';
import { unwrapAdminResponse, formatEdgeError } from '@/lib/devkit/edgeResponse';
import { devKitAuthHeaders } from '@/lib/devkit/devKitAuth';

interface Coupon {
  id: string;
  code: string;
  discount_type: 'percent' | 'plan_upgrade';
  discount_value: number;
  plan_override: string | null;
  plan_days: number | null;
  target_plan: string | null;
  expires_at: string | null;
  max_uses: number;
  uses_count: number;
  is_active: boolean;
  created_at: string;
}

interface CouponsPanelProps {
  onCountChange?: (n: number) => void;
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function CouponsPanel({ onCountChange }: CouponsPanelProps) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newType, setNewType] = useState<'percent' | 'plan_upgrade'>('plan_upgrade');
  const [newValue, setNewValue] = useState('');
  const [newPlan, setNewPlan] = useState<'pro' | 'premium' | 'wisehire_starter' | 'wisehire_professional' | 'wisehire_business'>('pro');
  const [newDays, setNewDays] = useState('30');
  const [newExpiry, setNewExpiry] = useState('');
  const [newMaxUses, setNewMaxUses] = useState('0');
  const [newTargetPlan, setNewTargetPlan] = useState<'' | 'free' | 'pro' | 'premium'>('');
  const [creating, setCreating] = useState(false);

  const [deletePending, setDeletePending] = useState<Coupon | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isMounted = useIsMounted();

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const tuple = await edgeFunctions.functions.invoke('admin-manage-coupons', {
        headers: devKitAuthHeaders(),
        body: { action: 'list' },
      });
      const result = unwrapAdminResponse<{ coupons?: Coupon[] }>(tuple, 'admin-manage-coupons');
      if (!isMounted()) return;
      const list = result.coupons ?? [];
      setCoupons(list);
      onCountChange?.(list.filter(c => c.is_active).length);
    } catch (e) {
      if (!isMounted()) return;
      setError(formatEdgeError(e, 'Failed to load coupons'));
    } finally {
      if (isMounted()) setLoading(false);
    }
  }, [onCountChange, isMounted]);

  useEffect(() => { fetchCoupons(); }, [fetchCoupons]);

  const handleToggle = async (coupon: Coupon) => {
    try {
      const tuple = await edgeFunctions.functions.invoke('admin-manage-coupons', {
        headers: devKitAuthHeaders(),
        body: { action: 'toggle', coupon_id: coupon.id, is_active: !coupon.is_active },
      });
      unwrapAdminResponse(tuple, 'admin-manage-coupons');
      toast.success(coupon.is_active ? 'Coupon deactivated' : 'Coupon activated');
      fetchCoupons();
    } catch (e) {
      toast.error(formatEdgeError(e, 'Failed to toggle coupon'));
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletePending) return;
    setDeleting(true);
    try {
      const tuple = await edgeFunctions.functions.invoke('admin-manage-coupons', {
        headers: devKitAuthHeaders(),
        body: { action: 'delete', coupon_id: deletePending.id },
      });
      unwrapAdminResponse(tuple, 'admin-manage-coupons');
      if (!isMounted()) return;
      toast.success('Coupon deleted');
      setDeletePending(null);
      fetchCoupons();
    } catch (e) {
      toast.error(formatEdgeError(e, 'Failed to delete coupon'));
    } finally {
      if (isMounted()) setDeleting(false);
    }
  };

  const handleCreate = async () => {
    if (!newCode.trim()) { toast.error('Code is required'); return; }
    setCreating(true);
    try {
      const tuple = await edgeFunctions.functions.invoke('admin-manage-coupons', {
        headers: devKitAuthHeaders(),
        body: {
          action: 'create',
          code: newCode.trim().toUpperCase(),
          discount_type: newType,
          discount_value: newType === 'percent' ? Number(newValue) : 0,
          plan_override: newType === 'plan_upgrade' ? newPlan : null,
          plan_days: newType === 'plan_upgrade' && newDays ? Number(newDays) : null,
          target_plan: newTargetPlan || null,
          expires_at: newExpiry || null,
          max_uses: Number(newMaxUses) || 0,
        },
      });
      unwrapAdminResponse(tuple, 'admin-manage-coupons');
      if (!isMounted()) return;
      toast.success(`Coupon "${newCode.toUpperCase()}" created`);
      setCreateOpen(false);
      setNewCode(''); setNewValue(''); setNewExpiry(''); setNewMaxUses('0'); setNewTargetPlan('');
      fetchCoupons();
    } catch (e) {
      toast.error(formatEdgeError(e, 'Failed to create coupon'));
    } finally {
      if (isMounted()) setCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Tag className="w-4 h-4" />
          <span>{coupons.length} coupon{coupons.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchCoupons} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)} className="flex items-center gap-1.5">
            <Plus className="w-4 h-4" />
            New coupon
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">{error}</div>
      )}

      {loading && !coupons.length && (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <div key={i} className="h-14 rounded-lg bg-muted/50 animate-pulse" />)}
        </div>
      )}

      {!loading && coupons.length === 0 && !error && (
        <div className="text-center py-8 text-muted-foreground">
          <Tag className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No coupons yet. Create your first one.</p>
        </div>
      )}

      {coupons.length > 0 && (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Code</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Uses</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Expires</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-mono font-semibold text-xs">{c.code}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {c.discount_type === 'plan_upgrade' ? (
                        <span className="text-xs text-muted-foreground">
                          {c.plan_override} {c.plan_days ? `(${c.plan_days}d)` : '(perm)'}
                          {c.target_plan && <span className="ml-1 text-amber-600">→ {c.target_plan} only</span>}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {c.discount_value}% off
                          {c.target_plan && <span className="ml-1 text-amber-600">→ {c.target_plan} only</span>}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">
                      {c.uses_count} / {c.max_uses === 0 ? '∞' : c.max_uses}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">
                      {formatDate(c.expires_at)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={c.is_active ? 'text-green-600 border-green-500/20 bg-green-500/10' : 'text-muted-foreground border-border'}>
                        {c.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleToggle(c)}
                          title={c.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {c.is_active
                            ? <ToggleRight className="w-4 h-4 text-green-500" />
                            : <ToggleLeft className="w-4 h-4 text-muted-foreground" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setDeletePending(c)}
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Coupon Confirmation */}
      <AlertDialog open={deletePending !== null} onOpenChange={(open) => { if (!open) setDeletePending(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete coupon "{deletePending?.code}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the coupon code. Any user who has already redeemed it will keep their benefit, but the code can no longer be used by anyone else. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting…' : 'Delete coupon'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Coupon Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Create Coupon</DialogTitle>
            <DialogDescription className="sr-only">Fill in the details to create a new discount coupon code</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Code</p>
              <Input placeholder="LAUNCH50" value={newCode} onChange={(e) => setNewCode(e.target.value.toUpperCase())} className="h-9 text-sm font-mono" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Type</p>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as 'percent' | 'plan_upgrade')}
                className="w-full text-sm bg-background border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="plan_upgrade">Plan upgrade (free plan grant)</option>
                <option value="percent">Percentage discount</option>
              </select>
            </div>
            {newType === 'percent' && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Discount %</p>
                <Input type="number" placeholder="20" value={newValue} onChange={(e) => setNewValue(e.target.value)} className="h-9" min="1" max="100" />
              </div>
            )}
            {newType === 'plan_upgrade' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Plan</p>
                  <select
                    value={newPlan}
                    onChange={(e) => setNewPlan(e.target.value as typeof newPlan)}
                    className="w-full text-sm bg-background border border-border rounded-md px-2 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <optgroup label="WiseResume">
                      <option value="pro">Pro</option>
                      <option value="premium">Premium</option>
                    </optgroup>
                    <optgroup label="WiseHire Tiers">
                      <option value="wisehire_starter">WiseHire Starter</option>
                      <option value="wisehire_professional">WiseHire Professional</option>
                      <option value="wisehire_business">WiseHire Business</option>
                    </optgroup>
                  </select>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Days (blank = permanent)</p>
                  <Input type="number" placeholder="30" value={newDays} onChange={(e) => setNewDays(e.target.value)} className="h-9" min="1" />
                </div>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground mb-1">Restrict to plan (optional)</p>
              <select
                value={newTargetPlan}
                onChange={(e) => setNewTargetPlan(e.target.value as '' | 'free' | 'pro' | 'premium')}
                className="w-full text-sm bg-background border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Any plan</option>
                <option value="free">Free only</option>
                <option value="pro">Pro only</option>
                <option value="premium">Premium only</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">Only users on this plan can redeem.</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Expires (optional)</p>
                <Input type="date" value={newExpiry} onChange={(e) => setNewExpiry(e.target.value)} className="h-9 text-xs" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Max uses (0 = unlimited)</p>
                <Input type="number" value={newMaxUses} onChange={(e) => setNewMaxUses(e.target.value)} className="h-9" min="0" />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating}>{creating ? 'Creating…' : 'Create coupon'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
