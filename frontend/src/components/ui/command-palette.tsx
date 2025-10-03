/**
 * Command Palette Component
 * Modern command palette with search, keyboard navigation, and actions
 */

import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '../../lib/utils';
import { Dialog } from './dialog';

export interface CommandPaletteAction {
  id: string;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action: () => void;
  keywords?: string[];
  category?: string;
  hotkey?: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  actions: CommandPaletteAction[];
  placeholder?: string;
  emptyMessage?: string;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  actions,
  placeholder = 'Type a command or search...',
  emptyMessage = 'No results found.'
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Filter actions based on search query
  const filteredActions = React.useMemo(() => {
    if (!query.trim()) return actions;

    const searchTerm = query.toLowerCase();
    return actions.filter(action => {
      const titleMatch = action.title.toLowerCase().includes(searchTerm);
      const subtitleMatch = action.subtitle?.toLowerCase().includes(searchTerm);
      const keywordMatch = action.keywords?.some(keyword => 
        keyword.toLowerCase().includes(searchTerm)
      );
      const categoryMatch = action.category?.toLowerCase().includes(searchTerm);

      return titleMatch || subtitleMatch || keywordMatch || categoryMatch;
    });
  }, [actions, query]);

  // Group actions by category
  const groupedActions = React.useMemo(() => {
    const groups: { [category: string]: CommandPaletteAction[] } = {};
    
    filteredActions.forEach(action => {
      const category = action.category || 'Actions';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(action);
    });

    return groups;
  }, [filteredActions]);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredActions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredActions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredActions[selectedIndex]) {
          filteredActions[selectedIndex].action();
          onClose();
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [isOpen, filteredActions, selectedIndex, onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
        <div className="w-full max-w-2xl mx-4">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
            {/* Search Input */}
            <div className="flex items-center px-4 py-3 border-b border-gray-100">
              <div className="flex items-center justify-center w-5 h-5 mr-3 text-gray-400">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={placeholder}
                className="flex-1 bg-transparent border-none outline-none text-gray-900 placeholder-gray-500 text-lg"
                autoFocus
              />
              <div className="hidden sm:flex items-center space-x-1 text-xs text-gray-400">
                <kbd className="px-2 py-1 bg-gray-100 rounded text-gray-600">ESC</kbd>
              </div>
            </div>

            {/* Results */}
            <div className="max-h-96 overflow-y-auto">
              {filteredActions.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500">
                  <div className="w-12 h-12 mx-auto mb-3 text-gray-300">
                    <svg fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-sm">{emptyMessage}</p>
                </div>
              ) : (
                <div className="py-2">
                  {Object.entries(groupedActions).map(([category, categoryActions]) => (
                    <div key={category}>
                      <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                        {category}
                      </div>
                      {categoryActions.map((action) => {
                        const globalIndex = filteredActions.indexOf(action);
                        const isSelected = globalIndex === selectedIndex;

                        return (
                          <button
                            key={action.id}
                            onClick={() => {
                              action.action();
                              onClose();
                            }}
                            className={cn(
                              'w-full px-4 py-3 text-left flex items-center space-x-3 hover:bg-gray-50 transition-colors duration-150',
                              isSelected && 'bg-primary-50 border-r-2 border-primary-500'
                            )}
                          >
                            {action.icon && (
                              <div className={cn(
                                'flex-shrink-0 w-5 h-5',
                                isSelected ? 'text-primary-600' : 'text-gray-400'
                              )}>
                                {action.icon}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className={cn(
                                'text-sm font-medium truncate',
                                isSelected ? 'text-primary-900' : 'text-gray-900'
                              )}>
                                {action.title}
                              </div>
                              {action.subtitle && (
                                <div className="text-xs text-gray-500 truncate">
                                  {action.subtitle}
                                </div>
                              )}
                            </div>
                            {action.hotkey && (
                              <div className="flex-shrink-0 text-xs text-gray-400">
                                <kbd className="px-2 py-1 bg-gray-100 rounded">
                                  {action.hotkey}
                                </kbd>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center space-x-4">
                <span className="flex items-center space-x-1">
                  <kbd className="px-1 py-0.5 bg-white border border-gray-200 rounded">↑</kbd>
                  <kbd className="px-1 py-0.5 bg-white border border-gray-200 rounded">↓</kbd>
                  <span>navigate</span>
                </span>
                <span className="flex items-center space-x-1">
                  <kbd className="px-2 py-0.5 bg-white border border-gray-200 rounded">↵</kbd>
                  <span>select</span>
                </span>
              </div>
              <span className="flex items-center space-x-1">
                <kbd className="px-2 py-0.5 bg-white border border-gray-200 rounded">esc</kbd>
                <span>close</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
};

// Hook for managing command palette state
export const useCommandPalette = (actions: CommandPaletteAction[]) => {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen(prev => !prev), []);

  // Global keyboard shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggle();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [toggle]);

  return {
    isOpen,
    open,
    close,
    toggle,
    CommandPaletteComponent: (props: Omit<CommandPaletteProps, 'isOpen' | 'onClose' | 'actions'>) => (
      <CommandPalette
        isOpen={isOpen}
        onClose={close}
        actions={actions}
        {...props}
      />
    )
  };
};