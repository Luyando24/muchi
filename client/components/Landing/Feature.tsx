import { cn } from "@/lib/utils";

interface FeatureProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  className?: string;
}

export default function Feature({
  icon,
  title,
  description,
  className,
}: FeatureProps) {
  return (
    <div className={cn("rounded-lg border bg-card p-4 sm:p-5 futuristic-card bright-border", className)}>
      <div className="mb-3 flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mb-2 font-semibold text-sm sm:text-base">{title}</h3>
      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
