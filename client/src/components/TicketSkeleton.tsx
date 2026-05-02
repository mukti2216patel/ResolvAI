import { Skeleton } from './ui/skeleton';

export default function TicketSkeleton() {
  return (
    <div className="bg-bg-card border border-border-color rounded-lg p-6 relative overflow-hidden before:content-[''] before:absolute before:top-0 before:left-0 before:w-1 before:h-full before:bg-text-secondary/10">
      <div className="flex justify-between items-center mb-4">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>

      <Skeleton className="h-6 w-3/4 mb-3" />
      
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-5/6 mb-4" />

      <div className="flex items-center justify-between mb-5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
      </div>

      <div className="flex gap-[10px] items-center pt-4 border-t border-border-color">
        <Skeleton className="h-8 flex-1" />
        <Skeleton className="h-8 w-16 rounded-md" />
      </div>
    </div>
  );
}
