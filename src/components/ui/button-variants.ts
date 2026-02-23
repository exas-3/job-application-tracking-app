import { cva, type VariantProps } from "class-variance-authority";

export const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-emerald-600 text-white hover:bg-emerald-500",
        secondary: "bg-white/80 text-slate-900 hover:bg-white",
        outline: "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50",
        ghost: "text-slate-700 hover:bg-slate-100",
        danger: "bg-rose-600 text-white hover:bg-rose-500",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-11 px-6",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export type ButtonVariantProps = VariantProps<typeof buttonVariants>;
