"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-5 text-[#58CC02]" />,
        info: <InfoIcon className="size-5 text-[#1CB0F6]" />,
        warning: <TriangleAlertIcon className="size-5 text-[#FF9600]" />,
        error: <OctagonXIcon className="size-5 text-[#FF4B4B]" />,
        loading: <Loader2Icon className="size-5 animate-spin text-[#1CB0F6]" />,
      }}
      toastOptions={{
        classNames: {
          toast: "rounded-xl border-2 border-border bg-card shadow-lg font-medium",
          title: "font-semibold",
          description: "text-muted-foreground",
          success: "border-[#58CC02]/30 bg-[#58CC02]/5",
          error: "border-[#FF4B4B]/30 bg-[#FF4B4B]/5",
          warning: "border-[#FF9600]/30 bg-[#FF9600]/5",
          info: "border-[#1CB0F6]/30 bg-[#1CB0F6]/5",
        },
      }}
      style={
        {
          "--normal-bg": "var(--card)",
          "--normal-text": "var(--foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "12px",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
