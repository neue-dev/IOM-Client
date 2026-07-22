"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, disabled, ...props }, ref) => {
    const [passwordVisible, setPasswordVisible] = React.useState(false);

    if (type === "password") {
      const Icon = passwordVisible ? EyeOff : Eye;

      return (
        <div className="relative">
          <input
            type={passwordVisible ? "text" : "password"}
            className={cn(
              "bg-background pointer-events-auto relative z-10 box-border flex h-8 min-h-8 max-h-8 w-full rounded-[0.33em] border border-gray-200 px-[0.75em] py-0 pr-10 text-sm ring-0 focus:ring-transparent",
              "file:text-foreground placeholder:text-muted-foreground/40 file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
              className,
            )}
            ref={ref}
            disabled={disabled}
            {...props}
          />
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 z-20 flex w-10 items-center justify-center disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => setPasswordVisible((current) => !current)}
            disabled={disabled}
            aria-label={passwordVisible ? "Hide password" : "Show password"}
            aria-pressed={passwordVisible}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      );
    }

    return (
      <input
        type={type}
        className={cn(
          "bg-background pointer-events-auto relative z-10 box-border flex h-8 min-h-8 max-h-8 w-full rounded-[0.33em] border border-gray-200 px-[0.75em] py-0 text-sm ring-0 focus:ring-transparent",
          "file:text-foreground placeholder:text-muted-foreground/40 file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        disabled={disabled}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
