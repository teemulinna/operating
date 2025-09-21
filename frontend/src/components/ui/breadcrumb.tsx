/**
 * Breadcrumb Navigation Component
 * Modern breadcrumb with hover states and accessibility
 */

import React from 'react';
import { cn } from '../../lib/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
}

interface BreadcrumbProps extends React.HTMLAttributes<HTMLElement> {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
  maxItems?: number;
}

const defaultSeparator = (
  <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
  </svg>
);

export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  items,
  separator = defaultSeparator,
  maxItems = 5,
  className,
  ...props
}) => {
  // Handle collapsed items if there are too many
  const displayItems = React.useMemo(() => {
    if (items.length <= maxItems) {
      return items;
    }

    const firstItem = items[0];
    const lastItems = items.slice(-(maxItems - 2));
    
    return [
      firstItem,
      { label: '...', href: undefined, onClick: undefined },
      ...lastItems
    ];
  }, [items, maxItems]);

  const handleItemClick = (item: BreadcrumbItem, e: React.MouseEvent) => {
    if (item.onClick) {
      e.preventDefault();
      item.onClick();
    }
  };

  const handleKeyDown = (item: BreadcrumbItem, e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && item.onClick) {
      e.preventDefault();
      item.onClick();
    }
  };

  return (
    <nav 
      className={cn('flex items-center space-x-1 text-sm', className)}
      aria-label="Breadcrumb"
      {...props}
    >
      <ol className="flex items-center space-x-1">
        {displayItems.map((item, index) => {
          const isLast = index === displayItems.length - 1;
          const isEllipsis = item.label === '...';
          const isClickable = !isLast && (item.href || item.onClick);

          return (
            <li key={`${item.label}-${index}`} className="flex items-center space-x-1">
              {/* Breadcrumb Item */}
              {isClickable ? (
                <a
                  href={item.href}
                  onClick={(e) => handleItemClick(item, e)}
                  onKeyDown={(e) => handleKeyDown(item, e)}
                  className={cn(
                    'flex items-center space-x-1 px-2 py-1 rounded-md transition-colors duration-150',
                    'text-gray-500 hover:text-gray-700 hover:bg-gray-100',
                    'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1',
                    isEllipsis && 'cursor-default hover:bg-transparent hover:text-gray-500'
                  )}
                  tabIndex={isEllipsis ? -1 : 0}
                  role="button"
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.icon && (
                    <span className="w-4 h-4 flex-shrink-0">
                      {item.icon}
                    </span>
                  )}
                  <span className={cn(
                    'truncate max-w-32',
                    isEllipsis && 'font-bold'
                  )}>
                    {item.label}
                  </span>
                </a>
              ) : (
                <span
                  className={cn(
                    'flex items-center space-x-1 px-2 py-1',
                    isLast ? 'text-gray-900 font-medium' : 'text-gray-500'
                  )}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.icon && (
                    <span className="w-4 h-4 flex-shrink-0">
                      {item.icon}
                    </span>
                  )}
                  <span className="truncate max-w-32">
                    {item.label}
                  </span>
                </span>
              )}

              {/* Separator */}
              {!isLast && (
                <span className="flex-shrink-0" aria-hidden="true">
                  {separator}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

// Preset breadcrumb components for common use cases
interface HomeBreadcrumbProps extends Omit<BreadcrumbProps, 'items'> {
  homeHref?: string;
  homeOnClick?: () => void;
  items: Omit<BreadcrumbItem, 'icon'>[];
}

export const HomeBreadcrumb: React.FC<HomeBreadcrumbProps> = ({
  homeHref = '/',
  homeOnClick,
  items,
  ...props
}) => {
  const homeIcon = (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
    </svg>
  );

  const breadcrumbItems: BreadcrumbItem[] = [
    {
      label: 'Home',
      href: homeHref,
      onClick: homeOnClick,
      icon: homeIcon
    },
    ...items
  ];

  return <Breadcrumb items={breadcrumbItems} {...props} />;
};

// Utility hook for managing breadcrumb state
export const useBreadcrumb = () => {
  const [items, setItems] = React.useState<BreadcrumbItem[]>([]);

  const addItem = React.useCallback((item: BreadcrumbItem) => {
    setItems(prev => [...prev, item]);
  }, []);

  const removeLastItem = React.useCallback(() => {
    setItems(prev => prev.slice(0, -1));
  }, []);

  const setPath = React.useCallback((newItems: BreadcrumbItem[]) => {
    setItems(newItems);
  }, []);

  const clear = React.useCallback(() => {
    setItems([]);
  }, []);

  return {
    items,
    addItem,
    removeLastItem,
    setPath,
    clear
  };
};