import React from 'react';
import WeeklyScheduleGrid from '../components/schedule/WeeklyScheduleGrid';

const SchedulePage: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="schedule-page">
      <h1 className="text-2xl font-bold text-gray-900 mb-6" data-testid="schedule-title">
        Resource Schedule
      </h1>
      <WeeklyScheduleGrid />
    </div>
  );
};

export default SchedulePage;