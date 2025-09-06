import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const cardVariants = cva(
  "rounded-2xl border bg-card text-card-foreground shadow-sm transition-all duration-200 will-change-transform",
  {
    variants: {
      variant: {
        default: "border-border hover:shadow-md",
        elevated: "shadow-lg hover:shadow-xl border-border/50",
        interactive: "hover:shadow-lg hover:-translate-y-1 cursor-pointer border-border hover:border-border/80",
        glass: "backdrop-blur-xl bg-white/70 border-white/20 shadow-xl",
        gradient: "bg-gradient-to-br from-white to-gray-50/50 border-border/50 shadow-md hover:shadow-lg",
        outline: "border-2 border-border bg-transparent",
        flat: "border-0 shadow-none bg-gray-50/50",
      },
      size: {
        default: "",
        sm: "text-sm",
        lg: "text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  loading?: boolean
  hover?: boolean
  animate?: boolean
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, size, loading, hover = true, animate = true, children, ...props }, ref) => {
    if (animate) {
      return (
        <motion.div
          ref={ref}
          className={cn(cardVariants({ variant, size, className }))}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={hover ? { y: -2, transition: { type: "spring", stiffness: 300 } } : undefined}
          transition={{ duration: 0.2 }}
          {...props}
        >
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="animate-pulse"
              >
                <div className="h-32 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-xl"></div>
              </motion.div>
            ) : (
              <motion.div
                key="content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {children}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )
    }
    
    return (
      <div
        ref={ref}
        className={cn(cardVariants({ variant, size, className }))}
        {...props}
      >
        {loading ? (
          <div className="animate-pulse">
            <div className="h-32 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-xl"></div>
          </div>
        ) : (
          children
        )}
      </div>
    )
  }
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { animate?: boolean }
>(({ className, animate = true, children, ...props }, ref) => {
  if (animate) {
    return (
      <motion.div
        ref={ref}
        className={cn("flex flex-col space-y-2 p-6 pb-4", className)}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.2 }}
        {...props}
      >
        {children}
      </motion.div>
    )
  }
  
  return (
    <div
      ref={ref}
      className={cn("flex flex-col space-y-2 p-6 pb-4", className)}
      {...props}
    >
      {children}
    </div>
  )
})
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement> & { animate?: boolean }
>(({ className, animate = true, children, ...props }, ref) => {
  if (animate) {
    return (
      <motion.h3
        ref={ref}
        className={cn(
          "text-xl font-semibold leading-tight tracking-tight text-gray-900",
          className
        )}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.15, duration: 0.2 }}
        {...props}
      >
        {children}
      </motion.h3>
    )
  }
  
  return (
    <h3
      ref={ref}
      className={cn(
        "text-xl font-semibold leading-tight tracking-tight text-gray-900",
        className
      )}
      {...props}
    >
      {children}
    </h3>
  )
})
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement> & { animate?: boolean }
>(({ className, animate = true, children, ...props }, ref) => {
  if (animate) {
    return (
      <motion.p
        ref={ref}
        className={cn("text-sm text-gray-600 leading-relaxed", className)}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.2 }}
        {...props}
      >
        {children}
      </motion.p>
    )
  }
  
  return (
    <p
      ref={ref}
      className={cn("text-sm text-gray-600 leading-relaxed", className)}
      {...props}
    >
      {children}
    </p>
  )
})
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { animate?: boolean }
>(({ className, animate = true, children, ...props }, ref) => {
  if (animate) {
    return (
      <motion.div
        ref={ref}
        className={cn("px-6 pb-4", className)}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.2 }}
        {...props}
      >
        {children}
      </motion.div>
    )
  }
  
  return (
    <div
      ref={ref}
      className={cn("px-6 pb-4", className)}
      {...props}
    >
      {children}
    </div>
  )
})
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { animate?: boolean }
>(({ className, animate = true, children, ...props }, ref) => {
  if (animate) {
    return (
      <motion.div
        ref={ref}
        className={cn("flex items-center px-6 pb-6", className)}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.2 }}
        {...props}
      >
        {children}
      </motion.div>
    )
  }
  
  return (
    <div
      ref={ref}
      className={cn("flex items-center px-6 pb-6", className)}
      {...props}
    >
      {children}
    </div>
  )
})
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }