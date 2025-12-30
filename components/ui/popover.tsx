"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface PopoverProps {
  children: React.ReactNode
  content: React.ReactNode
  className?: string
  position?: 'top' | 'left'
}

export function Popover({ children, content, className, position = 'top' }: PopoverProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  return (
    <div 
      className="relative inline-flex items-center"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      {children}
      {isOpen && (
        <div
          className={cn(
            "absolute z-50 p-3 text-sm text-slate-200 bg-slate-900/95 backdrop-blur-md border border-white/10 rounded-xl shadow-xl shadow-black/30 pointer-events-auto",
            position === 'top' 
              ? "w-64 bottom-full left-1/2 -translate-x-1/2 mb-2"
              : "w-56 right-full top-1/2 -translate-y-1/2 mr-2",
            className
          )}
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
        >
          {content}
          {position === 'top' && (
            <div
              className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-900/95 border-r border-b border-white/10 rotate-45"
            />
          )}
          {position === 'left' && (
            <div
              className="absolute left-full top-1/2 -translate-y-1/2 -ml-1 w-2 h-2 bg-slate-900/95 border-t border-r border-white/10 rotate-45"
            />
          )}
        </div>
      )}
    </div>
  )
}

