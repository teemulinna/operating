import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { motion } from "framer-motion"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 will-change-transform",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-md hover:shadow-lg active:shadow-sm transform hover:-translate-y-0.5 active:translate-y-0",
        destructive: "bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 shadow-md hover:shadow-lg transform hover:-translate-y-0.5",
        outline: "border-2 border-gray-300 bg-white/90 hover:bg-gray-50 text-gray-900 hover:border-gray-400 backdrop-blur-sm",
        secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200 border border-gray-200 hover:border-gray-300",
        ghost: "hover:bg-gray-100 hover:text-gray-900 text-gray-700",
        link: "text-blue-600 underline-offset-4 hover:underline hover:text-blue-700",
        success: "bg-gradient-to-r from-emerald-600 to-emerald-700 text-white hover:from-emerald-700 hover:to-emerald-800 shadow-md hover:shadow-lg transform hover:-translate-y-0.5",
        warning: "bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700 shadow-md hover:shadow-lg transform hover:-translate-y-0.5",
        glass: "backdrop-blur-xl bg-white/20 border border-white/30 text-gray-900 hover:bg-white/30 shadow-lg hover:shadow-xl",
      },
      size: {
        default: "h-11 px-6 py-2.5",
        sm: "h-9 rounded-lg px-4 text-xs",
        lg: "h-13 rounded-xl px-8 text-base",
        xl: "h-16 rounded-2xl px-12 text-lg",
        icon: "h-11 w-11",
        "icon-sm": "h-9 w-9",
        "icon-lg": "h-13 w-13",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  ripple?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, leftIcon, rightIcon, ripple = true, children, ...props }, ref) => {
    const [rippleEffect, setRippleEffect] = React.useState<{x: number; y: number; timestamp: number} | null>(null)
    
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (ripple && !loading && !props.disabled) {
        const rect = e.currentTarget.getBoundingClientRect()
        setRippleEffect({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          timestamp: Date.now()
        })
        
        // Clear ripple effect after animation
        setTimeout(() => setRippleEffect(null), 600)
      }
      
      props.onClick?.(e)
    }
    
    const Comp = asChild ? Slot : motion.button
    
    const buttonContent = (
      <>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
          />
        )}
        {!loading && leftIcon && (
          <motion.span
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-shrink-0"
          >
            {leftIcon}
          </motion.span>
        )}
        <span className={loading ? "opacity-0" : ""}>{children}</span>
        {!loading && rightIcon && (
          <motion.span
            initial={{ opacity: 0, x: 4 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-shrink-0"
          >
            {rightIcon}
          </motion.span>
        )}
        
        {/* Ripple Effect */}
        {rippleEffect && (
          <span
            className="absolute inset-0 overflow-hidden rounded-inherit pointer-events-none"
            style={{
              clipPath: 'inherit'
            }}
          >
            <span
              className="absolute bg-white/30 rounded-full animate-ping"
              style={{
                left: rippleEffect.x - 10,
                top: rippleEffect.y - 10,
                width: 20,
                height: 20,
                animationDuration: '600ms'
              }}
            />
          </span>
        )}
      </>
    )
    
    if (asChild) {
      return (
        <Slot className={cn(buttonVariants({ variant, size, className }))} ref={ref}>
          {children}
        </Slot>
      )
    }
    
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }), "relative overflow-hidden")}
        ref={ref}
        disabled={loading || props.disabled}
        onClick={handleClick}
        whileTap={{ scale: 0.98 }}
        whileHover={{ scale: 1.02 }}
        transition={{ type: "spring", stiffness: 400, damping: 10 }}
        {...props}
      >
        {buttonContent}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }