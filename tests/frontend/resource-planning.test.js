"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
require("@testing-library/jest-dom");
const ResourceCalendar_1 = require("../../frontend/src/components/resource-planning/ResourceCalendar");
const CapacityChart_1 = require("../../frontend/src/components/resource-planning/CapacityChart");
const SkillMatrix_1 = require("../../frontend/src/components/resource-planning/SkillMatrix");
const ResourceOptimizer_1 = require("../../frontend/src/components/resource-planning/ResourceOptimizer");
({
    resourcePlanningService: {
        getCapacityData: undefined,
        describe() { }
    }()
});
{
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
        (0, react_2.render)(<ResourceCalendar_1.ResourceCalendar assignments={mockAssignments}/>);
        expect(react_2.screen.getByText('Resource Calendar')).toBeInTheDocument();
        expect(react_2.screen.getByText('John Doe')).toBeInTheDocument();
        expect(react_2.screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(react_2.screen.getByText('Project Alpha')).toBeInTheDocument();
        expect(react_2.screen.getByText('Project Beta')).toBeInTheDocument();
    });
    it('should display Gantt-style timeline bars', () => {
        (0, react_2.render)(<ResourceCalendar_1.ResourceCalendar assignments={mockAssignments}/>);
        const timelineBars = react_2.screen.getAllByTestId('timeline-bar');
        expect(timelineBars).toHaveLength(2);
    });
    it('should handle drag and drop for assignment rescheduling', async () => {
        const onAssignmentChange = undefined;
        (0, react_2.render)(<ResourceCalendar_1.ResourceCalendar assignments={mockAssignments} onAssignmentChange={onAssignmentChange} editable={true}/>);
        const timelineBar = react_2.screen.getAllByTestId('timeline-bar')[0];
        react_2.fireEvent.dragStart(timelineBar);
        react_2.fireEvent.dragEnd(timelineBar);
        await (0, react_2.waitFor)(() => {
            expect(onAssignmentChange).toHaveBeenCalled();
        });
    });
    it('should highlight conflicts in red', () => {
        const conflictingAssignments = [
            ...mockAssignments,
            {
                id: 3,
                employeeId: 1,
                employeeName: 'John Doe',
                projectId: 3,
                projectName: 'Project Gamma',
                startDate: '2024-01-10',
                endDate: '2024-01-20',
                allocatedHours: 40,
                role: 'Developer',
                hasConflict: true
            }
        ];
        (0, react_2.render)(<ResourceCalendar_1.ResourceCalendar assignments={conflictingAssignments}/>);
        const conflictBar = react_2.screen.getByTestId('conflict-assignment-3');
        expect(conflictBar).toHaveClass('bg-red-500');
    });
}
;
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
        (0, react_2.render)(<CapacityChart_1.CapacityChart data={mockCapacityData}/>);
        expect(react_2.screen.getByText('Capacity Utilization')).toBeInTheDocument();
        expect(react_2.screen.getByText('John Doe')).toBeInTheDocument();
        expect(react_2.screen.getByText('Jane Smith')).toBeInTheDocument();
    });
    it('should show utilization percentages', () => {
        (0, react_2.render)(<CapacityChart_1.CapacityChart data={mockCapacityData}/>);
        expect(react_2.screen.getByText('87.5%')).toBeInTheDocument();
        expect(react_2.screen.getByText('112.5%')).toBeInTheDocument();
    });
    it('should highlight over-utilized employees in red', () => {
        (0, react_2.render)(<CapacityChart_1.CapacityChart data={mockCapacityData}/>);
        const overUtilizedBar = react_2.screen.getByTestId('capacity-bar-2');
        expect(overUtilizedBar).toHaveClass('bg-red-500');
    });
    it('should show available hours tooltip on hover', async () => {
        (0, react_2.render)(<CapacityChart_1.CapacityChart data={mockCapacityData}/>);
        const capacityBar = react_2.screen.getByTestId('capacity-bar-1');
        react_2.fireEvent.mouseEnter(capacityBar);
        await (0, react_2.waitFor)(() => {
            expect(react_2.screen.getByText('5 hours available')).toBeInTheDocument();
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
        (0, react_2.render)(<SkillMatrix_1.SkillMatrix employees={mockEmployees} projects={mockProjects}/>);
        expect(react_2.screen.getByText('Skill Matrix')).toBeInTheDocument();
        expect(react_2.screen.getByText('John Doe')).toBeInTheDocument();
        expect(react_2.screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(react_2.screen.getByText('TypeScript')).toBeInTheDocument();
        expect(react_2.screen.getByText('Python')).toBeInTheDocument();
    });
    it('should show skill match indicators', () => {
        (0, react_2.render)(<SkillMatrix_1.SkillMatrix employees={mockEmployees} projects={mockProjects}/>);
        const skillMatches = react_2.screen.getAllByTestId(/skill-match-/);
        expect(skillMatches.length).toBeGreaterThan(0);
    });
    it('should filter by skill when skill is clicked', () => {
        const onSkillFilter = undefined;
        (0, react_2.render)(<SkillMatrix_1.SkillMatrix employees={mockEmployees} projects={mockProjects} onSkillFilter={onSkillFilter}/>);
        react_2.fireEvent.click(react_2.screen.getByText('TypeScript'));
        expect(onSkillFilter).toHaveBeenCalledWith('TypeScript');
    });
    it('should show skill gap warnings', () => {
        const projectsWithGaps = [
            {
                id: 1,
                name: 'Project Alpha',
                requiredSkills: ['TypeScript', 'React', 'Kubernetes']
            }
        ];
        (0, react_2.render)(<SkillMatrix_1.SkillMatrix employees={mockEmployees} projects={projectsWithGaps}/>);
        expect(react_2.screen.getByTestId('skill-gap-warning')).toBeInTheDocument();
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
        (0, react_2.render)(<ResourceOptimizer_1.ResourceOptimizer data={mockOptimizationData}/>);
        expect(react_2.screen.getByText('Resource Optimization')).toBeInTheDocument();
        expect(react_2.screen.getByText('AI-Powered Suggestions')).toBeInTheDocument();
        expect(react_2.screen.getByText('Better skill match')).toBeInTheDocument();
        expect(react_2.screen.getByText('Over-allocated')).toBeInTheDocument();
    });
    it('should show expected improvement percentages', () => {
        (0, react_2.render)(<ResourceOptimizer_1.ResourceOptimizer data={mockOptimizationData}/>);
        expect(react_2.screen.getByText('15% improvement')).toBeInTheDocument();
        expect(react_2.screen.getByText('8% improvement')).toBeInTheDocument();
        expect(react_2.screen.getByText('Total: 23% improvement')).toBeInTheDocument();
    });
    it('should allow accepting recommendations', async () => {
        const onAcceptRecommendation = undefined;
        (0, react_2.render)(<ResourceOptimizer_1.ResourceOptimizer data={mockOptimizationData} onAcceptRecommendation={onAcceptRecommendation}/>);
        const acceptButton = react_2.screen.getAllByText('Accept')[0];
        react_2.fireEvent.click(acceptButton);
        await (0, react_2.waitFor)(() => {
            expect(onAcceptRecommendation).toHaveBeenCalledWith(mockOptimizationData.recommendations[0]);
        });
    });
    it('should show risk indicators', () => {
        const highRiskData = {
            ...mockOptimizationData,
            riskLevel: 'high'
        };
        (0, react_2.render)(<ResourceOptimizer_1.ResourceOptimizer data={highRiskData}/>);
        expect(react_2.screen.getByTestId('risk-indicator-high')).toBeInTheDocument();
    });
    it('should display confidence scores for recommendations', () => {
        const dataWithConfidence = {
            ...mockOptimizationData,
            recommendations: mockOptimizationData.recommendations.map(rec => ({
                ...rec,
                confidence: 0.85
            }))
        };
        (0, react_2.render)(<ResourceOptimizer_1.ResourceOptimizer data={dataWithConfidence}/>);
        expect(react_2.screen.getByText('85% confidence')).toBeInTheDocument();
    });
});
//# sourceMappingURL=resource-planning.test.js.map