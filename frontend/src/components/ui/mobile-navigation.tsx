import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bars3Icon, 
  XMarkIcon,
  HomeIcon,
  UsersIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  BellIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface MobileNavigationProps {
  currentView: string;
  onNavigate: (view: string) => void;
  notifications?: number;
  user?: {
    name: string;
    avatar?: string;
    role: string;
  };
}

const navigationItems = [
  { id: 'dashboard', label: 'Dashboard', icon: HomeIcon },
  { id: 'employees', label: 'Employees', icon: UsersIcon },
  { id: 'projects', label: 'Projects', icon: CalendarDaysIcon },
  { id: 'resources', label: 'Resources', icon: ChartBarIcon },
  { id: 'settings', label: 'Settings', icon: Cog6ToothIcon },
];

export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  currentView,
  onNavigate,
  notifications = 0,
  user
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="lg:hidden sticky top-0 z-40 bg-white border-b border-gray-200 safe-area-top">
        <div className="flex items-center justify-between px-4 h-16">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMenu}
              className="touch-target"
              aria-label="Open menu"
            >
              <Bars3Icon className="h-6 w-6" />
            </Button>
            <h1 className="text-lg font-semibold text-gray-900 truncate">
              {navigationItems.find(item => item.id === currentView)?.label || 'Dashboard'}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="touch-target relative"
              aria-label="Search"
            >
              <MagnifyingGlassIcon className="h-5 w-5" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="touch-target relative"
              aria-label={`Notifications${notifications > 0 ? ` (${notifications})` : ''}`}
            >
              <BellIcon className="h-5 w-5" />
              {notifications > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs bg-red-500 text-white rounded-full flex items-center justify-center">
                  {notifications > 99 ? '99+' : notifications}
                </Badge>
              )}
            </Button>

            {user && (
              <Avatar className="h-8 w-8">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="rounded-full" />
                ) : (
                  <div className="bg-blue-600 text-white text-sm font-medium rounded-full flex items-center justify-center h-full w-full">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </Avatar>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/50 z-50"
              onClick={toggleMenu}
            />

            {/* Sidebar */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="lg:hidden fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-white border-r border-gray-200 z-50 safe-area-top"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Menu</h2>
                  {user && (
                    <p className="text-sm text-gray-600 mt-1">{user.name} • {user.role}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleMenu}
                  className="touch-target"
                  aria-label="Close menu"
                >
                  <XMarkIcon className="h-6 w-6" />
                </Button>
              </div>

              {/* Navigation Items */}
              <nav className="p-4 space-y-2">
                {navigationItems.map((item, index) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id;

                  return (
                    <motion.button
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => {
                        onNavigate(item.id);
                        setIsMenuOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 touch-target",
                        isActive 
                          ? "bg-blue-600 text-white shadow-md" 
                          : "text-gray-700 hover:bg-gray-100 active:bg-gray-200"
                      )}
                    >
                      <Icon className="h-6 w-6 flex-shrink-0" />
                      <span className="font-medium">{item.label}</span>
                      {isActive && (
                        <motion.div
                          layoutId="activeIndicator"
                          className="w-2 h-2 bg-white rounded-full ml-auto"
                        />
                      )}
                    </motion.button>
                  );
                })}
              </nav>

              {/* User Profile Section */}
              {user && (
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 safe-area-bottom">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                    <Avatar className="h-10 w-10">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.name} className="rounded-full" />
                      ) : (
                        <div className="bg-blue-600 text-white font-medium rounded-full flex items-center justify-center h-full w-full">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{user.name}</p>
                      <p className="text-sm text-gray-600 truncate">{user.role}</p>
                    </div>
                    <Button variant="ghost" size="icon-sm">
                      <Cog6ToothIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom Navigation (Alternative Mobile Pattern) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-bottom z-30">
        <div className="grid grid-cols-5 px-2 py-2">
          {navigationItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={cn(
                  "flex flex-col items-center gap-1 py-2 px-1 rounded-lg transition-all duration-200 touch-target",
                  isActive 
                    ? "text-blue-600 bg-blue-50" 
                    : "text-gray-600 hover:text-gray-900 active:bg-gray-100"
                )}
              >
                <Icon className={cn("h-6 w-6", isActive && "scale-110")} />
                <span className="text-xs font-medium truncate max-w-full">
                  {item.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="bottomActiveIndicator"
                    className="w-4 h-0.5 bg-blue-600 rounded-full"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default MobileNavigation;