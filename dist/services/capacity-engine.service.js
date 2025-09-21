"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CapacityEngineService = void 0;
class CapacityEngineService {
    constructor(resourceAssignmentService, projectService) {
        this.resourceAssignmentService = resourceAssignmentService;
        this.projectService = projectService;
    }
    async calculateEmployeeAvailability(employeeId, startDate, endDate) {
        const assignments = await this.resourceAssignmentService.getAssignmentsByEmployee(String(employeeId));
        const workingDays = this.calculateWorkingDays(startDate, endDate);
        const totalHours = workingDays * 8;
        let allocatedHours = 0;
        const conflicts = await this.detectConflicts(assignments);
        const timeSlots = this.createTimeSlots(startDate, endDate);
        assignments.forEach(assignment => {
            const assignmentSlots = this.getAssignmentTimeSlots(assignment, timeSlots);
            assignmentSlots.forEach(slot => {
                slot.allocatedHours = (slot.allocatedHours || 0) + assignment.allocatedHours / workingDays;
            });
        });
        allocatedHours = timeSlots.reduce((total, slot) => total + (slot.allocatedHours || 0), 0);
        return {
            employeeId,
            totalHours,
            allocatedHours: Math.round(allocatedHours),
            availableHours: Math.round(totalHours - allocatedHours),
            utilizationRate: allocatedHours / totalHours,
            conflicts
        };
    }
    async findSkillMatches(requiredSkills, employees) {
        const matches = [];
        for (const employee of employees) {
            const employeeSkills = employee.skills || [];
            const matchedSkills = requiredSkills.filter(skill => employeeSkills.includes(skill));
            const missingSkills = requiredSkills.filter(skill => !employeeSkills.includes(skill));
            const matchScore = matchedSkills.length / requiredSkills.length;
            const confidence = this.calculateSkillMatchConfidence(matchedSkills, missingSkills, employee);
            matches.push({
                employee,
                matchScore,
                matchedSkills,
                missingSkills,
                confidence
            });
        }
        return matches.sort((a, b) => b.matchScore - a.matchScore);
    }
    async optimizeResourceAllocation(requirements) {
        const availableEmployees = await this.resourceAssignmentService.getAllEmployees();
        const skillMatches = await this.findSkillMatches(requirements.requiredSkills, availableEmployees);
        const recommendations = [];
        let remainingEffort = requirements.effortHours;
        let totalCost = 0;
        let estimatedCompletionTime = 0;
        for (const match of skillMatches) {
            if (remainingEffort <= 0)
                break;
            const employee = match.employee;
            const weeklyCapacity = employee.weeklyCapacity || 40;
            const maxAllocation = Math.min(remainingEffort, weeklyCapacity * (requirements.duration / 7));
            if (maxAllocation > 0) {
                const allocation = Math.min(maxAllocation, remainingEffort);
                const hourlyCost = employee.hourlyCost || 75;
                recommendations.push({
                    employeeId: employee.id,
                    projectId: requirements.projectId,
                    role: this.suggestRole(match.matchedSkills, requirements.requiredSkills),
                    allocatedHours: allocation,
                    confidence: match.confidence,
                    reasoning: `${Math.round(match.matchScore * 100)}% skill match, ${match.matchedSkills.join(', ')}`
                });
                remainingEffort -= allocation;
                totalCost += allocation * hourlyCost;
                estimatedCompletionTime = Math.max(estimatedCompletionTime, allocation / weeklyCapacity);
            }
        }
        const feasible = remainingEffort <= 0;
        const conflicts = feasible ? [] : await this.identifyPotentialConflicts(recommendations);
        return {
            recommendations,
            totalCost,
            completionTime: estimatedCompletionTime,
            feasible,
            conflicts,
            efficiency: feasible ? 1 - (remainingEffort / requirements.effortHours) : 0
        };
    }
    async detectConflicts(assignments) {
        const conflicts = [];
        const employeeAssignments = new Map();
        assignments.forEach(assignment => {
            const employeeId = assignment.employeeId;
            if (!employeeAssignments.has(employeeId)) {
                employeeAssignments.set(employeeId, []);
            }
            employeeAssignments.get(employeeId).push(assignment);
        });
        for (const [employeeId, empAssignments] of employeeAssignments) {
            for (let i = 0; i < empAssignments.length; i++) {
                for (let j = i + 1; j < empAssignments.length; j++) {
                    const assignment1 = empAssignments[i];
                    const assignment2 = empAssignments[j];
                    const overlap = this.calculateOverlap(assignment1, assignment2);
                    if (overlap.days > 0) {
                        const overAllocation = this.calculateOverAllocation(assignment1, assignment2, overlap.days);
                        conflicts.push({
                            conflictType: overAllocation > 40 ? 'overallocation' : 'overlap',
                            assignmentIds: [assignment1.id, assignment2.id],
                            overlapDays: overlap.days,
                            overAllocationHours: overAllocation,
                            severity: this.assessConflictSeverity(overAllocation, overlap.days)
                        });
                    }
                }
            }
            empAssignments.forEach(assignment => {
                const weeklyHours = assignment.allocatedHours;
                if (weeklyHours > 40) {
                    conflicts.push({
                        conflictType: 'overallocation',
                        assignmentIds: [assignment.id],
                        overlapDays: 0,
                        overAllocationHours: weeklyHours - 40,
                        severity: this.assessConflictSeverity(weeklyHours - 40, 0)
                    });
                }
            });
        }
        return conflicts;
    }
    calculateWorkingDays(startDate, endDate) {
        let workingDays = 0;
        const current = new Date(startDate);
        while (current <= endDate) {
            const dayOfWeek = current.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                workingDays++;
            }
            current.setDate(current.getDate() + 1);
        }
        return workingDays;
    }
    createTimeSlots(startDate, endDate) {
        const slots = [];
        const current = new Date(startDate);
        while (current <= endDate) {
            if (current.getDay() !== 0 && current.getDay() !== 6) {
                slots.push({
                    date: new Date(current),
                    allocatedHours: 0
                });
            }
            current.setDate(current.getDate() + 1);
        }
        return slots;
    }
    getAssignmentTimeSlots(assignment, timeSlots) {
        const assignmentStart = new Date(assignment.startDate);
        const assignmentEnd = new Date(assignment.endDate);
        return timeSlots.filter(slot => slot.date >= assignmentStart && slot.date <= assignmentEnd);
    }
    calculateSkillMatchConfidence(matchedSkills, missingSkills, employee) {
        let confidence = matchedSkills.length / (matchedSkills.length + missingSkills.length);
        if (employee.seniority === 'senior')
            confidence += 0.1;
        if (employee.seniority === 'junior')
            confidence -= 0.05;
        if (employee.successRate && employee.successRate > 0.9)
            confidence += 0.05;
        return Math.min(1, Math.max(0, confidence));
    }
    suggestRole(matchedSkills, requiredSkills) {
        if (matchedSkills.includes('React') || matchedSkills.includes('Vue.js') || matchedSkills.includes('Angular')) {
            return 'Frontend Developer';
        }
        if (matchedSkills.includes('Node.js') || matchedSkills.includes('Python') || matchedSkills.includes('Java')) {
            return 'Backend Developer';
        }
        if (matchedSkills.includes('PostgreSQL') || matchedSkills.includes('MongoDB') || matchedSkills.includes('MySQL')) {
            return 'Database Developer';
        }
        if (matchedSkills.includes('Docker') || matchedSkills.includes('Kubernetes') || matchedSkills.includes('AWS')) {
            return 'DevOps Engineer';
        }
        return 'Developer';
    }
    async identifyPotentialConflicts(recommendations) {
        const conflicts = [];
        const employeeHours = new Map();
        recommendations.forEach(rec => {
            const current = employeeHours.get(rec.employeeId) || 0;
            employeeHours.set(rec.employeeId, current + rec.allocatedHours);
        });
        employeeHours.forEach((hours, employeeId) => {
            if (hours > 40) {
                conflicts.push({
                    conflictType: 'overallocation',
                    assignmentIds: recommendations
                        .filter(r => r.employeeId === employeeId)
                        .map(r => r.projectId),
                    overlapDays: 0,
                    overAllocationHours: hours - 40,
                    severity: hours > 50 ? 'high' : 'medium'
                });
            }
        });
        return conflicts;
    }
    calculateOverlap(assignment1, assignment2) {
        const start1 = new Date(assignment1.startDate);
        const end1 = new Date(assignment1.endDate);
        const start2 = new Date(assignment2.startDate);
        const end2 = new Date(assignment2.endDate);
        const overlapStart = new Date(Math.max(start1.getTime(), start2.getTime()));
        const overlapEnd = new Date(Math.min(end1.getTime(), end2.getTime()));
        if (overlapStart <= overlapEnd) {
            const overlapMs = overlapEnd.getTime() - overlapStart.getTime();
            const overlapDays = Math.ceil(overlapMs / (1000 * 60 * 60 * 24));
            return { days: overlapDays };
        }
        return { days: 0 };
    }
    calculateOverAllocation(assignment1, assignment2, overlapDays) {
        if (overlapDays === 0)
            return 0;
        const totalHours1 = assignment1.allocatedHours || 0;
        const totalHours2 = assignment2.allocatedHours || 0;
        const duration1 = this.calculateWorkingDays(new Date(assignment1.startDate), new Date(assignment1.endDate));
        const duration2 = this.calculateWorkingDays(new Date(assignment2.startDate), new Date(assignment2.endDate));
        const weeklyHours1 = (totalHours1 / duration1) * 5;
        const weeklyHours2 = (totalHours2 / duration2) * 5;
        return Math.max(0, (weeklyHours1 + weeklyHours2) - 40);
    }
    assessConflictSeverity(overAllocationHours, overlapDays) {
        if (overAllocationHours > 15 || overlapDays > 10)
            return 'high';
        if (overAllocationHours > 5 || overlapDays > 5)
            return 'medium';
        return 'low';
    }
}
exports.CapacityEngineService = CapacityEngineService;
//# sourceMappingURL=capacity-engine.service.js.map