import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AtsWarningAlertProps {
  templateAtsScore: 'high' | 'medium' | 'low' | undefined;
  onSwitchToAts: () => void;
}

export function AtsWarningAlert({ templateAtsScore, onSwitchToAts }: AtsWarningAlertProps) {
  if (!templateAtsScore || templateAtsScore === 'high') return null;

  return (
    <Alert
      variant={templateAtsScore === 'low' ? 'destructive' : 'default'}
      className={cn(
        templateAtsScore === 'medium' && 'border-amber-500/50 text-amber-700 dark:text-amber-400 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400'
      )}
    >
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="text-sm">
        {templateAtsScore === 'low'
          ? 'Your template has low ATS compatibility.'
          : 'Your template has moderate ATS compatibility.'}
        <Button
          variant="link"
          size="sm"
          className="h-auto p-0 ml-1 text-sm font-semibold underline"
          onClick={onSwitchToAts}
        >
          Switch to ATS-Optimized
        </Button>
      </AlertDescription>
    </Alert>
  );
}
