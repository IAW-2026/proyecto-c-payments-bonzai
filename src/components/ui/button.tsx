import { clsx } from "clsx";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={clsx(
          "inline-flex items-center justify-center font-medium transition-all duration-300 ease-out",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
          "disabled:pointer-events-none disabled:opacity-50",
          "active:scale-[0.98]",
          // Architectural roundedness — 0.25rem
          "rounded",
          // Variants
          variant === "primary" &&
            "bg-primary text-on-primary hover:bg-primary-container",
          variant === "secondary" &&
            "bg-surface-mid text-on-surface hover:bg-surface-high",
          variant === "danger" &&
            "bg-error text-white hover:bg-error/90",
          variant === "ghost" &&
            "text-on-surface-muted hover:text-on-surface hover:bg-surface-low",
          // Sizes
          size === "sm" && "h-8 px-3 text-sm gap-1.5",
          size === "md" && "h-10 px-5 text-sm gap-2",
          size === "lg" && "h-12 px-7 text-base gap-2.5",
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button };
