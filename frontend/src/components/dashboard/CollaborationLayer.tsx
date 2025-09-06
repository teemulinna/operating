import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUserPresence, useCursorTracking, useSelectionTracking } from '../../hooks/useWebSocket';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { UsersIcon, ExclamationTriangleIcon, EyeIcon } from '@heroicons/react/24/outline';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  isActive: boolean;
  cursor?: { x: number; y: number };
  selection?: string | null;
  color?: string;
  lastActivity?: string;
}

interface CollaborationLayerProps {
  currentUserId: string;
  activeUsers: User[];
  onCursorMove: (x: number, y: number) => void;
  onSelectionChange: (elementId: string | null, action: 'select' | 'deselect' | 'highlight') => void;
  className?: string;
}

// User colors for cursors and selections
const USER_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#f97316'  // orange
];

export const CollaborationLayer: React.FC<CollaborationLayerProps> = ({
  currentUserId,
  activeUsers,
  onCursorMove,
  onSelectionChange,
  className = ''
}) => {
  const [showPresencePanel, setShowPresencePanel] = useState(false);
  const [conflicts, setConflicts] = useState<{ [elementId: string]: User[] }>({});
  const [showConflictDetails, setShowConflictDetails] = useState<string | null>(null);
  
  const overlayRef = useRef<HTMLDivElement>(null);
  const throttleRef = useRef<number>();
  
  // Initialize presence tracking
  useUserPresence(currentUserId, window.location.pathname);
  const { updateCursorPosition } = useCursorTracking(currentUserId);
  const { updateSelection } = useSelectionTracking(currentUserId);

  // Assign colors to users
  const usersWithColors = activeUsers.map((user, index) => ({
    ...user,
    color: user.color || USER_COLORS[index % USER_COLORS.length]
  }));

  // Detect conflicts (multiple users selecting same element)
  useEffect(() => {
    const newConflicts: { [elementId: string]: User[] } = {};
    
    usersWithColors.forEach(user => {
      if (user.selection && user.id !== currentUserId) {
        if (!newConflicts[user.selection]) {
          newConflicts[user.selection] = [];
        }
        newConflicts[user.selection].push(user);
      }
    });

    // Only keep elements with multiple users
    Object.keys(newConflicts).forEach(elementId => {
      if (newConflicts[elementId].length < 2) {
        delete newConflicts[elementId];
      }
    });

    setConflicts(newConflicts);
  }, [usersWithColors, currentUserId]);

  // Throttled cursor movement handler
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (throttleRef.current) {
      clearTimeout(throttleRef.current);
    }

    throttleRef.current = window.setTimeout(() => {
      const rect = overlayRef.current?.getBoundingClientRect();
      if (rect) {
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        updateCursorPosition(x, y);
        onCursorMove(x, y);
      }
    }, 16); // ~60fps
  }, [updateCursorPosition, onCursorMove]);

  // Handle element selection
  const handleClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const resourceElement = target.closest('[data-resource-id]');
    
    if (resourceElement) {
      const elementId = resourceElement.getAttribute('data-resource-id');
      if (elementId) {
        updateSelection(elementId, 'select');
        onSelectionChange(elementId, 'select');
      }
    } else {
      // Clicked on empty space, deselect
      updateSelection('', 'deselect');
      onSelectionChange(null, 'deselect');
    }
  }, [updateSelection, onSelectionChange]);

  // Handle conflict resolution
  const handleTakeControl = (elementId: string) => {
    updateSelection(elementId, 'select', { action: 'take-control' });
    onSelectionChange(elementId, 'select');
    setShowConflictDetails(null);
  };

  const handleRequestAccess = (elementId: string) => {
    updateSelection(elementId, 'highlight', { action: 'request-access' });
    setShowConflictDetails(null);
  };

  return (
    <div className={`collaboration-layer relative ${className}`}>
      {/* Presence Indicator */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        <Card className="bg-white/90 backdrop-blur-sm border-gray-200">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              {/* User Avatars */}
              <div className="flex -space-x-2">
                {usersWithColors.slice(0, 3).map((user) => (
                  <motion.div
                    key={user.id}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="relative"
                  >
                    <img
                      src={user.avatar || `/api/avatar/${user.id}`}
                      alt={user.name}
                      className="w-8 h-8 rounded-full border-2 border-white object-cover"
                      style={{ borderColor: user.color }}
                    />
                    {user.isActive && (
                      <div 
                        className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white"
                        style={{ backgroundColor: user.color }}
                      />
                    )}
                  </motion.div>
                ))}
                {usersWithColors.length > 3 && (
                  <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600">
                    +{usersWithColors.length - 3}
                  </div>
                )}
              </div>

              {/* User Count Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPresencePanel(!showPresencePanel)}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                <UsersIcon className="w-4 h-4 mr-1" />
                {usersWithColors.length} users online
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Presence Panel */}
      <AnimatePresence>
        {showPresencePanel && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="fixed top-20 right-4 z-50 w-80"
          >
            <Card className="bg-white/95 backdrop-blur-sm border-gray-200 shadow-lg">
              <CardContent className="p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Active Users</h3>
                <div className="space-y-3">
                  {usersWithColors.map((user) => (
                    <div key={user.id} className="flex items-center gap-3">
                      <div className="relative">
                        <img
                          src={user.avatar || `/api/avatar/${user.id}`}
                          alt={user.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <div 
                          className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white"
                          style={{ backgroundColor: user.color }}
                        />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{user.name}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                      <Badge variant={user.isActive ? "default" : "secondary"}>
                        {user.isActive ? 'Active' : 'Away'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Conflict Notifications */}
      <AnimatePresence>
        {Object.entries(conflicts).map(([elementId, conflictUsers]) => (
          <motion.div
            key={elementId}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-4 right-4 z-50 w-80"
          >
            <Card className="bg-orange-50 border-orange-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <ExclamationTriangleIcon className="w-5 h-5 text-orange-500 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-orange-900">
                      Multiple users are editing the same resource
                    </h4>
                    <p className="text-sm text-orange-700 mt-1">
                      {conflictUsers.map(u => u.name).join(', ')} are currently working on this item
                    </p>
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowConflictDetails(elementId)}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Conflict Resolution Modal */}
      <AnimatePresence>
        {showConflictDetails && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setShowConflictDetails(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-lg p-6 w-full max-w-md"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Resolve Editing Conflict
              </h3>
              <p className="text-gray-600 mb-6">
                Multiple users are editing this resource. What would you like to do?
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={() => handleTakeControl(showConflictDetails)}
                  className="flex-1"
                >
                  Take Control
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleRequestAccess(showConflictDetails)}
                  className="flex-1"
                >
                  Request Access
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collaboration Overlay */}
      <div
        ref={overlayRef}
        data-testid="collaboration-overlay"
        className="fixed inset-0 pointer-events-none z-40"
        style={{ pointerEvents: 'auto' }}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
      >
        {/* User Cursors */}
        <AnimatePresence>
          {usersWithColors
            .filter(user => user.cursor && user.id !== currentUserId)
            .map((user) => (
              <motion.div
                key={user.id}
                data-testid={`cursor-${user.id}`}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                className="absolute pointer-events-none z-50"
                style={{
                  left: user.cursor!.x,
                  top: user.cursor!.y
                }}
              >
                {/* Cursor Icon */}
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  className="drop-shadow-md"
                >
                  <path
                    d="M5.65376 12.3673L6.8851 6.22017L12.2872 14.9815L8.52474 16.0765C7.94817 16.2432 7.31842 15.8928 7.15169 15.3162L5.65376 12.3673Z"
                    fill={user.color}
                    stroke="white"
                    strokeWidth="1"
                  />
                </svg>
                
                {/* Cursor Label */}
                <div
                  className="absolute top-6 left-2 px-2 py-1 text-xs font-medium text-white rounded shadow-lg whitespace-nowrap pointer-events-none"
                  style={{ backgroundColor: user.color }}
                >
                  {user.name}
                </div>
              </motion.div>
            ))}
        </AnimatePresence>

        {/* Selection Highlights */}
        {usersWithColors
          .filter(user => user.selection && user.id !== currentUserId)
          .map((user) => (
            <div
              key={`selection-${user.id}-${user.selection}`}
              data-testid={`selection-highlight-${user.selection}`}
              className="absolute inset-0 pointer-events-none"
            >
              <style>
                {`
                  [data-resource-id="${user.selection}"] {
                    outline: 2px solid ${user.color} !important;
                    outline-offset: 2px;
                    border-radius: 4px;
                  }
                  [data-resource-id="${user.selection}"]::before {
                    content: "${user.name} is editing";
                    position: absolute;
                    top: -28px;
                    left: 0;
                    background: ${user.color};
                    color: white;
                    padding: 2px 8px;
                    border-radius: 4px;
                    font-size: 12px;
                    font-weight: 500;
                    white-space: nowrap;
                    z-index: 1000;
                  }
                `}
              </style>
            </div>
          ))}
      </div>
    </div>
  );
};