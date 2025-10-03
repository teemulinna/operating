import * as React from 'react';
import { cn } from '@/lib/utils';
import { Check, ChevronDown, X } from 'lucide-react';

export interface MultiSelectOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface MultiSelectProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  className?: string;
  maxDisplayCount?: number;
  disabled?: boolean;
}

export const MultiSelect = React.forwardRef<HTMLButtonElement, MultiSelectProps>(
  (
    {
      options,
      selected,
      onChange,
      placeholder = 'Select options...',
      className,
      maxDisplayCount = 3,
      disabled = false,
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          containerRef.current &&
          !containerRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handle option toggle
    const toggleOption = (value: string) => {
      if (disabled) return;

      const newSelected = selected.includes(value)
        ? selected.filter(v => v !== value)
        : [...selected, value];

      onChange(newSelected);
    };

    // Handle select all
    const selectAll = () => {
      if (disabled) return;
      const availableOptions = options.filter(opt => !opt.disabled);
      onChange(availableOptions.map(opt => opt.value));
    };

    // Handle clear all
    const clearAll = () => {
      if (disabled) return;
      onChange([]);
    };

    // Get display text for selected items
    const getDisplayText = () => {
      if (selected.length === 0) return placeholder;

      if (selected.length <= maxDisplayCount) {
        return selected
          .map(value => options.find(opt => opt.value === value)?.label)
          .filter(Boolean)
          .join(', ');
      }

      return `${selected.length} selected`;
    };

    // Filter options by selected state
    const selectedOptions = options.filter(opt => selected.includes(opt.value));
    const unselectedOptions = options.filter(opt => !selected.includes(opt.value));
    const sortedOptions = [...selectedOptions, ...unselectedOptions];

    return (
      <div
        ref={containerRef}
        className={cn('relative', className)}
      >
        {/* Trigger Button */}
        <button
          ref={ref}
          type="button"
          className={cn(
            'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
            'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            isOpen && 'ring-2 ring-ring ring-offset-2',
            className
          )}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
        >
          <span className="truncate text-left flex-1">
            {getDisplayText()}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </button>

        {/* Selected Items Display (when collapsed) */}
        {selected.length > 0 && selected.length <= maxDisplayCount && (
          <div className="mt-2 flex flex-wrap gap-1">
            {selected.map(value => {
              const option = options.find(opt => opt.value === value);
              if (!option) return null;

              return (
                <span
                  key={value}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-primary/10 text-primary rounded-full"
                >
                  {option.label}
                  {!disabled && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleOption(value);
                      }}
                      className="ml-1 hover:text-destructive focus:outline-none"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </span>
              );
            })}
          </div>
        )}

        {/* Dropdown Content */}
        {isOpen && !disabled && (
          <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto">
            {/* Header with Select All/Clear All */}
            {options.length > 0 && (
              <div className="flex items-center justify-between p-2 border-b border-border">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-xs text-muted-foreground hover:text-foreground focus:outline-none"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-xs text-muted-foreground hover:text-foreground focus:outline-none"
                >
                  Clear All
                </button>
              </div>
            )}

            {/* Options List */}
            {sortedOptions.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground text-center">
                No options available
              </div>
            ) : (
              <div className="p-1">
                {sortedOptions.map(option => {
                  const isSelected = selected.includes(option.value);

                  return (
                    <div
                      key={option.value}
                      className={cn(
                        'relative flex items-start gap-2 p-2 cursor-pointer rounded-sm text-sm',
                        'hover:bg-accent hover:text-accent-foreground',
                        'focus:bg-accent focus:text-accent-foreground',
                        option.disabled && 'opacity-50 cursor-not-allowed',
                        isSelected && 'bg-accent/50'
                      )}
                      onClick={() => !option.disabled && toggleOption(option.value)}
                    >
                      {/* Checkbox */}
                      <div
                        className={cn(
                          'flex h-4 w-4 items-center justify-center rounded border border-primary',
                          isSelected && 'bg-primary text-primary-foreground'
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>

                      {/* Label and Description */}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          {option.label}
                        </div>
                        {option.description && (
                          <div className="text-xs text-muted-foreground truncate">
                            {option.description}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
);

MultiSelect.displayName = 'MultiSelect';

export default MultiSelect;