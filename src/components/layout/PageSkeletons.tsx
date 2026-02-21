import { cn } from '@/lib/utils';

/** Lightweight skeleton shown while lazy-loaded editor sections are loading */
export function SectionSkeleton() {
  return (
    <div className="space-y-3 animate-pulse py-2">
      <div className="h-11 bg-muted rounded-lg" />
      <div className="h-11 bg-muted rounded-lg" />
      <div className="h-24 bg-muted rounded-lg" />
    </div>
  );
}

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

export function DetailSkeleton() {
  return (
    <div className="flex-1 flex flex-col animate-pulse">
      {/* Header */}
      <div className="h-14 border-b border-border flex items-center px-4 gap-4">
        <div className="w-8 h-8 rounded-lg bg-muted" />
        <div className="h-5 w-32 bg-muted rounded" />
        <div className="flex-1" />
        <div className="w-8 h-8 rounded-lg bg-muted" />
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        <div className="h-32 rounded-2xl bg-muted" />
        <div className="h-12 rounded-2xl bg-muted" />
        <div className="h-64 rounded-2xl bg-muted" />
      </div>
    </div>
  );
}

export function ShareSkeleton() {
  return (
    <div className="min-h-screen bg-background flex flex-col animate-pulse">
      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-4 w-64 bg-muted rounded" />
        </div>

        {/* Sections */}
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="h-4 w-24 bg-muted rounded" />
            <div className="h-20 w-full bg-muted rounded" />
          </div>
          <div className="space-y-3">
            <div className="h-4 w-24 bg-muted rounded" />
            <div className="h-32 w-full bg-muted rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function EditorSkeleton() {
  return (
    <div className="flex-1 flex flex-col animate-pulse min-h-[100dvh] bg-background">
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

export function AuthSkeleton() {
  return (
    <div className="min-h-screen min-h-[100dvh] bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-sm animate-pulse space-y-6">
        {/* Back button */}
        <div className="w-10 h-10 bg-muted rounded-full" />
        
        {/* Title & subtitle */}
        <div className="space-y-2">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-4 w-64 bg-muted rounded" />
        </div>
        
        {/* Input fields */}
        <div className="space-y-3">
          <div className="h-12 w-full bg-muted rounded-lg" />
          <div className="h-12 w-full bg-muted rounded-lg" />
        </div>
        
        {/* Primary button */}
        <div className="h-14 w-full bg-muted rounded-lg" />
        
        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-muted" />
          <div className="h-4 w-8 bg-muted rounded" />
          <div className="flex-1 h-px bg-muted" />
        </div>
        
        {/* Social buttons */}
        <div className="space-y-3">
          <div className="h-12 w-full bg-muted rounded-lg" />
          <div className="h-12 w-full bg-muted rounded-lg" />
        </div>
        
        {/* Toggle link */}
        <div className="h-4 w-48 bg-muted rounded mx-auto" />
      </div>
    </div>
  );
}

export function TemplateSkeleton() {
  return (
    <div className="w-full h-full min-h-[400px] animate-pulse p-8 space-y-4">
      <div className="h-7 w-48 bg-muted rounded mx-auto" />
      <div className="h-3 w-64 bg-muted rounded mx-auto" />
      <div className="h-px w-full bg-muted my-4" />
      <div className="h-4 w-24 bg-muted rounded" />
      <div className="space-y-2">
        <div className="h-3 w-full bg-muted/60 rounded" />
        <div className="h-3 w-5/6 bg-muted/60 rounded" />
        <div className="h-3 w-4/6 bg-muted/60 rounded" />
      </div>
      <div className="h-4 w-28 bg-muted rounded mt-4" />
      <div className="space-y-2">
        <div className="h-3 w-full bg-muted/60 rounded" />
        <div className="h-3 w-3/4 bg-muted/60 rounded" />
      </div>
    </div>
  );
}

export function ApplicationsSkeleton() {
  return (
    <div className="flex-1 flex flex-col animate-pulse">
      <header className="sticky top-0 z-10 glass-header px-4 py-3 pt-safe border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-muted rounded" />
          <div className="h-6 w-28 bg-muted rounded" />
        </div>
        <div className="flex items-center gap-1">
          <div className="w-10 h-10 bg-muted rounded-xl" />
          <div className="w-10 h-10 bg-muted rounded-xl" />
        </div>
      </header>
      <div className="h-[2px] bg-muted/30" />
      <div className="px-4 py-4 space-y-4">
        {/* Tab bar */}
        <div className="rounded-2xl bg-muted/30 p-1 flex gap-1">
          <div className="h-10 flex-1 bg-muted rounded-xl" />
          <div className="h-10 flex-1 bg-muted/50 rounded-xl" />
        </div>
        {/* Status chips */}
        <div className="flex gap-2 overflow-hidden">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-8 w-20 bg-muted rounded-full flex-shrink-0" />
          ))}
        </div>
        {/* Cards */}
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-muted rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function AIStudioSkeleton() {
  return (
    <div className="flex-1 flex flex-col animate-pulse pt-safe">
      <div className="px-4 pt-4 pb-3 space-y-3">
        <div className="h-8 w-32 bg-muted rounded" />
        <div className="flex items-center justify-between">
          <div className="h-5 w-24 bg-muted rounded-full" />
          <div className="h-5 w-16 bg-muted rounded-full" />
        </div>
      </div>
      {/* Resume context bar */}
      <div className="px-4 pb-4">
        <div className="h-14 bg-muted rounded-2xl" />
      </div>
      {/* Chat CTA */}
      <div className="px-4 pb-4">
        <div className="h-20 bg-muted rounded-2xl" />
      </div>
      {/* Tool grid */}
      <div className="px-4 space-y-4">
        <div className="h-5 w-24 bg-muted rounded" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-24 bg-muted rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ProfilePageSkeleton() {
  return (
    <div className="flex-1 flex flex-col animate-pulse">
      <div className="shrink-0 flex items-center gap-3 px-4 h-14 pt-safe border-b border-border">
        <div className="w-12 h-12 bg-muted rounded-lg" />
        <div className="h-5 w-24 bg-muted rounded" />
      </div>
      <div className="flex-1 px-4 py-6 space-y-6">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-3">
          <div className="h-24 w-24 rounded-full bg-muted" />
          <div className="space-y-2 flex flex-col items-center">
            <div className="h-7 w-36 bg-muted rounded" />
            <div className="h-4 w-48 bg-muted rounded" />
          </div>
        </div>
        {/* Completion */}
        <div className="h-32 bg-muted rounded-2xl" />
        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <div className="h-12 bg-muted rounded-xl" />
          <div className="h-12 bg-muted rounded-xl" />
        </div>
        {/* Portfolio card */}
        <div className="h-36 bg-muted rounded-2xl" />
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="h-24 bg-muted rounded-2xl" />
          <div className="h-24 bg-muted rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

