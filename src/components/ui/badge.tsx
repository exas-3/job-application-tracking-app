import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
  {
    variants: {
      variant: {
        neutral: "bg-slate-100 text-slate-700",
        emerald: "bg-emerald-100 text-emerald-800",
        amber: "bg-amber-100 text-amber-800",
        blue: "bg-sky-100 text-sky-800",
        purple: "bg-violet-100 text-violet-800",
        red: "bg-rose-100 text-rose-800",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
