import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryProvider } from '@/contexts/QueryProvider';
import { ErrorBoundary } from '@/contexts/ErrorBoundary';
import { EmployeeList } from '@/components/employees/EmployeeList';
import type { Employee } from '@/types/employee';

function EmployeeManagement() {
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <EmployeeList 
          onEmployeeSelect={setSelectedEmployee}
          selectedEmployeeId={selectedEmployee?.id}
        />
      </div>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryProvider>
        <Router>
          <div className="min-h-screen bg-background font-sans antialiased">
            <Routes>
              <Route path="/" element={<Navigate to="/employees" replace />} />
              <Route path="/employees" element={<EmployeeManagement />} />
              <Route path="*" element={<Navigate to="/employees" replace />} />
            </Routes>
          </div>
        </Router>
      </QueryProvider>
    </ErrorBoundary>
  );
}

export default App;