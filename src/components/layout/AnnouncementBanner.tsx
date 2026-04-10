import { useState } from 'react';
import { X } from 'lucide-react';

interface AnnouncementBannerProps {
  message: string;
}

export function AnnouncementBanner({ message }: AnnouncementBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !message.trim()) return null;

  return (
    <div className="flex items-center justify-between gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium">
      <span className="flex-1 text-center">{message}</span>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 p-0.5 rounded hover:bg-primary-foreground/20 transition-colors"
        aria-label="Dismiss announcement"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
