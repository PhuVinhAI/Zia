import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-11 w-full rounded-xl border-2 border-border bg-card px-4 py-2 text-base font-medium transition-colors",
        "file:border-0 file:bg-transparent file:text-sm file:font-semibold file:text-foreground",
        "placeholder:text-muted-foreground",
        "focus-visible:outline-none focus-visible:border-[#58CC02] focus-visible:ring-2 focus-visible:ring-[#58CC02]/20",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-[#FF4B4B] aria-invalid:ring-[#FF4B4B]/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }
