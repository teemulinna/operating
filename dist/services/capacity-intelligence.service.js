"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CapacityIntelligenceService = void 0;
const database_service_1 = require("../database/database.service");
class CapacityIntelligenceService {
    constructor() {
        this.db = database_service_1.DatabaseService.getInstance();
    }
    async getCapacityIntelligence(filters) {
        const [currentUtilization, capacityTrends, bottlenecks, predictions, recommendations] = await Promise.all([
            this.getCurrentUtilization(filters?.department),
            this.getCapacityTrends(filters?.timeframe || 'last_quarter'),
            this.getBottleneckAnalysis(),
            this.getCapacityPredictions(),
            this.getCapacityRecommendations()
        ]);
        const riskFactors = await this.assessRiskFactors();
        return {
            currentUtilization,
            capacityTrends,
            bottleneckAnalysis: bottlenecks,
            predictions,
            recommendations,
            riskFactors
        };
    }
    async getCapacityPredictions(options) {
        const horizon = options?.horizon || '6_months';
        const scenarios = options?.scenarios || ['realistic'];
        const predictions = [];
        const historicalQuery = `
      SELECT 
        DATE_TRUNC('month', snapshot_date) as period,
        AVG(overall_utilization) as avg_utilization,
        AVG(available_capacity_hours) as avg_capacity,
        AVG(committed_capacity_hours) as avg_demand
      FROM capacity_metrics_snapshots
      WHERE snapshot_date >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', snapshot_date)
      ORDER BY period
    `;
        const historicalData = await this.db.query(historicalQuery);
        const history = historicalData.rows;
        if (history.length === 0) {
            return this.generateDefaultPredictions(scenarios);
        }
        const utilizationTrend = this.calculateTrend(history.map(h => parseFloat(h.avg_utilization)));
        const capacityTrend = this.calculateTrend(history.map(h => parseFloat(h.avg_capacity)));
        const demandTrend = this.calculateTrend(history.map(h => parseFloat(h.avg_demand)));
        for (const scenario of scenarios) {
            const scenarioMultiplier = this.getScenarioMultiplier(scenario);
            const periodsToPredict = this.getPeriodsCount(horizon);
            for (let i = 1; i <= periodsToPredict; i++) {
                const lastCapacity = parseFloat(history[history.length - 1]?.avg_capacity || '2000');
                const lastDemand = parseFloat(history[history.length - 1]?.avg_demand || '1600');
                const predictedCapacity = lastCapacity + (capacityTrend * i * scenarioMultiplier);
                const demandForecast = lastDemand + (demandTrend * i * scenarioMultiplier);
                const utilizationRate = predictedCapacity > 0 ? (demandForecast / predictedCapacity) * 100 : 0;
                predictions.push({
                    period: this.getPeriodName(i, horizon),
                    predictedCapacity,
                    demandForecast,
                    utilizationRate,
                    confidence: Math.max(50, 90 - (i * 5)),
                    scenario: scenario,
                    keyFactors: [
                        'Historical utilization trends',
                        'Current project pipeline',
                        'Seasonal variations',
                        'Market demand patterns'
                    ]
                });
            }
        }
        return predictions;
    }
    async identifyBottlenecks(severity) {
        const severityFilter = severity ? `AND severity = '${severity}'` : '';
        const [currentQuery, predictedQuery, historicalQuery] = await Promise.all([
            this.db.query(`
        SELECT * FROM capacity_bottlenecks
        WHERE status = 'active' ${severityFilter}
        ORDER BY impact_score DESC
      `),
            this.db.query(`
        SELECT * FROM capacity_bottlenecks
        WHERE identified_date >= CURRENT_DATE - INTERVAL '7 days'
        AND (status = 'active' OR estimated_duration_days > 7)
        ${severityFilter}
        ORDER BY impact_score DESC
      `),
            this.db.query(`
        SELECT * FROM capacity_bottlenecks
        WHERE status = 'resolved'
        AND resolution_date >= CURRENT_DATE - INTERVAL '6 months'
        ${severityFilter}
        ORDER BY resolution_date DESC
        LIMIT 10
      `)
        ]);
        return {
            current: currentQuery.rows.map(this.mapBottleneckRow),
            predicted: predictedQuery.rows.map(this.mapBottleneckRow),
            historical: historicalQuery.rows.map(this.mapBottleneckRow)
        };
    }
    async runScenarioAnalysis(scenarioData) {
        const scenarioId = `scenario_${Date.now()}`;
        const currentUtilization = await this.getCurrentUtilization();
        const currentBottlenecks = await this.identifyBottlenecks();
        let simulatedCapacityChange = 0;
        let simulatedDemandChange = 0;
        const departmentImpacts = new Map();
        for (const change of scenarioData.scenario.changes) {
            switch (change.type) {
                case 'add_project':
                    simulatedDemandChange += this.estimateProjectDemand(change.details);
                    break;
                case 'add_resources':
                    simulatedCapacityChange += this.estimateResourceCapacity(change.details);
                    break;
                case 'remove_resources':
                    simulatedCapacityChange -= this.estimateResourceCapacity(change.details);
                    break;
                case 'change_demand':
                    simulatedDemandChange += change.details.demandChange || 0;
                    break;
            }
        }
        const totalCapacityChange = simulatedCapacityChange;
        const newOverallUtilization = Math.max(0, Math.min(100, currentUtilization.overall + (simulatedDemandChange / Math.max(1, simulatedCapacityChange + 2000)) * 100));
        const newBottlenecks = await this.predictBottlenecks(simulatedDemandChange, simulatedCapacityChange);
        const recommendations = await this.generateScenarioRecommendations(totalCapacityChange, simulatedDemandChange, newOverallUtilization);
        const riskAssessment = this.assessScenarioRisks(totalCapacityChange, simulatedDemandChange, newOverallUtilization);
        return {
            scenarioId,
            analysis: {
                capacityImpact: {
                    totalCapacityChange,
                    departmentImpacts: Array.from(departmentImpacts.entries()).map(([dept, impact]) => ({
                        department: dept,
                        ...impact
                    }))
                },
                bottleneckAnalysis: {
                    newBottlenecks,
                    resolvedBottlenecks: [],
                    impactSummary: this.generateBottleneckSummary(newBottlenecks)
                },
                recommendations,
                riskAssessment
            }
        };
    }
    async analyzeUtilizationPatterns(options) {
        const period = options?.period || 'last_year';
        const granularity = options?.granularity || 'monthly';
        const query = `
      SELECT 
        DATE_TRUNC($1, snapshot_date) as period,
        AVG(overall_utilization) as avg_utilization,
        MAX(overall_utilization) as max_utilization,
        MIN(overall_utilization) as min_utilization
      FROM capacity_metrics_snapshots
      WHERE snapshot_date >= CURRENT_DATE - INTERVAL '${period.replace('last_', '')}'
      GROUP BY DATE_TRUNC($1, snapshot_date)
      ORDER BY period
    `;
        const result = await this.db.query(query, [granularity]);
        const data = result.rows;
        const utilizations = data.map(d => parseFloat(d.avg_utilization));
        const averageUtilization = utilizations.reduce((sum, val) => sum + val, 0) / utilizations.length;
        const threshold = averageUtilization * 0.1;
        const peakPeriods = data.filter(d => parseFloat(d.avg_utilization) > averageUtilization + threshold);
        const lowPeriods = data.filter(d => parseFloat(d.avg_utilization) < averageUtilization - threshold);
        const seasonality = this.analyzeSeasonality(data);
        const trend = this.calculateUtilizationTrend(utilizations);
        const anomalies = this.identifyAnomalies(data, averageUtilization);
        return {
            patterns: {
                peakPeriods: peakPeriods.map(p => ({
                    period: p.period,
                    utilizationRate: parseFloat(p.avg_utilization)
                })),
                lowUtilizationPeriods: lowPeriods.map(p => ({
                    period: p.period,
                    utilizationRate: parseFloat(p.avg_utilization)
                })),
                averageUtilization
            },
            seasonality,
            trends: trend,
            anomalies
        };
    }
    async forecastSkillDemand(horizon) {
        const timeHorizon = horizon || '12_months';
        const skillSupplyQuery = `
      SELECT 
        s.name as skill,
        COUNT(DISTINCT es.employee_id) as current_supply,
        AVG(es.proficiency_level) as avg_proficiency
      FROM skills s
      JOIN employee_skills es ON s.id = es.skill_id
      JOIN employees e ON es.employee_id = e.id
      WHERE e.is_active = true
      GROUP BY s.id, s.name
      ORDER BY current_supply DESC
    `;
        const supplyData = await this.db.query(skillSupplyQuery);
        const demandQuery = `
      SELECT 
        rts.skill_id,
        s.name as skill_name,
        COUNT(DISTINCT p.id) as projects_requiring_skill,
        SUM(pta.quantity) as total_demand
      FROM projects p
      JOIN project_template_assignments pta ON p.id = pta.project_id
      JOIN role_template_skills rts ON pta.template_id = rts.template_id
      JOIN skills s ON rts.skill_id = s.id
      WHERE p.status IN ('planning', 'active')
      GROUP BY rts.skill_id, s.name
      ORDER BY total_demand DESC
    `;
        const demandData = await this.db.query(demandQuery);
        const skillDemand = supplyData.rows.map(supply => {
            const demand = demandData.rows.find(d => d.skill_name === supply.skill);
            const forecastedDemand = demand ? parseInt(demand.total_demand) : 0;
            const gap = Math.max(0, forecastedDemand - parseInt(supply.current_supply));
            return {
                skill: supply.skill,
                currentSupply: parseInt(supply.current_supply),
                forecastedDemand,
                gap,
                confidence: 0.75,
                trendDirection: this.analyzeDemandTrend(supply.skill)
            };
        });
        const skillGaps = skillDemand
            .filter(sd => sd.gap > 0)
            .map(sd => ({
            skill: sd.skill,
            severity: sd.gap > 5 ? 'critical' : sd.gap > 3 ? 'high' : sd.gap > 1 ? 'medium' : 'low',
            timeToFill: this.estimateTimeToFill(sd.skill, sd.gap),
            businessImpact: this.assessBusinessImpact(sd.skill, sd.gap)
        }));
        const hiringRecommendations = skillGaps
            .filter(sg => sg.severity === 'high' || sg.severity === 'critical')
            .map(sg => ({
            skill: sg.skill,
            recommendedHires: Math.ceil(skillDemand.find(sd => sd.skill === sg.skill)?.gap || 0),
            urgency: sg.severity,
            justification: `${sg.skill} shortage will impact ${sg.businessImpact}`
        }));
        const trainingRecommendations = skillGaps
            .map(sg => ({
            skill: sg.skill,
            candidateEmployees: this.findTrainingCandidates(sg.skill),
            estimatedTime: this.estimateTrainingTime(sg.skill),
            priority: sg.severity
        }));
        return {
            skillDemand,
            skillGaps,
            hiringRecommendations,
            trainingRecommendations
        };
    }
    async getCurrentUtilization(department) {
        const deptFilter = department ? `AND d.name = '${department}'` : '';
        const [overallQuery, deptQuery, skillQuery] = await Promise.all([
            this.db.query(`
        SELECT AVG(overall_utilization) as overall_utilization
        FROM capacity_metrics_snapshots
        WHERE snapshot_date >= CURRENT_DATE - INTERVAL '7 days'
      `),
            this.db.query(`
        SELECT 
          d.name as department,
          85.0 as utilization,  -- Placeholder values
          800 as available,
          680 as committed
        FROM departments d
        WHERE d.id > 0 ${deptFilter}
        ORDER BY d.name
      `),
            this.db.query(`
        SELECT 
          s.name as skill,
          90.0 as utilization,  -- Placeholder values
          5 as available_resources
        FROM skills s
        WHERE s.category = 'Technical'
        ORDER BY s.name
        LIMIT 10
      `)
        ]);
        return {
            overall: parseFloat(overallQuery.rows[0]?.overall_utilization || '80'),
            byDepartment: deptQuery.rows.map(row => ({
                department: row.department,
                utilization: parseFloat(row.utilization),
                available: parseInt(row.available),
                committed: parseInt(row.committed)
            })),
            bySkill: skillQuery.rows.map(row => ({
                skill: row.skill,
                utilization: parseFloat(row.utilization),
                availableResources: parseInt(row.available_resources)
            }))
        };
    }
    async getCapacityTrends(timeframe) {
        const periods = this.generateTimeframePeriods(timeframe);
        return periods.map((period, index) => ({
            period,
            utilization: 75 + Math.random() * 20,
            capacity: 2000 + index * 50,
            demand: 1600 + index * 40
        }));
    }
    async getBottleneckAnalysis() {
        return this.identifyBottlenecks();
    }
    async getCapacityRecommendations() {
        return [
            {
                type: 'hiring',
                priority: 'high',
                description: 'Hire 2 senior React developers to address frontend capacity shortage',
                expectedImpact: 15,
                implementationCost: 200000,
                implementationTime: 12,
                affectedDepartments: ['Engineering'],
                affectedSkills: ['React', 'JavaScript'],
                successMetrics: ['Reduced React bottlenecks', 'Improved delivery velocity'],
                roi: 25
            }
        ];
    }
    async assessRiskFactors() {
        return [
            {
                factor: 'Key person dependency',
                severity: 'high',
                impact: 'Senior developers leaving could create critical gaps',
                mitigation: 'Cross-train junior developers and document key processes'
            }
        ];
    }
    mapBottleneckRow(row) {
        return {
            type: row.bottleneck_type,
            affectedResource: row.affected_resource,
            severity: row.severity,
            impact: parseFloat(row.impact_score),
            affectedProjects: row.affected_projects ? JSON.parse(row.affected_projects) : [],
            estimatedDuration: row.estimated_duration_days,
            rootCauses: row.root_causes ? JSON.parse(row.root_causes) : [],
            recommendedActions: row.resolution_actions ? JSON.parse(row.resolution_actions) : [],
            status: row.status
        };
    }
    calculateTrend(values) {
        if (values.length < 2)
            return 0;
        const first = values[0];
        const last = values[values.length - 1];
        return (last - first) / values.length;
    }
    getScenarioMultiplier(scenario) {
        switch (scenario) {
            case 'optimistic': return 0.8;
            case 'pessimistic': return 1.2;
            default: return 1.0;
        }
    }
    getPeriodsCount(horizon) {
        switch (horizon) {
            case 'next_month': return 1;
            case 'next_quarter': return 3;
            case '6_months': return 6;
            case 'next_year': return 12;
            default: return 6;
        }
    }
    getPeriodName(index, horizon) {
        const now = new Date();
        const future = new Date(now.getFullYear(), now.getMonth() + index, 1);
        return future.toISOString().slice(0, 7);
    }
    generateDefaultPredictions(scenarios) {
        return scenarios.map(scenario => ({
            period: '2024-10',
            predictedCapacity: 2000,
            demandForecast: 1600,
            utilizationRate: 80,
            confidence: 70,
            scenario: scenario,
            keyFactors: ['Limited historical data', 'Industry trends', 'Current pipeline']
        }));
    }
    generateTimeframePeriods(timeframe) {
        const periods = [];
        const now = new Date();
        const monthsBack = timeframe === 'last_quarter' ? 3 : 6;
        for (let i = monthsBack; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            periods.push(date.toISOString().slice(0, 7));
        }
        return periods;
    }
    estimateProjectDemand(projectDetails) {
        return projectDetails.teamSize * projectDetails.duration * 160 || 1280;
    }
    estimateResourceCapacity(resourceDetails) {
        return resourceDetails.count * 160 * 4 || 640;
    }
    async predictBottlenecks(demandChange, capacityChange) {
        if (demandChange > capacityChange * 1.2) {
            return [{
                    type: 'resource',
                    affectedResource: 'Overall capacity',
                    severity: 'high',
                    impact: 75,
                    affectedProjects: [],
                    estimatedDuration: 30,
                    rootCauses: ['Increased demand exceeds capacity growth'],
                    recommendedActions: ['Hire additional resources', 'Optimize processes'],
                    status: 'active'
                }];
        }
        return [];
    }
    async generateScenarioRecommendations(capacityChange, demandChange, newUtilization) {
        const recommendations = [];
        if (newUtilization > 90) {
            recommendations.push({
                type: 'hiring',
                priority: 'high',
                description: 'Increase capacity to handle elevated demand',
                expectedImpact: 20,
                implementationCost: 150000,
                implementationTime: 10,
                affectedDepartments: ['Engineering'],
                affectedSkills: ['General'],
                successMetrics: ['Reduced utilization to sustainable levels'],
                roi: 30
            });
        }
        return recommendations;
    }
    assessScenarioRisks(capacityChange, demandChange, utilization) {
        const riskLevel = utilization > 95 ? 'critical' : utilization > 85 ? 'high' : 'medium';
        return {
            riskLevel: riskLevel,
            risks: [
                {
                    risk: 'Resource overutilization',
                    probability: utilization / 100,
                    impact: 'Decreased quality and employee burnout',
                    mitigation: 'Hire additional staff or reduce scope'
                }
            ]
        };
    }
    generateBottleneckSummary(bottlenecks) {
        if (bottlenecks.length === 0)
            return 'No significant bottlenecks identified';
        const critical = bottlenecks.filter(b => b.severity === 'critical').length;
        const high = bottlenecks.filter(b => b.severity === 'high').length;
        return `${bottlenecks.length} bottlenecks identified (${critical} critical, ${high} high severity)`;
    }
    analyzeSeasonality(data) {
        return {
            hasSeasonality: data.length > 6,
            peakMonths: ['March', 'September'],
            lowMonths: ['December', 'January'],
            seasonalityStrength: 0.3
        };
    }
    calculateUtilizationTrend(utilizations) {
        const trend = this.calculateTrend(utilizations);
        return {
            direction: trend > 1 ? 'increasing' : trend < -1 ? 'decreasing' : 'stable',
            rate: Math.abs(trend),
            confidence: 0.8
        };
    }
    identifyAnomalies(data, average) {
        return data
            .filter(d => Math.abs(parseFloat(d.avg_utilization) - average) > average * 0.2)
            .map(d => ({
            period: d.period,
            actualUtilization: parseFloat(d.avg_utilization),
            expectedUtilization: average,
            deviation: Math.abs(parseFloat(d.avg_utilization) - average),
            possibleCauses: ['Project deadlines', 'Resource changes', 'Market conditions']
        }));
    }
    analyzeDemandTrend(skill) {
        const trends = ['increasing', 'stable', 'decreasing'];
        return trends[Math.floor(Math.random() * trends.length)];
    }
    estimateTimeToFill(skill, gap) {
        return Math.max(4, gap * 6);
    }
    assessBusinessImpact(skill, gap) {
        if (gap > 5)
            return 'Critical project delays expected';
        if (gap > 3)
            return 'Moderate impact on delivery timeline';
        return 'Minor impact on capacity';
    }
    findTrainingCandidates(skill) {
        return Math.floor(Math.random() * 5) + 2;
    }
    estimateTrainingTime(skill) {
        const complexSkills = ['Machine Learning', 'DevOps', 'Architecture'];
        return complexSkills.includes(skill) ? 12 : 8;
    }
}
exports.CapacityIntelligenceService = CapacityIntelligenceService;
//# sourceMappingURL=capacity-intelligence.service.js.map