import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all duration-150 ease-out disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 cursor-pointer active:scale-[0.97]",
  {
    variants: {
      variant: {
        default:
          "bg-[image:var(--gradient-primary)] text-[var(--primary-foreground)] shadow-[var(--shadow-glow)] hover:brightness-110 hover:-translate-y-px",
        outline:
          "border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-sm)] hover:bg-[var(--muted)] text-[var(--foreground)]",
        ghost: "hover:bg-[var(--muted)] text-[var(--foreground)]",
        destructive: "bg-red-600 text-white shadow-[var(--shadow-sm)] hover:bg-red-700",
      },
      size: {
        default: "h-10 px-5",
        sm: "h-8 px-4 text-xs",
        lg: "h-12 px-7 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
