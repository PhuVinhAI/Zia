import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-24 w-full rounded-xl border-2 border-border bg-card px-4 py-3 text-base font-medium transition-colors",
        "placeholder:text-muted-foreground",
        "focus-visible:outline-none focus-visible:border-[#58CC02] focus-visible:ring-2 focus-visible:ring-[#58CC02]/20",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-[#FF4B4B] aria-invalid:ring-[#FF4B4B]/20",
        "resize-none",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
