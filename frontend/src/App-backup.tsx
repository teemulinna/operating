// Backup of original App.tsx for reference
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from './components/ui/toast-provider';
import ErrorBoundary from './components/error/ErrorBoundary';
import { EmployeeManagement } from './features/employees';
import { AllocationManagement } from './features/allocations/AllocationManagement';
import { ProjectManagement } from './features/projects/ProjectManagement';
import { AllocationsPage } from './components/pages/AllocationsPage';
import { ReportsPage } from './components/pages/ReportsPage';
import { PlanningPage } from './components/pages/PlanningPage';
import { TeamDashboard } from './components/pages/TeamDashboard';
// Weekly Schedule imports
import WeeklyScheduleGrid from './components/schedule/WeeklyScheduleGrid';
import EnhancedSchedulePage from './pages/EnhancedSchedulePage';
import ResourceAllocationForm from './components/allocations/ResourceAllocationForm';
import { apiService } from './services/api';