/**
 * Enhanced Button Component
 * Modern button with design tokens, animations, and accessibility features
 */

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"
import { designTokens } from "../../styles/design-tokens"

const buttonVariants = cva(
  // Base styles with modern design tokens
  [
    "inline-flex items-center justify-center",
    "whitespace-nowrap rounded-lg text-sm font-semibold",
    "ring-offset-background transition-all duration-200 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed",
    "select-none",
    // Micro-interactions
    "transform active:scale-95 hover:shadow-sm",
    // Accessibility improvements
    "focus:outline-none focus:ring-2 focus:ring-offset-2"
  ],
  {
    variants: {
      variant: {
        // Primary - main call-to-action
        default: [
          "bg-blue-600 text-white border border-transparent",
          "hover:bg-blue-700 hover:shadow-md",
          "active:bg-blue-800",
          "focus:ring-blue-500/20 focus:bg-blue-700",
          "disabled:bg-gray-300 disabled:text-gray-500"
        ],
        // Destructive - dangerous actions
        destructive: [
          "bg-red-500 text-white border border-transparent",
          "hover:bg-red-600 hover:shadow-md",
          "active:bg-red-700",
          "focus:ring-red-500/20 focus:bg-red-600"
        ],
        // Outline - secondary actions
        outline: [
          "border border-gray-300 bg-white text-gray-700",
          "hover:bg-gray-50 hover:border-gray-400 hover:shadow-sm",
          "active:bg-gray-100",
          "focus:ring-blue-500/20 focus:border-blue-500"
        ],
        // Secondary - alternative styling
        secondary: [
          "bg-gray-100 text-gray-900 border border-transparent",
          "hover:bg-gray-200 hover:shadow-sm",
          "active:bg-gray-300",
          "focus:ring-gray-500/20"
        ],
        // Ghost - minimal styling
        ghost: [
          "bg-transparent text-gray-700 border border-transparent",
          "hover:bg-gray-100",
          "active:bg-gray-200",
          "focus:ring-gray-500/20"
        ],
        // Link - text-only
        link: [
          "bg-transparent text-blue-600 border border-transparent underline-offset-4 p-0",
          "hover:underline hover:text-blue-700",
          "focus:ring-blue-500/20 focus:rounded"
        ],
        // Success variant
        success: [
          "bg-green-500 text-white border border-transparent",
          "hover:bg-green-600 hover:shadow-md",
          "active:bg-green-700",
          "focus:ring-green-500/20"
        ],
        // Warning variant
        warning: [
          "bg-yellow-500 text-white border border-transparent",
          "hover:bg-yellow-600 hover:shadow-md",
          "active:bg-yellow-700",
          "focus:ring-yellow-500/20"
        ],
        // Info variant
        info: [
          "bg-blue-500 text-white border border-transparent",
          "hover:bg-blue-600 hover:shadow-md",
          "active:bg-blue-700",
          "focus:ring-blue-500/20"
        ]
      },
      size: {
        xs: "h-7 px-2 py-1 text-xs rounded-md",
        sm: "h-8 px-3 py-1.5 text-sm rounded-md",
        default: "h-10 px-4 py-2 text-sm",
        lg: "h-12 px-6 py-3 text-base",
        xl: "h-14 px-8 py-4 text-lg",
        icon: "h-10 w-10 p-0"
      },
      // Loading state
      loading: {
        true: "cursor-wait opacity-70"
      },
      // Full width
      fullWidth: {
        true: "w-full"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      loading: false,
      fullWidth: false
    },
  }
)

export interface EnhancedButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
}

const EnhancedButton = React.forwardRef<HTMLButtonElement, EnhancedButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    loading = false,
    leftIcon,
    rightIcon,
    fullWidth = false,
    asChild = false, 
    disabled,
    children,
    ...props 
  }, ref) => {
    const Comp = asChild ? Slot : "button"
    
    // Disable button when loading
    const isDisabled = disabled || loading

    return (
      <Comp
        className={cn(buttonVariants({ 
          variant, 
          size, 
          loading, 
          fullWidth,
          className 
        }))}
        ref={ref}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        {...props}
      >
        {loading ? (
          <>
            {/* Loading spinner */}
            <svg 
              className="animate-spin -ml-1 mr-2 h-4 w-4" 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24"
            >
              <circle 
                className="opacity-25" 
                cx="12" 
                cy="12" 
                r="10" 
                stroke="currentColor" 
                strokeWidth="4"
              />
              <path 
                className="opacity-75" 
                fill="currentColor" 
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            {typeof children === 'string' ? 'Loading...' : children}
          </>
        ) : (
          <>
            {leftIcon && (
              <span className="mr-2 flex-shrink-0 text-current">
                {leftIcon}
              </span>
            )}
            {children}
            {rightIcon && (
              <span className="ml-2 flex-shrink-0 text-current">
                {rightIcon}
              </span>
            )}
          </>
        )}
      </Comp>
    )
  }
)
EnhancedButton.displayName = "EnhancedButton"

// Button group component for related actions
interface ButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  orientation?: 'horizontal' | 'vertical'
  size?: 'sm' | 'default' | 'lg'
}

const ButtonGroup = React.forwardRef<HTMLDivElement, ButtonGroupProps>(
  ({ className, children, orientation = 'horizontal', size = 'default', ...props }, ref) => {
    return (
      <div
        className={cn(
          "inline-flex",
          orientation === 'horizontal' ? "flex-row" : "flex-col",
          "[&>button]:rounded-none",
          "[&>button:first-child]:rounded-l-lg",
          "[&>button:last-child]:rounded-r-lg",
          orientation === 'vertical' && [
            "[&>button:first-child]:rounded-t-lg [&>button:first-child]:rounded-b-none",
            "[&>button:last-child]:rounded-b-lg [&>button:last-child]:rounded-t-none"
          ],
          "[&>button:not(:first-child)]:border-l-0",
          orientation === 'vertical' && "[&>button:not(:first-child)]:border-t-0 [&>button:not(:first-child)]:border-l",
          className
        )}
        ref={ref}
        role="group"
        {...props}
      >
        {children}
      </div>
    )
  }
)
ButtonGroup.displayName = "ButtonGroup"

export { EnhancedButton, ButtonGroup, buttonVariants }