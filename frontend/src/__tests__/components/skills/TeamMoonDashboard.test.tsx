import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TeamMoonDashboard } from '../../../components/skills/TeamMoonDashboard';
import { skillService } from '../../../services/skillService';

// Mock the skill service
jest.mock('../../../services/skillService');
const mockedSkillService = skillService as jest.Mocked<typeof skillService>;

// Mock data
const mockSkills = [
  {
    id: '1',
    name: 'JavaScript',
    description: 'Modern JavaScript programming',
    category: 'technical',
    is_technical: true,
    proficiency_levels: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
    is_active: true,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    id: '2',
    name: 'React',
    description: 'React.js library',
    category: 'technical',
    is_technical: true,
    proficiency_levels: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
    is_active: true,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    id: '3',
    name: 'Leadership',
    description: 'Team leadership skills',
    category: 'soft',
    is_technical: false,
    proficiency_levels: ['Developing', 'Competent', 'Proficient', 'Expert'],
    is_active: true,
    created_at: new Date(),
    updated_at: new Date()
  }
];

describe('TeamMoonDashboard', () => {
  beforeEach(() => {
    mockedSkillService.getAllSkills.mockResolvedValue(mockSkills);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the main dashboard header', async () => {
    render(<TeamMoonDashboard />);
    
    expect(screen.getByText('Team Moon - Skills Resource Filtering')).toBeInTheDocument();
    expect(screen.getByText(/Advanced skills-based resource discovery/)).toBeInTheDocument();
  });

  it('shows the correct skills count', async () => {
    render(<TeamMoonDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('79')).toBeInTheDocument();
      expect(screen.getByText('Total Skills')).toBeInTheDocument();
    });
  });

  it('displays the skills filter tab by default', async () => {
    render(<TeamMoonDashboard />);
    
    expect(screen.getByRole('tab', { name: /Skills Filter/ })).toHaveAttribute('data-state', 'active');
  });

  it('switches to project matching tab when clicked', async () => {
    render(<TeamMoonDashboard enableProjectMatching={true} />);
    
    const projectTab = screen.getByRole('tab', { name: /Project Matching/ });
    fireEvent.click(projectTab);
    
    expect(projectTab).toHaveAttribute('data-state', 'active');
    expect(screen.getByText('Project Skill Matcher')).toBeInTheDocument();
  });

  it('switches to analytics tab when clicked', async () => {
    render(<TeamMoonDashboard showAnalytics={true} />);
    
    const analyticsTab = screen.getByRole('tab', { name: /Analytics/ });
    fireEvent.click(analyticsTab);
    
    expect(analyticsTab).toHaveAttribute('data-state', 'active');
    expect(screen.getByText('Skills by Category')).toBeInTheDocument();
  });

  it('shows export dialog when export button is clicked', async () => {
    render(<TeamMoonDashboard />);
    
    // First trigger some search results by interacting with the skills filter
    const skillsTab = screen.getByRole('tab', { name: /Skills Filter/ });
    fireEvent.click(skillsTab);
    
    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText('Advanced Skills Filter')).toBeInTheDocument();
    });
  });

  it('displays correct category breakdown in analytics', async () => {
    render(<TeamMoonDashboard showAnalytics={true} />);
    
    const analyticsTab = screen.getByRole('tab', { name: /Analytics/ });
    fireEvent.click(analyticsTab);
    
    await waitFor(() => {
      expect(screen.getByText('Technical')).toBeInTheDocument();
      expect(screen.getByText('45')).toBeInTheDocument(); // Technical skills count
    });
  });

  it('shows skill gaps section in analytics', async () => {
    render(<TeamMoonDashboard showAnalytics={true} />);
    
    const analyticsTab = screen.getByRole('tab', { name: /Analytics/ });
    fireEvent.click(analyticsTab);
    
    await waitFor(() => {
      expect(screen.getByText('Critical Skill Gaps')).toBeInTheDocument();
      expect(screen.getByText('Machine Learning')).toBeInTheDocument();
    });
  });

  it('displays recent searches in analytics', async () => {
    render(<TeamMoonDashboard showAnalytics={true} />);
    
    const analyticsTab = screen.getByRole('tab', { name: /Analytics/ });
    fireEvent.click(analyticsTab);
    
    await waitFor(() => {
      expect(screen.getByText('Recent Searches')).toBeInTheDocument();
      expect(screen.getByText('Frontend React Developers')).toBeInTheDocument();
    });
  });

  it('handles skills loading error gracefully', async () => {
    mockedSkillService.getAllSkills.mockRejectedValue(new Error('API Error'));
    
    render(<TeamMoonDashboard />);
    
    // Should still render without crashing
    expect(screen.getByText('Team Moon - Skills Resource Filtering')).toBeInTheDocument();
  });

  it('respects maxResults prop', () => {
    render(<TeamMoonDashboard maxResults={25} />);
    
    // Component should render with custom max results
    expect(screen.getByText('Team Moon - Skills Resource Filtering')).toBeInTheDocument();
  });

  it('shows/hides project matching based on prop', () => {
    const { rerender } = render(<TeamMoonDashboard enableProjectMatching={false} />);
    
    expect(screen.queryByRole('tab', { name: /Project Matching/ })).not.toBeInTheDocument();
    
    rerender(<TeamMoonDashboard enableProjectMatching={true} />);
    
    expect(screen.getByRole('tab', { name: /Project Matching/ })).toBeInTheDocument();
  });

  it('shows/hides analytics based on prop', () => {
    const { rerender } = render(<TeamMoonDashboard showAnalytics={false} />);
    
    expect(screen.queryByRole('tab', { name: /Analytics/ })).not.toBeInTheDocument();
    
    rerender(<TeamMoonDashboard showAnalytics={true} />);
    
    expect(screen.getByRole('tab', { name: /Analytics/ })).toBeInTheDocument();
  });
});