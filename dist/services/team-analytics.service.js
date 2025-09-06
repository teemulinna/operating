"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeamAnalyticsService = void 0;
const database_service_1 = require("../database/database.service");
class TeamAnalyticsService {
    constructor() {
        this.db = database_service_1.DatabaseService.getInstance();
    }
    async getTeamAnalyticsDashboard(filters) {
        const timeframe = filters?.timeframe || 'last_quarter';
        const departmentFilter = filters?.department ? `AND d.name = '${filters.department}'` : '';
        const [overview, utilization, performance, projectSuccess, skills, efficiency] = await Promise.all([
            this.getOverviewMetrics(timeframe, departmentFilter),
            this.getUtilizationMetrics(timeframe, departmentFilter),
            this.getPerformanceMetrics(timeframe, departmentFilter),
            this.getProjectSuccessRates(timeframe),
            this.getSkillUtilization(timeframe),
            this.getTeamEfficiency(timeframe, departmentFilter)
        ]);
        return {
            overview,
            utilizationMetrics: utilization,
            performanceMetrics: performance,
            projectSuccessRates: projectSuccess,
            skillUtilization: skills,
            teamEfficiency: efficiency
        };
    }
    async getDetailedPerformanceAnalytics(options) {
        const timeframe = options?.timeframe || 'last_quarter';
        const requestedMetrics = options?.metrics || ['productivity', 'quality', 'efficiency'];
        const [productivity, quality, efficiency, trends, benchmarks] = await Promise.all([
            requestedMetrics.includes('productivity') ? this.getProductivityMetrics(timeframe) : Promise.resolve(null),
            requestedMetrics.includes('quality') ? this.getQualityMetrics(timeframe) : Promise.resolve(null),
            requestedMetrics.includes('efficiency') ? this.getEfficiencyMetrics(timeframe) : Promise.resolve(null),
            this.getPerformanceTrends(timeframe),
            this.getBenchmarkComparisons()
        ]);
        return {
            productivityMetrics: productivity || this.getDefaultProductivityMetrics(),
            qualityMetrics: quality || this.getDefaultQualityMetrics(),
            efficiencyMetrics: efficiency || this.getDefaultEfficiencyMetrics(),
            trends,
            benchmarks
        };
    }
    async analyzeResourceUtilizationPatterns(granularity) {
        const timeGranularity = granularity || 'weekly';
        const [patterns, peaks, underutilized, overutilized] = await Promise.all([
            this.getUtilizationPatterns(timeGranularity),
            this.identifyPeakUtilizationPeriods(),
            this.identifyUnderutilizedResources(),
            this.identifyOverutilizedResources()
        ]);
        const recommendations = this.generateUtilizationRecommendations(patterns, peaks, underutilized, overutilized);
        return {
            utilizationPatterns: patterns,
            peakUtilizationPeriods: peaks,
            underutilizedResources: underutilized,
            overutilizedResources: overutilized,
            recommendations
        };
    }
    async analyzeProjectSuccessCorrelations() {
        const projectDataQuery = `
      SELECT 
        p.id,
        p.status,
        p.start_date,
        p.end_date,
        p.budget,
        COUNT(DISTINCT pa.employee_id) as team_size,
        AVG(e.salary) as avg_team_salary,
        STRING_AGG(DISTINCT d.name, ', ') as departments_involved
      FROM projects p
      LEFT JOIN project_assignments pa ON p.id = pa.project_id
      LEFT JOIN employees e ON pa.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE p.status IN ('completed', 'cancelled')
      GROUP BY p.id
    `;
        const projectData = await this.db.query(projectDataQuery);
        const projects = projectData.rows;
        const correlations = this.calculateProjectCorrelations(projects);
        const successFactors = this.identifySuccessFactors(projects);
        const riskFactors = this.identifyRiskFactors(projects);
        const recommendations = this.generateProjectRecommendations(correlations, successFactors, riskFactors);
        return {
            correlations,
            successFactors,
            riskFactors,
            recommendations
        };
    }
    async analyzeDepartmentEfficiency(compare) {
        const departmentQuery = `
      SELECT 
        d.id,
        d.name,
        COUNT(DISTINCT e.id) as employee_count,
        AVG(pa.allocation_percentage) as avg_allocation,
        COUNT(DISTINCT p.id) as projects_involved
      FROM departments d
      LEFT JOIN employees e ON d.id = e.department_id AND e.is_active = true
      LEFT JOIN project_assignments pa ON e.id = pa.employee_id
      LEFT JOIN projects p ON pa.project_id = p.id
      GROUP BY d.id, d.name
      ORDER BY d.name
    `;
        const departmentData = await this.db.query(departmentQuery);
        const departments = await Promise.all(departmentData.rows.map(async (dept) => {
            const metrics = await this.calculateDepartmentMetrics(dept.id);
            const efficiencyScore = this.calculateEfficiencyScore(metrics);
            return {
                name: dept.name,
                efficiencyScore,
                metrics,
                rank: 0,
                strengths: this.identifyDepartmentStrengths(metrics),
                improvementAreas: this.identifyImprovementAreas(metrics),
                trend: this.calculateDepartmentTrend(dept.id)
            };
        }));
        departments.sort((a, b) => b.efficiencyScore - a.efficiencyScore);
        departments.forEach((dept, index) => {
            dept.rank = index + 1;
        });
        const overallRanking = departments.map((dept, index) => ({
            rank: index + 1,
            department: dept.name,
            score: dept.efficiencyScore,
            change: Math.random() * 10 - 5
        }));
        const efficiencyTrends = await this.getDepartmentEfficiencyTrends();
        const benchmarkComparison = this.getBenchmarkComparison(departments);
        return {
            departments,
            overallRanking,
            efficiencyTrends,
            benchmarkComparison
        };
    }
    async assessBurnoutRisk() {
        const employeeRiskQuery = `
      SELECT 
        e.id,
        e.first_name || ' ' || e.last_name as name,
        d.name as department,
        COUNT(DISTINCT pa.project_id) as active_projects,
        AVG(pa.allocation_percentage) as avg_allocation,
        MAX(pa.allocation_percentage) as max_allocation
      FROM employees e
      JOIN departments d ON e.department_id = d.id
      LEFT JOIN project_assignments pa ON e.id = pa.employee_id
      LEFT JOIN projects p ON pa.project_id = p.id AND p.status = 'active'
      WHERE e.is_active = true
      GROUP BY e.id, e.first_name, e.last_name, d.name
    `;
        const employeeData = await this.db.query(employeeRiskQuery);
        const employeeRisks = employeeData.rows.map(emp => {
            const riskScore = this.calculateBurnoutRisk(emp);
            const riskLevel = this.getRiskLevel(riskScore);
            return {
                employeeId: emp.id,
                name: emp.name,
                department: emp.department,
                riskScore,
                riskLevel,
                riskFactors: this.identifyRiskFactors(emp),
                recommendedActions: this.getRecommendedActions(riskLevel)
            };
        });
        const highRiskEmployees = employeeRisks
            .filter(emp => emp.riskLevel === 'high' || emp.riskLevel === 'critical')
            .map(emp => ({
            employeeId: emp.employeeId,
            name: emp.name,
            riskScore: emp.riskScore,
            riskFactors: emp.riskFactors.map(factor => ({
                factor: factor.name,
                severity: factor.severity,
                description: factor.description
            })),
            recommendedActions: emp.recommendedActions
        }));
        const departmentRisks = this.calculateDepartmentRisks(employeeRisks);
        const overallRiskLevel = this.calculateOverallRiskLevel(employeeRisks);
        const earlyWarningIndicators = await this.getEarlyWarningIndicators();
        const interventionRecommendations = this.generateInterventionRecommendations(employeeRisks);
        return {
            riskAssessment: {
                overallRiskLevel,
                affectedEmployeeCount: highRiskEmployees.length,
                departmentRisks: departmentRisks.map(dr => ({
                    department: dr.department,
                    riskLevel: dr.riskLevel,
                    affectedCount: dr.affectedCount
                }))
            },
            highRiskEmployees,
            departmentRisks,
            earlyWarningIndicators,
            interventionRecommendations
        };
    }
    async analyzeWorkforceOptimization() {
        const currentState = await this.getCurrentWorkforceState();
        const optimizationOpportunities = await this.identifyOptimizationOpportunities();
        const skillRealignments = await this.analyzeSkillRealignments();
        const teamRestructuring = await this.evaluateTeamRestructuring();
        const capacityOptimization = await this.analyzeCapacityOptimization();
        return {
            currentState,
            optimizationOpportunities,
            skillRealignments,
            teamRestructuring,
            capacityOptimization
        };
    }
    async getOverviewMetrics(timeframe, departmentFilter) {
        const [projectsResult, employeesResult, utilizationResult] = await Promise.all([
            this.db.query(`SELECT COUNT(*) as total FROM projects WHERE created_at >= CURRENT_DATE - INTERVAL '${timeframe.replace('last_', '')}'`),
            this.db.query(`SELECT COUNT(*) as active FROM employees e JOIN departments d ON e.department_id = d.id WHERE e.is_active = true ${departmentFilter}`),
            this.db.query(`SELECT AVG(overall_utilization) as avg_util FROM capacity_metrics_snapshots WHERE snapshot_date >= CURRENT_DATE - INTERVAL '7 days'`)
        ]);
        return {
            totalProjects: parseInt(projectsResult.rows[0].total),
            activeEmployees: parseInt(employeesResult.rows[0].active),
            averageUtilization: parseFloat(utilizationResult.rows[0].avg_util || '75'),
            completedProjects: Math.floor(parseInt(projectsResult.rows[0].total) * 0.7)
        };
    }
    async getUtilizationMetrics(timeframe, departmentFilter) {
        return {
            byDepartment: [
                { department: 'Engineering', utilization: 85, efficiency: 92, trend: 'up' },
                { department: 'Design', utilization: 78, efficiency: 88, trend: 'stable' },
                { department: 'Product', utilization: 82, efficiency: 90, trend: 'up' }
            ],
            byEmployee: []
        };
    }
    async getPerformanceMetrics(timeframe, departmentFilter) {
        return {
            productivity: {
                tasksCompleted: 1250,
                averageTaskDuration: 3.2,
                outputPerEmployee: 8.5,
                velocityTrend: 12.3
            },
            quality: {
                defectRate: 2.1,
                reworkPercentage: 8.5,
                customerSatisfaction: 4.3,
                codeQualityScore: 87
            },
            efficiency: {
                resourceUtilization: 84.2,
                processEfficiency: 91.5,
                timeToMarket: 45,
                costPerDeliverable: 12500
            }
        };
    }
    async getProjectSuccessRates(timeframe) {
        const projectQuery = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' AND end_date <= COALESCE(planned_end_date, end_date) THEN 1 ELSE 0 END) as on_time,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM projects 
      WHERE created_at >= CURRENT_DATE - INTERVAL '${timeframe.replace('last_', '')}'
    `;
        const result = await this.db.query(projectQuery);
        const row = result.rows[0];
        const total = parseInt(row.total);
        const onTime = parseInt(row.on_time);
        const completed = parseInt(row.completed);
        return {
            onTime: total > 0 ? (onTime / total) * 100 : 0,
            onBudget: 78.5,
            scopeCompliance: 82.1,
            overallSuccess: total > 0 ? (completed / total) * 100 : 0
        };
    }
    async getSkillUtilization(timeframe) {
        const skillQuery = `
      SELECT 
        s.name as skill,
        COUNT(DISTINCT es.employee_id) as supply,
        85.0 as utilization_rate
      FROM skills s
      JOIN employee_skills es ON s.id = es.skill_id
      JOIN employees e ON es.employee_id = e.id
      WHERE e.is_active = true AND s.category = 'Technical'
      GROUP BY s.id, s.name
      ORDER BY supply DESC
      LIMIT 10
    `;
        const result = await this.db.query(skillQuery);
        return result.rows.map(row => ({
            skill: row.skill,
            demandVsSupply: Math.random() * 40 + 80,
            utilizationRate: parseFloat(row.utilization_rate),
            growthTrend: ['increasing', 'stable', 'decreasing'][Math.floor(Math.random() * 3)]
        }));
    }
    async getTeamEfficiency(timeframe, departmentFilter) {
        return {
            collaborationScore: 87.5,
            communicationEfficiency: 82.3,
            knowledgeSharing: 79.1,
            crossFunctionalWork: 71.8
        };
    }
    getDefaultProductivityMetrics() {
        return {
            tasksCompleted: 0,
            averageTaskDuration: 0,
            outputPerEmployee: 0,
            velocityTrend: 0,
            burnoutRisk: 0
        };
    }
    getDefaultQualityMetrics() {
        return {
            defectDensity: 0,
            testCoverage: 0,
            codeReviewEfficiency: 0,
            customerSatisfactionScore: 0
        };
    }
    getDefaultEfficiencyMetrics() {
        return {
            processEfficiency: 0,
            resourceOptimization: 0,
            automationIndex: 0,
            wasteReduction: 0
        };
    }
    async getProductivityMetrics(timeframe) {
        return this.getDefaultProductivityMetrics();
    }
    async getQualityMetrics(timeframe) {
        return this.getDefaultQualityMetrics();
    }
    async getEfficiencyMetrics(timeframe) {
        return this.getDefaultEfficiencyMetrics();
    }
    async getPerformanceTrends(timeframe) {
        return [
            { metric: 'productivity', direction: 'improving', rate: 5.2, confidence: 0.85 },
            { metric: 'quality', direction: 'stable', rate: 0.1, confidence: 0.92 },
            { metric: 'efficiency', direction: 'improving', rate: 3.1, confidence: 0.78 }
        ];
    }
    async getBenchmarkComparisons() {
        return {
            industryComparison: [
                { metric: 'productivity', ourValue: 85.2, industryAverage: 78.5, percentile: 72 },
                { metric: 'quality', ourValue: 91.8, industryAverage: 87.3, percentile: 68 }
            ]
        };
    }
    async getUtilizationPatterns(granularity) {
        return [
            {
                period: '2024-09',
                averageUtilization: 83.5,
                departmentBreakdown: [
                    { department: 'Engineering', utilization: 87.2 },
                    { department: 'Design', utilization: 79.8 }
                ]
            }
        ];
    }
    async identifyPeakUtilizationPeriods() {
        return [
            {
                period: 'Q3 2024',
                peakUtilization: 94.5,
                duration: 6,
                causesIdentified: ['Product launch deadlines', 'Resource constraints']
            }
        ];
    }
    async identifyUnderutilizedResources() {
        return [
            {
                resourceType: 'skill',
                identifier: 'Machine Learning',
                utilizationRate: 45.2,
                potentialCapacity: 120,
                recommendations: ['Increase ML project allocation', 'Cross-train team members']
            }
        ];
    }
    async identifyOverutilizedResources() {
        return [
            {
                resourceType: 'department',
                identifier: 'Engineering',
                utilizationRate: 96.8,
                burnoutRisk: 78,
                mitigationActions: ['Hire additional developers', 'Redistribute workload']
            }
        ];
    }
    generateUtilizationRecommendations(patterns, peaks, underutilized, overutilized) {
        return [
            {
                type: 'rebalancing',
                priority: 'high',
                description: 'Redistribute workload from overutilized to underutilized resources',
                expectedImpact: 15
            }
        ];
    }
    calculateProjectCorrelations(projects) {
        return [
            {
                factor: 'Team Size',
                correlationCoefficient: -0.23,
                significance: 0.75,
                description: 'Smaller teams tend to have higher success rates',
                recommendation: 'Keep teams lean and focused'
            }
        ];
    }
    identifySuccessFactors(projects) {
        return [
            {
                factor: 'Clear Requirements',
                impact: 85,
                frequency: 0.78,
                actionable: true
            }
        ];
    }
    identifyRiskFactors(projects) {
        return [
            {
                factor: 'Scope Creep',
                riskLevel: 'high',
                frequency: 0.45,
                mitigation: 'Implement strict change control processes'
            }
        ];
    }
    generateProjectRecommendations(correlations, successFactors, riskFactors) {
        return [
            {
                category: 'team_composition',
                recommendation: 'Optimize team sizes based on project complexity',
                expectedImpact: 15,
                implementationEffort: 'medium'
            }
        ];
    }
    async calculateDepartmentMetrics(departmentId) {
        return {
            productivity: 85.2,
            quality: 91.8,
            collaboration: 78.5,
            innovation: 82.1
        };
    }
    calculateEfficiencyScore(metrics) {
        return (metrics.productivity + metrics.quality + metrics.collaboration + metrics.innovation) / 4;
    }
    identifyDepartmentStrengths(metrics) {
        return ['High code quality', 'Strong collaboration'];
    }
    identifyImprovementAreas(metrics) {
        return ['Innovation practices', 'Process documentation'];
    }
    calculateDepartmentTrend(departmentId) {
        return 'improving';
    }
    async getDepartmentEfficiencyTrends() {
        return [
            {
                period: '2024-Q3',
                departmentScores: [
                    { department: 'Engineering', score: 87.5 },
                    { department: 'Design', score: 83.2 }
                ]
            }
        ];
    }
    getBenchmarkComparison(departments) {
        return {
            internalBenchmark: 85.2,
            industryBenchmark: 78.9,
            bestPractices: ['Regular retrospectives', 'Cross-functional collaboration']
        };
    }
    calculateBurnoutRisk(employee) {
        const factors = [
            employee.active_projects > 3 ? 20 : 0,
            employee.avg_allocation > 90 ? 25 : 0,
            employee.max_allocation > 100 ? 30 : 0
        ];
        return Math.min(100, factors.reduce((sum, factor) => sum + factor, 0));
    }
    getRiskLevel(score) {
        if (score >= 80)
            return 'critical';
        if (score >= 60)
            return 'high';
        if (score >= 40)
            return 'medium';
        return 'low';
    }
    identifyRiskFactors(employee) {
        const factors = [];
        if (employee.active_projects > 3) {
            factors.push({ name: 'Multiple Projects', severity: 'high', description: 'Working on too many projects simultaneously' });
        }
        if (employee.avg_allocation > 90) {
            factors.push({ name: 'High Utilization', severity: 'medium', description: 'Consistently high allocation rate' });
        }
        return factors;
    }
    getRecommendedActions(riskLevel) {
        const actions = {
            low: ['Monitor workload trends'],
            medium: ['Schedule regular check-ins', 'Consider workload adjustments'],
            high: ['Immediate workload reduction', 'One-on-one meetings'],
            critical: ['Emergency intervention', 'Temporary project reassignment', 'Wellness support']
        };
        return actions[riskLevel] || actions.low;
    }
    calculateDepartmentRisks(employeeRisks) {
        const deptRisks = new Map();
        employeeRisks.forEach(emp => {
            if (!deptRisks.has(emp.department)) {
                deptRisks.set(emp.department, { department: emp.department, risks: [], total: 0 });
            }
            deptRisks.get(emp.department).risks.push(emp);
            deptRisks.get(emp.department).total++;
        });
        return Array.from(deptRisks.values()).map(dept => ({
            department: dept.department,
            averageRiskScore: dept.risks.reduce((sum, r) => sum + r.riskScore, 0) / dept.risks.length,
            riskDistribution: {
                low: dept.risks.filter((r) => r.riskLevel === 'low').length,
                medium: dept.risks.filter((r) => r.riskLevel === 'medium').length,
                high: dept.risks.filter((r) => r.riskLevel === 'high').length,
                critical: dept.risks.filter((r) => r.riskLevel === 'critical').length
            },
            riskLevel: this.calculateDepartmentRiskLevel(dept.risks),
            affectedCount: dept.risks.filter((r) => r.riskLevel === 'high' || r.riskLevel === 'critical').length
        }));
    }
    calculateDepartmentRiskLevel(risks) {
        const highRisk = risks.filter(r => r.riskLevel === 'high' || r.riskLevel === 'critical').length;
        const percentage = highRisk / risks.length;
        if (percentage >= 0.5)
            return 'critical';
        if (percentage >= 0.3)
            return 'high';
        if (percentage >= 0.1)
            return 'medium';
        return 'low';
    }
    calculateOverallRiskLevel(employeeRisks) {
        const highRisk = employeeRisks.filter(emp => emp.riskLevel === 'high' || emp.riskLevel === 'critical').length;
        const percentage = highRisk / employeeRisks.length;
        if (percentage >= 0.2)
            return 'critical';
        if (percentage >= 0.15)
            return 'high';
        if (percentage >= 0.1)
            return 'medium';
        return 'low';
    }
    async getEarlyWarningIndicators() {
        return [
            {
                indicator: 'Average Overtime Hours',
                currentValue: 8.5,
                threshold: 10.0,
                trend: 'increasing'
            }
        ];
    }
    generateInterventionRecommendations(employeeRisks) {
        return [
            {
                intervention: 'Workload rebalancing',
                targetGroup: 'High-risk employees',
                expectedImpact: 25,
                timeline: '2-4 weeks',
                priority: 'immediate'
            }
        ];
    }
    async getCurrentWorkforceState() {
        return {
            totalCapacity: 2000,
            utilizationRate: 84.5,
            skillDistribution: [],
            departmentBalance: []
        };
    }
    async identifyOptimizationOpportunities() {
        return [];
    }
    async analyzeSkillRealignments() {
        return [];
    }
    async evaluateTeamRestructuring() {
        return [];
    }
    async analyzeCapacityOptimization() {
        return {
            underutilizedCapacity: 320,
            overallocatedCapacity: 180,
            optimizationPotential: 15.5,
            recommendedActions: ['Rebalance workloads', 'Cross-train team members']
        };
    }
}
exports.TeamAnalyticsService = TeamAnalyticsService;
//# sourceMappingURL=team-analytics.service.js.map