import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all cursor-pointer disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "bg-[#58CC02] text-white shadow-[0_4px_0_0_#46A302] hover:shadow-[0_2px_0_0_#46A302] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px]",
        destructive:
          "bg-[#FF4B4B] text-white shadow-[0_4px_0_0_#E63E3E] hover:shadow-[0_2px_0_0_#E63E3E] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px]",
        outline:
          "border-2 border-border bg-card hover:bg-muted hover:border-muted-foreground/20",
        secondary:
          "bg-muted text-foreground hover:bg-muted/80",
        ghost:
          "hover:bg-muted hover:text-foreground",
        link:
          "text-[#1CB0F6] underline-offset-4 hover:underline",
        accent:
          "bg-[#1CB0F6] text-white shadow-[0_4px_0_0_#1899D6] hover:shadow-[0_2px_0_0_#1899D6] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px]",
        warning:
          "bg-[#FF9600] text-white shadow-[0_4px_0_0_#E68600] hover:shadow-[0_2px_0_0_#E68600] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px]",
        purple:
          "bg-[#CE82FF] text-white shadow-[0_4px_0_0_#B86EE6] hover:shadow-[0_2px_0_0_#B86EE6] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px]",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 rounded-lg gap-1.5 px-3",
        lg: "h-12 rounded-xl px-8",
        icon: "size-10",
        "icon-sm": "size-9 rounded-lg",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
