import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-text-secondary/15 animate-pulse rounded-md", className)}
      {...props}
    />
  )
}

export { Skeleton }
