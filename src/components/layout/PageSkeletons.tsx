import { cn } from '@/lib/utils';

export function DashboardSkeleton() {
  return (
    <div className="min-h-full flex flex-col animate-pulse">
      {/* Header */}
      <header className="pt-safe pt-4 pb-3 px-4 flex items-center justify-between border-b border-border">
        <div className="w-24 h-8 rounded bg-muted" />
        <div className="w-20 h-8 rounded bg-muted" />
      </header>
      
      {/* Title Bar */}
      <div className="px-4 pt-4 pb-3">
        <div className="w-32 h-7 rounded bg-muted mb-2" />
        <div className="w-20 h-5 rounded bg-muted" />
      </div>
      
      {/* Cards */}
      <div className="px-4 space-y-3">
        <div className="h-24 bg-muted rounded-xl" />
        <div className="h-24 bg-muted rounded-xl" />
        <div className="h-24 bg-muted rounded-xl" />
      </div>
    </div>
  );
}

export function EditorSkeleton() {
  return (
    <div className="flex-1 flex flex-col animate-pulse">
      {/* Progress Bar */}
      <div className="px-4 py-3 border-b border-border">
        <div className="h-2 w-full bg-muted rounded" />
      </div>
      
      {/* Tabs */}
      <div className="mt-3 px-4 flex gap-2 overflow-hidden">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-10 w-20 bg-muted rounded flex-shrink-0" />
        ))}
      </div>
      
      {/* Content */}
      <div className="flex-1 px-4 py-4 space-y-4">
        <div className="h-12 bg-muted rounded-xl" />
        <div className="h-12 bg-muted rounded-xl" />
        <div className="h-32 bg-muted rounded-xl" />
      </div>
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div className="flex-1 flex flex-col animate-pulse">
      {/* Header */}
      <header className="pt-safe pt-4 pb-3 px-4 border-b border-border">
        <div className="h-7 w-24 bg-muted rounded" />
      </header>
      
      {/* Profile Card */}
      <div className="px-4 py-4">
        <div className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border">
          <div className="w-14 h-14 rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-32 bg-muted rounded" />
            <div className="h-4 w-24 bg-muted rounded" />
          </div>
        </div>
      </div>
      
      {/* Setting Rows */}
      <div className="px-4 space-y-4">
        <div className="h-16 bg-muted rounded-xl" />
        <div className="h-16 bg-muted rounded-xl" />
        <div className="h-16 bg-muted rounded-xl" />
      </div>
    </div>
  );
}

export function PreviewSkeleton() {
  return (
    <div className="flex-1 flex flex-col animate-pulse">
      {/* Template Switcher */}
      <div className="px-4 py-3 border-b border-border flex gap-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-8 w-20 bg-muted rounded-full flex-shrink-0" />
        ))}
      </div>
      
      {/* Preview Area */}
      <div className="flex-1 p-4 bg-muted/30">
        <div className="bg-card mx-auto shadow-lg" style={{ maxWidth: 612, height: 400 }} />
      </div>
    </div>
  );
}

export function UploadSkeleton() {
  return (
    <div className="flex-1 flex flex-col px-4 py-6 animate-pulse">
      <div className="flex-1 min-h-[280px] rounded-3xl border-2 border-dashed border-border flex flex-col items-center justify-center p-8">
        <div className="w-20 h-20 rounded-full bg-muted mb-5" />
        <div className="h-6 w-40 bg-muted rounded mb-2" />
        <div className="h-4 w-48 bg-muted rounded" />
      </div>
    </div>
  );
}

export function InterviewSkeleton() {
  return (
    <div className="flex-1 flex flex-col animate-pulse">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-3 pb-2">
        <div className="w-5 h-5 bg-muted rounded" />
        <div className="h-6 w-40 bg-muted rounded" />
      </div>
      
      {/* Content */}
      <div className="flex-1 px-4 py-6 space-y-4">
        <div className="h-24 bg-muted rounded-xl" />
        <div className="h-24 bg-muted rounded-xl" />
        <div className="h-16 bg-muted rounded-xl" />
      </div>
    </div>
  );
}

export function AISkeleton() {
  return (
    <div className="flex-1 flex flex-col animate-pulse">
      {/* Header */}
      <header className="pt-safe pt-4 pb-3 px-4 border-b border-border">
        <div className="h-7 w-28 bg-muted rounded" />
      </header>
      
      {/* Provider Selection Card */}
      <div className="px-4 py-4">
        <div className="p-4 rounded-xl bg-card border border-border space-y-3">
          <div className="h-5 w-24 bg-muted rounded" />
          <div className="h-16 bg-muted rounded-lg" />
          <div className="h-16 bg-muted rounded-lg" />
        </div>
      </div>
      
      {/* API Key Card */}
      <div className="px-4 space-y-4">
        <div className="h-32 bg-muted rounded-xl" />
        <div className="h-24 bg-muted rounded-xl" />
        <div className="h-20 bg-muted rounded-xl" />
      </div>
    </div>
  );
}
