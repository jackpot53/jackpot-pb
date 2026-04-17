import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "w-full min-w-0 rounded-lg border border-white/25 bg-white/10 px-2.5 py-1.5 text-sm transition-colors outline-none resize-none placeholder:text-white/30 focus-visible:border-white/50 focus-visible:ring-3 focus-visible:ring-white/10 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
