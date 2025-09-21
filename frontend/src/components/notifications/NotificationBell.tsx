import React, { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { useNotifications } from '../../hooks/useNotifications';
import { NotificationPanel } from './NotificationPanel';

export interface NotificationBellProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showBadge?: boolean;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  className = '',
  size = 'md',
  showBadge = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { data: stats, refetch } = useNotifications.useStats();

  const unreadCount = stats?.unread || 0;

  // Auto-refresh notifications every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 30000);

    return () => clearInterval(interval);
  }, [refetch]);

  const handleTogglePanel = () => {
    setIsOpen(!isOpen);
  };

  const handleClosePanel = () => {
    setIsOpen(false);
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'h-8 w-8';
      case 'lg':
        return 'h-12 w-12';
      default:
        return 'h-10 w-10';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 16;
      case 'lg':
        return 24;
      default:
        return 20;
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Notification Bell Button */}
      <Button
        variant="ghost"
        size="icon"
        className={`${getSizeClasses()} relative hover:bg-gray-100 dark:hover:bg-gray-800`}
        onClick={handleTogglePanel}
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
      >
        <Bell size={getIconSize()} />
        
        {/* Unread Count Badge */}
        {showBadge && unreadCount > 0 && (
          <Badge
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-500 text-white border-2 border-white dark:border-gray-900"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
        
        {/* Online Indicator Dot */}
        <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-900 opacity-75" />
      </Button>

      {/* Notification Panel Overlay */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-20 z-40 md:hidden"
            onClick={handleClosePanel}
          />
          
          {/* Panel */}
          <Card className="absolute right-0 top-full mt-2 w-80 md:w-96 max-h-[80vh] z-50 shadow-xl border bg-white dark:bg-gray-900">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Notifications</h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleClosePanel}
                aria-label="Close notifications"
              >
                <X size={16} />
              </Button>
            </div>

            {/* Notification Panel Content */}
            <NotificationPanel 
              onClose={handleClosePanel}
              maxHeight="calc(80vh - 4rem)"
            />
          </Card>
        </>
      )}
    </div>
  );
};

export default NotificationBell;