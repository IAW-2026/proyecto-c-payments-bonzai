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
          "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
          "active:scale-[0.98]",
          // Variants
          variant === "primary" &&
            "bg-brand-600 text-white hover:bg-brand-700 shadow-sm hover:shadow-md",
          variant === "secondary" &&
            "bg-muted text-foreground hover:bg-border border border-border",
          variant === "danger" &&
            "bg-red-600 text-white hover:bg-red-700 shadow-sm",
          variant === "ghost" &&
            "text-muted-foreground hover:text-foreground hover:bg-muted",
          // Sizes
          size === "sm" && "h-8 px-3 text-sm gap-1.5",
          size === "md" && "h-10 px-4 text-sm gap-2",
          size === "lg" && "h-12 px-6 text-base gap-2.5",
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button };
