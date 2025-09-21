import React from 'react';

const Dashboard: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="dashboard-page">
      <h1 className="text-2xl font-bold text-gray-900 mb-4" data-testid="dashboard-title">
        Dashboard
      </h1>
      <p className="text-gray-600 mb-8" data-testid="dashboard-subtitle">
        ResourceForge - Intelligent Resource Planning & Capacity Management
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" data-testid="dashboard-stats">
        <div className="bg-white p-6 rounded-lg shadow" data-testid="employees-stat">
          <h3 className="text-lg font-medium text-gray-900">Employees</h3>
          <p className="text-3xl font-bold text-blue-600" data-testid="employees-count">3</p>
          <p className="text-sm text-gray-500">Total team members</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow" data-testid="projects-stat">
          <h3 className="text-lg font-medium text-gray-900">Projects</h3>
          <p className="text-3xl font-bold text-green-600" data-testid="projects-count">7</p>
          <p className="text-sm text-gray-500">Active projects</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow" data-testid="utilization-stat">
          <h3 className="text-lg font-medium text-gray-900">Utilization</h3>
          <p className="text-3xl font-bold text-orange-600" data-testid="utilization-percent">78%</p>
          <p className="text-sm text-gray-500">Team capacity</p>
        </div>
      </div>

      <div className="mt-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <a
            href="/employees"
            className="bg-blue-50 hover:bg-blue-100 p-4 rounded-lg border-2 border-blue-200 transition-colors"
          >
            <h3 className="font-medium text-blue-900">Manage Employees</h3>
            <p className="text-sm text-blue-600 mt-1">Add, edit, or view team members</p>
          </a>
          <a
            href="/projects"
            className="bg-green-50 hover:bg-green-100 p-4 rounded-lg border-2 border-green-200 transition-colors"
          >
            <h3 className="font-medium text-green-900">Manage Projects</h3>
            <p className="text-sm text-green-600 mt-1">Create and track project progress</p>
          </a>
          <a
            href="/allocations"
            className="bg-orange-50 hover:bg-orange-100 p-4 rounded-lg border-2 border-orange-200 transition-colors"
          >
            <h3 className="font-medium text-orange-900">Resource Allocations</h3>
            <p className="text-sm text-orange-600 mt-1">Assign resources to projects</p>
          </a>
          <a
            href="/schedule"
            className="bg-purple-50 hover:bg-purple-100 p-4 rounded-lg border-2 border-purple-200 transition-colors"
          >
            <h3 className="font-medium text-purple-900">View Schedule</h3>
            <p className="text-sm text-purple-600 mt-1">See weekly resource schedules</p>
          </a>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;