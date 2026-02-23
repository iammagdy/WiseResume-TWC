import { Skeleton } from '@/components/ui/skeleton';

/* ── Shared wrapper ── */
function SkeletonWrapper({ children }: { children: React.ReactNode }) {
  return <div className="flex-1 flex flex-col space-y-4">{children}</div>;
}

/* ── Shared: "Add" button bar (right-aligned) ── */
function AddButtonBar() {
  return (
    <div className="flex justify-end">
      <Skeleton className="h-11 w-28 rounded-xl" />
    </div>
  );
}

/* ── Shared: collapsed entry card ── */
function CardPlaceholder() {
  return (
    <div className="rounded-2xl border border-border/40 p-4 flex items-center gap-3">
      <Skeleton className="h-4 w-4 rounded shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <Skeleton className="h-4 w-4 rounded shrink-0" />
    </div>
  );
}

/* ── Contact: 6 labeled input fields ── */
export function ContactSectionSkeleton() {
  return (
    <SkeletonWrapper>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      ))}
    </SkeletonWrapper>
  );
}

/* ── Summary: label + textarea + tips bar ── */
export function SummarySectionSkeleton() {
  return (
    <SkeletonWrapper>
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
      <Skeleton className="h-12 w-full rounded-xl" />
    </SkeletonWrapper>
  );
}

/* ── Experience: add button + 2 collapsed cards ── */
export function ExperienceSectionSkeleton() {
  return (
    <SkeletonWrapper>
      <AddButtonBar />
      <CardPlaceholder />
      <CardPlaceholder />
    </SkeletonWrapper>
  );
}

/* ── Education: add button + 1 collapsed card ── */
export function EducationSectionSkeleton() {
  return (
    <SkeletonWrapper>
      <AddButtonBar />
      <CardPlaceholder />
    </SkeletonWrapper>
  );
}

/* ── Skills: input row + pill placeholders ── */
export function SkillsSectionSkeleton() {
  return (
    <SkeletonWrapper>
      <div className="flex gap-2">
        <Skeleton className="h-10 flex-1 rounded-xl" />
        <Skeleton className="h-10 w-16 rounded-xl" />
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 rounded-full" style={{ width: `${60 + (i % 3) * 20}px` }} />
        ))}
      </div>
    </SkeletonWrapper>
  );
}

/* ── List (generic): add button + N cards — for Languages, Projects, etc. ── */
export function ListSectionSkeleton({ cards = 1 }: { cards?: number }) {
  return (
    <SkeletonWrapper>
      <AddButtonBar />
      {Array.from({ length: cards }).map((_, i) => (
        <CardPlaceholder key={i} />
      ))}
    </SkeletonWrapper>
  );
}
