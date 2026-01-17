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
      closeButton
      toastOptions={{
        classNames: {
          toast: "group toast group-[.toaster]:shadow-lg font-sans border-l-[6px]",          
          description: "group-[.toast]:!text-gray-700 font-medium",          
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          success: [
            "group-[.toaster]:!bg-green-100",
            "group-[.toaster]:!text-green-900",
            "group-[.toaster]:!border-green-400",
            "group-[.toaster]:!border-l-green-600"
          ].join(" "),
          error: [
            "group-[.toaster]:!bg-red-100",
            "group-[.toaster]:!text-red-900",
            "group-[.toaster]:!border-red-400",
            "group-[.toaster]:!border-l-red-600"
          ].join(" "),
          warning: [
            "group-[.toaster]:!bg-amber-100",
            "group-[.toaster]:!text-amber-900",
            "group-[.toaster]:!border-amber-400",
            "group-[.toaster]:!border-l-amber-600"
          ].join(" "),
          info: [
            "group-[.toaster]:!bg-blue-100",
            "group-[.toaster]:!text-blue-900",
            "group-[.toaster]:!border-blue-400",
            "group-[.toaster]:!border-l-blue-600"
          ].join(" "),
        },
      }}
      icons={{
        success: <CircleCheckIcon className="size-5 text-green-700" />,
        info: <InfoIcon className="size-5 text-blue-700" />,
        warning: <TriangleAlertIcon className="size-5 text-amber-700" />,
        error: <OctagonXIcon className="size-5 text-red-700" />,
        loading: <Loader2Icon className="size-5 animate-spin text-gray-600" />,
      }}
      {...props}
    />
  )
}

export { Toaster }