import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ResourceCalendar } from '../../frontend/src/components/resource-planning/ResourceCalendar';
import { CapacityChart } from '../../frontend/src/components/resource-planning/CapacityChart';
import { SkillMatrix } from '../../frontend/src/components/resource-planning/SkillMatrix';
import { ResourceOptimizer } from '../../frontend/src/components/resource-planning/ResourceOptimizer';

// Mock dependencies
jest.mock('../../frontend/src/services/projectService', () => ({
  resourcePlanningService: {
    getCapacityData: jest.fn(),
    getOptimizationSuggestions: jest.fn(),
    getConflicts: jest.fn(),
    getForecasts: jest.fn()
  }
}));

describe('ResourceCalendar', () => {
  const mockAssignments = [
    {
      id: 1,
      employeeId: 1,
      employeeName: 'John Doe',
      projectId: 1,
      projectName: 'Project Alpha',
      startDate: '2024-01-01',
      endDate: '2024-01-15',
      allocatedHours: 40,
      role: 'Developer'
    },
    {
      id: 2,
      employeeId: 2,
      employeeName: 'Jane Smith',
      projectId: 2,
      projectName: 'Project Beta',
      startDate: '2024-01-08',
      endDate: '2024-01-22',
      allocatedHours: 30,
      role: 'Designer'
    }
  ];

  it('should render resource calendar with assignments', () => {
    render(<ResourceCalendar assignments={mockAssignments} />);
    
    expect(screen.getByText('Resource Calendar')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Project Alpha')).toBeInTheDocument();
    expect(screen.getByText('Project Beta')).toBeInTheDocument();
  });

  it('should display Gantt-style timeline bars', () => {
    render(<ResourceCalendar assignments={mockAssignments} />);
    
    const timelineBars = screen.getAllByTestId('timeline-bar');
    expect(timelineBars).toHaveLength(2);
  });

  it('should handle drag and drop for assignment rescheduling', async () => {
    const onAssignmentChange = jest.fn();
    render(
      <ResourceCalendar 
        assignments={mockAssignments} 
        onAssignmentChange={onAssignmentChange}
        editable={true}
      />
    );
    
    const timelineBar = screen.getAllByTestId('timeline-bar')[0];
    
    fireEvent.dragStart(timelineBar);
    fireEvent.dragEnd(timelineBar);
    
    await waitFor(() => {
      expect(onAssignmentChange).toHaveBeenCalled();
    });
  });

  it('should highlight conflicts in red', () => {
    const conflictingAssignments = [
      ...mockAssignments,
      {
        id: 3,
        employeeId: 1, // Same employee as assignment 1
        employeeName: 'John Doe',
        projectId: 3,
        projectName: 'Project Gamma',
        startDate: '2024-01-10', // Overlaps with assignment 1
        endDate: '2024-01-20',
        allocatedHours: 40,
        role: 'Developer',
        hasConflict: true
      }
    ];
    
    render(<ResourceCalendar assignments={conflictingAssignments} />);
    
    const conflictBar = screen.getByTestId('conflict-assignment-3');
    expect(conflictBar).toHaveClass('bg-red-500');
  });
});

describe('CapacityChart', () => {
  const mockCapacityData = [
    {
      employeeId: 1,
      employeeName: 'John Doe',
      totalCapacity: 40,
      allocatedHours: 35,
      utilization: 0.875,
      availableHours: 5
    },
    {
      employeeId: 2,
      employeeName: 'Jane Smith',
      totalCapacity: 40,
      allocatedHours: 45,
      utilization: 1.125,
      availableHours: -5
    }
  ];

  it('should render capacity utilization chart', () => {
    render(<CapacityChart data={mockCapacityData} />);
    
    expect(screen.getByText('Capacity Utilization')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('should show utilization percentages', () => {
    render(<CapacityChart data={mockCapacityData} />);
    
    expect(screen.getByText('87.5%')).toBeInTheDocument();
    expect(screen.getByText('112.5%')).toBeInTheDocument();
  });

  it('should highlight over-utilized employees in red', () => {
    render(<CapacityChart data={mockCapacityData} />);
    
    const overUtilizedBar = screen.getByTestId('capacity-bar-2');
    expect(overUtilizedBar).toHaveClass('bg-red-500');
  });

  it('should show available hours tooltip on hover', async () => {
    render(<CapacityChart data={mockCapacityData} />);
    
    const capacityBar = screen.getByTestId('capacity-bar-1');
    fireEvent.mouseEnter(capacityBar);
    
    await waitFor(() => {
      expect(screen.getByText('5 hours available')).toBeInTheDocument();
    });
  });
});

describe('SkillMatrix', () => {
  const mockEmployees = [
    { id: 1, name: 'John Doe', skills: ['TypeScript', 'React', 'Node.js'] },
    { id: 2, name: 'Jane Smith', skills: ['Python', 'Django', 'PostgreSQL'] }
  ];

  const mockProjects = [
    { id: 1, name: 'Project Alpha', requiredSkills: ['TypeScript', 'React'] },
    { id: 2, name: 'Project Beta', requiredSkills: ['Python', 'PostgreSQL'] }
  ];

  it('should render skill matrix grid', () => {
    render(<SkillMatrix employees={mockEmployees} projects={mockProjects} />);
    
    expect(screen.getByText('Skill Matrix')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('Python')).toBeInTheDocument();
  });

  it('should show skill match indicators', () => {
    render(<SkillMatrix employees={mockEmployees} projects={mockProjects} />);
    
    const skillMatches = screen.getAllByTestId(/skill-match-/);
    expect(skillMatches.length).toBeGreaterThan(0);
  });

  it('should filter by skill when skill is clicked', () => {
    const onSkillFilter = jest.fn();
    render(
      <SkillMatrix 
        employees={mockEmployees} 
        projects={mockProjects}
        onSkillFilter={onSkillFilter}
      />
    );
    
    fireEvent.click(screen.getByText('TypeScript'));
    expect(onSkillFilter).toHaveBeenCalledWith('TypeScript');
  });

  it('should show skill gap warnings', () => {
    const projectsWithGaps = [
      {
        id: 1,
        name: 'Project Alpha',
        requiredSkills: ['TypeScript', 'React', 'Kubernetes'] // Kubernetes not available
      }
    ];
    
    render(<SkillMatrix employees={mockEmployees} projects={projectsWithGaps} />);
    
    expect(screen.getByTestId('skill-gap-warning')).toBeInTheDocument();
  });
});

describe('ResourceOptimizer', () => {
  const mockOptimizationData = {
    recommendations: [
      {
        type: 'reassignment',
        employeeId: 1,
        fromProjectId: 1,
        toProjectId: 2,
        reason: 'Better skill match',
        expectedImprovement: 15
      },
      {
        type: 'capacity_adjustment',
        employeeId: 2,
        adjustment: -10,
        reason: 'Over-allocated',
        expectedImprovement: 8
      }
    ],
    totalImprovement: 23,
    riskLevel: 'low'
  };

  it('should render optimization suggestions', () => {
    render(<ResourceOptimizer data={mockOptimizationData} />);
    
    expect(screen.getByText('Resource Optimization')).toBeInTheDocument();
    expect(screen.getByText('AI-Powered Suggestions')).toBeInTheDocument();
    expect(screen.getByText('Better skill match')).toBeInTheDocument();
    expect(screen.getByText('Over-allocated')).toBeInTheDocument();
  });

  it('should show expected improvement percentages', () => {
    render(<ResourceOptimizer data={mockOptimizationData} />);
    
    expect(screen.getByText('15% improvement')).toBeInTheDocument();
    expect(screen.getByText('8% improvement')).toBeInTheDocument();
    expect(screen.getByText('Total: 23% improvement')).toBeInTheDocument();
  });

  it('should allow accepting recommendations', async () => {
    const onAcceptRecommendation = jest.fn();
    render(
      <ResourceOptimizer 
        data={mockOptimizationData}
        onAcceptRecommendation={onAcceptRecommendation}
      />
    );
    
    const acceptButton = screen.getAllByText('Accept')[0];
    fireEvent.click(acceptButton);
    
    await waitFor(() => {
      expect(onAcceptRecommendation).toHaveBeenCalledWith(mockOptimizationData.recommendations[0]);
    });
  });

  it('should show risk indicators', () => {
    const highRiskData = {
      ...mockOptimizationData,
      riskLevel: 'high'
    };
    
    render(<ResourceOptimizer data={highRiskData} />);
    
    expect(screen.getByTestId('risk-indicator-high')).toBeInTheDocument();
  });

  it('should display confidence scores for recommendations', () => {
    const dataWithConfidence = {
      ...mockOptimizationData,
      recommendations: mockOptimizationData.recommendations.map(rec => ({
        ...rec,
        confidence: 0.85
      }))
    };
    
    render(<ResourceOptimizer data={dataWithConfidence} />);
    
    expect(screen.getByText('85% confidence')).toBeInTheDocument();
  });
});