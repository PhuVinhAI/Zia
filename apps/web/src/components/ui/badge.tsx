import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-[#58CC02]/10 text-[#58CC02] border border-[#58CC02]/30",
        secondary:
          "bg-muted text-muted-foreground border border-border",
        destructive:
          "bg-[#FF4B4B]/10 text-[#FF4B4B] border border-[#FF4B4B]/30",
        outline:
          "bg-transparent text-foreground border-2 border-border",
        accent:
          "bg-[#1CB0F6]/10 text-[#1CB0F6] border border-[#1CB0F6]/30",
        warning:
          "bg-[#FF9600]/10 text-[#FF9600] border border-[#FF9600]/30",
        purple:
          "bg-[#CE82FF]/10 text-[#CE82FF] border border-[#CE82FF]/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
