"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResourceAnalyticsService = void 0;
class ResourceAnalyticsService {
    constructor(resourceAssignmentService, capacityEngine) {
        this.resourceAssignmentService = resourceAssignmentService;
        this.capacityEngine = capacityEngine;
    }
    async generateUtilizationReport(startDate, endDate) {
        const assignments = await this.resourceAssignmentService.getAssignmentsInPeriod(startDate, endDate);
        const employeeMap = new Map();
        const projectMap = new Map();
        assignments.forEach(assignment => {
            if (!employeeMap.has(assignment.employeeId)) {
                employeeMap.set(assignment.employeeId, []);
            }
            employeeMap.get(assignment.employeeId).push(assignment);
            if (!projectMap.has(assignment.projectId)) {
                projectMap.set(assignment.projectId, []);
            }
            projectMap.get(assignment.projectId).push(assignment);
        });
        const employeeUtilization = await this.calculateEmployeeUtilization(employeeMap, startDate, endDate);
        const projectUtilization = await this.calculateProjectUtilization(projectMap);
        const totalCapacity = employeeUtilization.reduce((sum, emp) => sum + emp.totalCapacity, 0);
        const totalAllocated = employeeUtilization.reduce((sum, emp) => sum + emp.allocatedHours, 0);
        const overallUtilization = totalAllocated / totalCapacity;
        const underUtilized = employeeUtilization.filter(emp => emp.utilizationRate < 0.7);
        const overUtilized = employeeUtilization.filter(emp => emp.utilizationRate > 1.0);
        const trends = await this.calculateUtilizationTrends(startDate, endDate);
        return {
            overallUtilization,
            employeeUtilization,
            projectUtilization,
            underUtilized,
            overUtilized,
            trends
        };
    }
    async analyzeSkillGaps(projects, employees) {
        const skillDemand = new Map();
        const skillSupply = new Map();
        projects.forEach(project => {
            const requiredSkills = project.requiredSkills || [];
            requiredSkills.forEach(skill => {
                skillDemand.set(skill, (skillDemand.get(skill) || 0) + 1);
            });
        });
        employees.forEach(employee => {
            const skills = employee.skills || [];
            skills.forEach(skill => {
                skillSupply.set(skill, (skillSupply.get(skill) || 0) + 1);
            });
        });
        const skillGaps = [];
        skillDemand.forEach((demand, skill) => {
            const available = skillSupply.get(skill) || 0;
            const gapSize = Math.max(0, demand - available);
            if (gapSize > 0) {
                skillGaps.push({
                    skill,
                    demandCount: demand,
                    availableCount: available,
                    gapSize,
                    criticalityScore: this.calculateCriticalityScore(skill, demand, projects)
                });
            }
        });
        skillGaps.sort((a, b) => b.criticalityScore - a.criticalityScore);
        const recommendations = await this.generateSkillRecommendations(skillGaps);
        const criticalMissingSkills = skillGaps
            .filter(gap => gap.criticalityScore >= 0.8)
            .map(gap => gap.skill);
        const trainingNeeds = await this.identifyTrainingNeeds(skillGaps, employees);
        return {
            skillGaps,
            recommendations,
            criticalMissingSkills,
            trainingNeeds
        };
    }
    async generateForecast(historicalData, forecastPeriods) {
        if (historicalData.length < 3) {
            throw new Error('Insufficient historical data for forecasting (minimum 3 periods required)');
        }
        const periods = historicalData.length;
        const values = historicalData.map(d => d.totalHours);
        const trend = this.calculateTrend(values);
        const seasonalPattern = this.detectSeasonality(historicalData);
        const predictions = [];
        const baseValue = values[values.length - 1];
        for (let i = 1; i <= forecastPeriods; i++) {
            let predictedValue = baseValue + (trend * i);
            if (seasonalPattern) {
                const seasonalFactor = this.getSeasonalFactor(i, seasonalPattern);
                predictedValue *= seasonalFactor;
            }
            const confidence = Math.max(0.5, 1 - (i * 0.1));
            const variance = this.calculateVariance(values);
            const margin = Math.sqrt(variance) * (1 - confidence);
            predictions.push({
                period: `Period ${i}`,
                predictedHours: Math.round(predictedValue),
                confidence,
                upperBound: Math.round(predictedValue + margin),
                lowerBound: Math.round(Math.max(0, predictedValue - margin))
            });
        }
        const overallConfidence = this.calculateForecastConfidence(values, trend);
        return {
            predictions,
            confidence: overallConfidence,
            trend: this.classifyTrend(trend),
            seasonalPattern
        };
    }
    async optimizeAllocation(currentAllocations) {
        const suggestions = [];
        for (const allocation of currentAllocations) {
            if (allocation.skills && allocation.requiredSkills) {
                const skillMatch = this.calculateSkillMatchScore(allocation.skills, allocation.requiredSkills);
                if (skillMatch < 0.7) {
                    suggestions.push({
                        type: 'reassignment',
                        employeeId: allocation.employeeId,
                        fromProjectId: allocation.projectId,
                        toProjectId: await this.findBetterSkillMatch(allocation.employeeId, allocation.skills),
                        reason: `skill mismatch (${Math.round(skillMatch * 100)}% match)`,
                        expectedImprovement: (0.7 - skillMatch) * 100,
                        confidence: 0.8,
                        riskLevel: 'low'
                    });
                }
            }
            if (allocation.efficiency < 0.8) {
                const adjustment = this.calculateOptimalAdjustment(allocation);
                suggestions.push({
                    type: 'capacity_adjustment',
                    employeeId: allocation.employeeId,
                    adjustment,
                    reason: `low efficiency (${Math.round(allocation.efficiency * 100)}%)`,
                    expectedImprovement: (0.8 - allocation.efficiency) * 100,
                    confidence: 0.7,
                    riskLevel: adjustment > 10 ? 'medium' : 'low'
                });
            }
        }
        const totalImprovement = suggestions.reduce((sum, s) => sum + s.expectedImprovement, 0);
        const avgImprovement = totalImprovement / Math.max(1, suggestions.length);
        const riskAssessment = this.assessOptimizationRisks(suggestions);
        const implementation = this.createImplementationPlan(suggestions);
        return {
            suggestions: suggestions.slice(0, 10),
            expectedImprovement: avgImprovement,
            riskAssessment,
            implementation
        };
    }
    async calculateEmployeeUtilization(employeeMap, startDate, endDate) {
        const result = [];
        for (const [employeeId, assignments] of employeeMap) {
            const availability = await this.capacityEngine.calculateEmployeeAvailability(employeeId, startDate, endDate);
            const totalAllocated = assignments.reduce((sum, a) => sum + (a.allocatedHours || 0), 0);
            const totalActual = assignments.reduce((sum, a) => sum + (a.actualHours || a.allocatedHours || 0), 0);
            const projects = assignments.map(a => ({
                projectId: a.projectId,
                projectName: a.projectName || `Project ${a.projectId}`,
                allocatedHours: a.allocatedHours || 0,
                role: a.role || 'Developer'
            }));
            result.push({
                employeeId,
                employeeName: assignments[0].employeeName || `Employee ${employeeId}`,
                totalCapacity: availability.totalHours,
                allocatedHours: totalAllocated,
                actualHours: totalActual,
                utilizationRate: availability.utilizationRate,
                efficiency: totalActual > 0 ? totalAllocated / totalActual : 1,
                projects
            });
        }
        return result;
    }
    async calculateProjectUtilization(projectMap) {
        const result = [];
        for (const [projectId, assignments] of projectMap) {
            const plannedHours = assignments.reduce((sum, a) => sum + (a.allocatedHours || 0), 0);
            const actualHours = assignments.reduce((sum, a) => sum + (a.actualHours || a.allocatedHours || 0), 0);
            const teamSize = new Set(assignments.map(a => a.employeeId)).size;
            const avgUtilization = assignments.reduce((sum, a) => {
                const util = a.actualHours ? a.allocatedHours / a.actualHours : 1;
                return sum + util;
            }, 0) / assignments.length;
            result.push({
                projectId,
                projectName: assignments[0].projectName || `Project ${projectId}`,
                plannedHours,
                actualHours,
                efficiency: actualHours > 0 ? plannedHours / actualHours : 1,
                teamSize,
                avgUtilization
            });
        }
        return result;
    }
    async calculateUtilizationTrends(startDate, endDate) {
        const trends = [];
        const current = new Date(startDate);
        const monthMs = 30 * 24 * 60 * 60 * 1000;
        while (current < endDate) {
            const periodEnd = new Date(Math.min(current.getTime() + monthMs, endDate.getTime()));
            const periodAssignments = await this.resourceAssignmentService.getAssignmentsInPeriod(current, periodEnd);
            const totalHours = periodAssignments.reduce((sum, a) => sum + (a.allocatedHours || 0), 0);
            const utilization = totalHours / (160 * 10);
            trends.push({
                period: current.toISOString().substring(0, 7),
                utilization,
                change: 0
            });
            current.setTime(current.getTime() + monthMs);
        }
        for (let i = 1; i < trends.length; i++) {
            trends[i].change = trends[i].utilization - trends[i - 1].utilization;
        }
        return trends;
    }
    calculateCriticalityScore(skill, demand, projects) {
        let score = demand / projects.length;
        const highPriorityProjects = projects.filter(p => (p.requiredSkills || []).includes(skill) && p.priority === 'high').length;
        score += (highPriorityProjects / projects.length) * 0.5;
        return Math.min(1, score);
    }
    async generateSkillRecommendations(skillGaps) {
        const recommendations = [];
        for (const gap of skillGaps.slice(0, 5)) {
            if (gap.gapSize === 1 && gap.criticalityScore < 0.7) {
                recommendations.push({
                    type: 'train',
                    skill: gap.skill,
                    priority: gap.criticalityScore > 0.5 ? 'high' : 'medium',
                    estimatedCost: 2000,
                    timeline: '2-3 months',
                    reasoning: 'Small gap, training existing staff is cost-effective'
                });
            }
            else if (gap.gapSize <= 2) {
                recommendations.push({
                    type: 'contract',
                    skill: gap.skill,
                    priority: gap.criticalityScore > 0.7 ? 'critical' : 'high',
                    estimatedCost: 15000,
                    timeline: '1-2 weeks',
                    reasoning: 'Medium gap, contractor for quick solution'
                });
            }
            else {
                recommendations.push({
                    type: 'hire',
                    skill: gap.skill,
                    priority: 'critical',
                    estimatedCost: 120000,
                    timeline: '2-3 months',
                    reasoning: 'Large gap, requires permanent addition'
                });
            }
        }
        return recommendations;
    }
    async identifyTrainingNeeds(skillGaps, employees) {
        const trainingNeeds = [];
        for (const employee of employees) {
            const employeeSkills = employee.skills || [];
            const skillsToTrain = [];
            for (const gap of skillGaps) {
                if (!employeeSkills.includes(gap.skill) && this.canEmployeeLearnSkill(employee, gap.skill)) {
                    skillsToTrain.push(gap.skill);
                }
            }
            if (skillsToTrain.length > 0) {
                trainingNeeds.push({
                    employeeId: employee.id,
                    employeeName: employee.name,
                    skillsToTrain: skillsToTrain.slice(0, 3),
                    priority: skillsToTrain.length,
                    estimatedDuration: `${skillsToTrain.length * 2} weeks`,
                    cost: skillsToTrain.length * 2000
                });
            }
        }
        return trainingNeeds.sort((a, b) => b.priority - a.priority);
    }
    canEmployeeLearnSkill(employee, skill) {
        const employeeSkills = employee.skills || [];
        const relatedSkills = {
            'React': ['JavaScript', 'TypeScript', 'Vue.js'],
            'Node.js': ['JavaScript', 'TypeScript', 'Express'],
            'Python': ['JavaScript', 'Java', 'C#'],
            'PostgreSQL': ['MySQL', 'MongoDB', 'SQL Server'],
            'Kubernetes': ['Docker', 'AWS', 'DevOps']
        };
        const related = relatedSkills[skill] || [];
        return related.some(relatedSkill => employeeSkills.includes(relatedSkill));
    }
    calculateTrend(values) {
        const n = values.length;
        const x = Array.from({ length: n }, (_, i) => i);
        const meanX = x.reduce((sum, val) => sum + val, 0) / n;
        const meanY = values.reduce((sum, val) => sum + val, 0) / n;
        const numerator = x.reduce((sum, xi, i) => sum + (xi - meanX) * (values[i] - meanY), 0);
        const denominator = x.reduce((sum, xi) => sum + Math.pow(xi - meanX, 2), 0);
        return denominator !== 0 ? numerator / denominator : 0;
    }
    detectSeasonality(historicalData) {
        if (historicalData.length < 12)
            return undefined;
        const monthlyAverages = new Array(12).fill(0);
        const monthlyCounts = new Array(12).fill(0);
        historicalData.forEach(data => {
            const month = new Date(data.month + '-01').getMonth();
            monthlyAverages[month] += data.totalHours;
            monthlyCounts[month]++;
        });
        for (let i = 0; i < 12; i++) {
            if (monthlyCounts[i] > 0) {
                monthlyAverages[i] /= monthlyCounts[i];
            }
        }
        const overallAverage = monthlyAverages.reduce((sum, val) => sum + val, 0) / 12;
        const variance = monthlyAverages.reduce((sum, val) => sum + Math.pow(val - overallAverage, 2), 0) / 12;
        if (variance > overallAverage * 0.1) {
            const peakPeriods = monthlyAverages
                .map((avg, i) => ({ month: i, avg }))
                .filter(m => m.avg > overallAverage * 1.1)
                .map(m => new Date(2024, m.month, 1).toLocaleDateString('en', { month: 'long' }));
            const lowPeriods = monthlyAverages
                .map((avg, i) => ({ month: i, avg }))
                .filter(m => m.avg < overallAverage * 0.9)
                .map(m => new Date(2024, m.month, 1).toLocaleDateString('en', { month: 'long' }));
            return {
                pattern: 'monthly',
                peakPeriods,
                lowPeriods
            };
        }
        return undefined;
    }
    getSeasonalFactor(period, pattern) {
        return 1 + (Math.sin(period * Math.PI / 6) * 0.1);
    }
    calculateVariance(values) {
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    }
    calculateForecastConfidence(values, trend) {
        const variance = this.calculateVariance(values);
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const coefficientOfVariation = Math.sqrt(variance) / mean;
        let confidence = Math.max(0.5, 1 - coefficientOfVariation);
        if (Math.abs(trend) < mean * 0.05)
            confidence += 0.1;
        return Math.min(1, confidence);
    }
    classifyTrend(trend) {
        if (Math.abs(trend) < 5)
            return 'stable';
        return trend > 0 ? 'increasing' : 'decreasing';
    }
    calculateSkillMatchScore(skills, requiredSkills) {
        const matches = requiredSkills.filter(skill => skills.includes(skill));
        return matches.length / requiredSkills.length;
    }
    async findBetterSkillMatch(employeeId, skills) {
        return Math.floor(Math.random() * 10) + 1;
    }
    calculateOptimalAdjustment(allocation) {
        const targetEfficiency = 0.8;
        const currentEfficiency = allocation.efficiency;
        const currentHours = allocation.allocatedHours || 40;
        return Math.round((targetEfficiency - currentEfficiency) * currentHours);
    }
    assessOptimizationRisks(suggestions) {
        const risks = [];
        const reassignments = suggestions.filter(s => s.type === 'reassignment');
        if (reassignments.length > 3) {
            risks.push({
                type: 'organizational_disruption',
                description: 'Multiple reassignments may disrupt team dynamics',
                impact: 'medium',
                probability: 0.7
            });
        }
        const largeAdjustments = suggestions.filter(s => s.type === 'capacity_adjustment' && Math.abs(s.adjustment || 0) > 10);
        if (largeAdjustments.length > 0) {
            risks.push({
                type: 'delivery_risk',
                description: 'Large capacity changes may affect delivery timelines',
                impact: 'high',
                probability: 0.5
            });
        }
        const overallRisk = risks.length > 2 ? 'high' : risks.length > 0 ? 'medium' : 'low';
        return {
            overallRisk,
            risks,
            mitigationStrategies: [
                'Implement changes gradually over 2-4 weeks',
                'Monitor team satisfaction and productivity closely',
                'Have rollback plan ready for critical changes'
            ]
        };
    }
    createImplementationPlan(suggestions) {
        return {
            phases: [
                {
                    phase: 1,
                    description: 'Low-risk adjustments',
                    actions: suggestions
                        .filter(s => s.riskLevel === 'low')
                        .map(s => `Implement ${s.type} for employee ${s.employeeId}`),
                    duration: '1 week'
                },
                {
                    phase: 2,
                    description: 'Medium-risk changes',
                    actions: suggestions
                        .filter(s => s.riskLevel === 'medium')
                        .map(s => `Implement ${s.type} for employee ${s.employeeId}`),
                    duration: '2 weeks'
                }
            ],
            timeline: '3 weeks',
            dependencies: ['Team lead approval', 'Employee consent', 'Project manager coordination']
        };
    }
}
exports.ResourceAnalyticsService = ResourceAnalyticsService;
//# sourceMappingURL=resource-analytics.service.js.map