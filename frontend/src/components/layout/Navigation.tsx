import React from 'react';
import { NavLink } from 'react-router-dom';

const Navigation: React.FC = () => {
  const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? 'text-blue-600 border-blue-600 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium'
      : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium transition-colors';

  return (
    <nav className="bg-white shadow" data-testid="main-navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-xl font-bold text-gray-900" data-testid="app-title">
                ResourceForge
              </h1>
            </div>
            <div className="ml-6 flex space-x-8">
              <NavLink to="/" className={navLinkClasses} data-testid="nav-dashboard">
                Dashboard
              </NavLink>
              <NavLink to="/employees" className={navLinkClasses} data-testid="nav-employees">
                Employees
              </NavLink>
              <NavLink to="/projects" className={navLinkClasses} data-testid="nav-projects">
                Projects
              </NavLink>
              <NavLink to="/allocations" className={navLinkClasses} data-testid="nav-allocations">
                Allocations
              </NavLink>
              <NavLink to="/schedule" className={navLinkClasses} data-testid="nav-schedule">
                Schedule
              </NavLink>
              <NavLink to="/enhanced-schedule" className={navLinkClasses} data-testid="nav-enhanced-schedule">
                Enhanced Schedule
              </NavLink>
              <NavLink to="/reports" className={navLinkClasses} data-testid="nav-reports">
                Reports
              </NavLink>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;