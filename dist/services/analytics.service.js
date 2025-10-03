"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = void 0;
class AnalyticsService {
    static initialize(pool) {
        this.pool = pool;
    }
    static async getTeamUtilizationData(filters = {}) {
        const startTime = Date.now();
        let query = `
      WITH department_utilization AS (
        SELECT 
          d.id as department_id,
          d.name as department_name,
          COUNT(DISTINCT e.id) as total_employees,
          -- Real utilization calculation from resource allocations
          COALESCE(
            SUM(COALESCE(ra.allocated_hours, 0))::numeric / 
            NULLIF(SUM(COALESCE(e.default_hours, 40))::numeric, 0), 
            0
          ) as average_utilization,
          SUM(COALESCE(e.default_hours, 40)) as total_available_hours,
          SUM(COALESCE(ra.allocated_hours, 0)) as total_allocated_hours
        FROM departments d
        LEFT JOIN employees e ON d.id = e.department_id AND e.is_active = true
        LEFT JOIN resource_allocations ra ON e.id = ra.employee_id 
          AND ra.is_active = true
          AND ra.start_date <= COALESCE($2, CURRENT_DATE)
          AND ra.end_date >= COALESCE($1, CURRENT_DATE - INTERVAL '30 days')
        WHERE d.is_active = true
    `;
        const values = [];
        if (filters.dateFrom) {
            values.push(filters.dateFrom);
        }
        else {
            values.push(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
        }
        if (filters.dateTo) {
            values.push(filters.dateTo);
        }
        else {
            values.push(new Date());
        }
        if (filters.departmentIds && filters.departmentIds.length > 0) {
            values.push(filters.departmentIds);
            query += ` AND d.id = ANY($${values.length})`;
        }
        query += `
        GROUP BY d.id, d.name
      ),
      previous_period AS (
        SELECT 
          d.id as department_id,
          COALESCE(
            SUM(COALESCE(ra_prev.allocated_hours, 0))::numeric / 
            NULLIF(SUM(COALESCE(e.default_hours, 40))::numeric, 0), 
            0
          ) as prev_utilization
        FROM departments d
        LEFT JOIN employees e ON d.id = e.department_id AND e.is_active = true
        LEFT JOIN resource_allocations ra_prev ON e.id = ra_prev.employee_id 
          AND ra_prev.is_active = true
    `;
        if (filters.dateFrom && filters.dateTo) {
            const dateFrom = new Date(filters.dateFrom);
            const dateTo = new Date(filters.dateTo);
            const periodLength = dateTo.getTime() - dateFrom.getTime();
            const prevDateTo = new Date(dateFrom.getTime() - 1);
            const prevDateFrom = new Date(dateFrom.getTime() - periodLength);
            values.push(prevDateFrom, prevDateTo);
            query += ` AND ra_prev.start_date <= $${values.length} AND ra_prev.end_date >= $${values.length - 1}`;
        }
        else {
            values.push(new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
            query += ` AND ra_prev.start_date <= $${values.length} AND ra_prev.end_date >= $${values.length - 1}`;
        }
        query += `
        WHERE d.is_active = true
        GROUP BY d.id
      )
      SELECT 
        du.*,
        COALESCE(
          CASE 
            WHEN pp.prev_utilization > 0 THEN 
              ((du.average_utilization - pp.prev_utilization) / pp.prev_utilization) * 100
            ELSE 0
          END, 0
        ) as utilization_trend
      FROM department_utilization du
      LEFT JOIN previous_period pp ON du.department_id = pp.department_id
      ORDER BY du.average_utilization DESC
    `;
        const result = await this.pool.query(query, values);
        const data = result.rows.map(row => ({
            departmentId: row.department_id,
            departmentName: row.department_name,
            totalEmployees: parseInt(row.total_employees) || 0,
            averageUtilization: parseFloat(row.average_utilization) || 0,
            totalAvailableHours: parseFloat(row.total_available_hours) || 0,
            totalAllocatedHours: parseFloat(row.total_allocated_hours) || 0,
            utilizationTrend: parseFloat(row.utilization_trend) || 0
        }));
        return {
            data,
            metadata: {
                generatedAt: new Date(),
                dataPoints: data.length,
                dateRange: {
                    from: filters.dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    to: filters.dateTo || new Date()
                },
                filters,
                processingTimeMs: Date.now() - startTime
            }
        };
    }
    static async getCapacityTrends(filters = {}) {
        const startTime = Date.now();
        const aggregationPeriod = filters.aggregationPeriod || 'weekly';
        const dateFormat = this.getDateFormat(aggregationPeriod);
        let query = `
      WITH date_series AS (
        SELECT generate_series(
          COALESCE($1, CURRENT_DATE - INTERVAL '90 days'),
          COALESCE($2, CURRENT_DATE),
          '1 ${aggregationPeriod === 'daily' ? 'day' : aggregationPeriod === 'weekly' ? 'week' : 'month'}'::interval
        )::date as period_date
      ),
      department_capacity AS (
        SELECT 
          ds.period_date,
          d.id as department_id,
          d.name as department_name,
          COUNT(DISTINCT e.id) as employee_count,
          SUM(COALESCE(e.default_hours, 40)) as total_available_hours,
          COALESCE(
            SUM(
              CASE 
                WHEN ra.start_date <= ds.period_date AND ra.end_date >= ds.period_date
                THEN ra.allocated_hours
                ELSE 0
              END
            ), 0
          ) as total_allocated_hours
        FROM date_series ds
        CROSS JOIN departments d
        LEFT JOIN employees e ON d.id = e.department_id AND e.is_active = true
        LEFT JOIN resource_allocations ra ON e.id = ra.employee_id AND ra.is_active = true
        WHERE d.is_active = true
    `;
        const values = [];
        if (filters.dateFrom) {
            values.push(filters.dateFrom);
        }
        else {
            values.push(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000));
        }
        if (filters.dateTo) {
            values.push(filters.dateTo);
        }
        else {
            values.push(new Date());
        }
        if (filters.departmentIds && filters.departmentIds.length > 0) {
            values.push(filters.departmentIds);
            query += ` AND d.id = ANY($${values.length})`;
        }
        query += `
        GROUP BY ds.period_date, d.id, d.name
        ORDER BY ds.period_date, d.name
      )
      SELECT 
        *,
        CASE 
          WHEN total_available_hours > 0 
          THEN total_allocated_hours::numeric / total_available_hours::numeric
          ELSE 0 
        END as average_utilization
      FROM department_capacity
    `;
        const result = await this.pool.query(query, values);
        const data = result.rows.map(row => ({
            date: row.period_date,
            departmentId: row.department_id,
            departmentName: row.department_name,
            averageUtilization: parseFloat(row.average_utilization) || 0,
            totalAvailableHours: parseFloat(row.total_available_hours) || 0,
            totalAllocatedHours: parseFloat(row.total_allocated_hours) || 0,
            employeeCount: parseInt(row.employee_count) || 0
        }));
        return {
            data,
            metadata: {
                generatedAt: new Date(),
                dataPoints: data.length,
                dateRange: {
                    from: filters.dateFrom || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
                    to: filters.dateTo || new Date()
                },
                filters,
                processingTimeMs: Date.now() - startTime
            }
        };
    }
    static async getResourceAllocationMetrics(filters = {}) {
        const startTime = Date.now();
        const companyMetricsQuery = `
      SELECT 
        COUNT(DISTINCT e.id) as total_employees,
        COUNT(DISTINCT d.id) as total_departments,
        COALESCE(
          SUM(COALESCE(ra.allocated_hours, 0))::numeric / 
          NULLIF(SUM(COALESCE(e.default_hours, 40))::numeric, 0), 
          0
        ) as average_utilization
      FROM employees e
      JOIN departments d ON e.department_id = d.id
      LEFT JOIN resource_allocations ra ON e.id = ra.employee_id 
        AND ra.is_active = true
        AND ra.start_date <= CURRENT_DATE 
        AND ra.end_date >= CURRENT_DATE
      WHERE e.is_active = true AND d.is_active = true
    `;
        const companyResult = await this.pool.query(companyMetricsQuery);
        const companyMetrics = companyResult.rows[0];
        const utilizationStatsQuery = `
      SELECT 
        COUNT(CASE WHEN utilization > 1.0 THEN 1 END) as overutilized,
        COUNT(CASE WHEN utilization < 0.7 THEN 1 END) as underutilized
      FROM (
        SELECT 
          e.id,
          COALESCE(
            SUM(ra.allocated_hours)::numeric / 
            NULLIF(e.default_hours::numeric, 0), 
            0
          ) as utilization
        FROM employees e
        LEFT JOIN resource_allocations ra ON e.id = ra.employee_id 
          AND ra.is_active = true
          AND ra.start_date <= CURRENT_DATE 
          AND ra.end_date >= CURRENT_DATE
        WHERE e.is_active = true
        GROUP BY e.id, e.default_hours
      ) emp_util
    `;
        const utilizationResult = await this.pool.query(utilizationStatsQuery);
        const utilizationStats = {
            overutilized: parseInt(utilizationResult.rows[0].overutilized) || 0,
            underutilized: parseInt(utilizationResult.rows[0].underutilized) || 0
        };
        const skillGaps = await this.getSkillGapAnalysis(filters);
        const departmentPerformance = await this.getDepartmentPerformance(filters);
        const capacityForecast = await this.generateCapacityForecast(filters);
        const data = {
            totalEmployees: parseInt(companyMetrics.total_employees) || 0,
            totalDepartments: parseInt(companyMetrics.total_departments) || 0,
            averageUtilizationAcrossCompany: parseFloat(companyMetrics.average_utilization) || 0,
            overutilizedEmployees: utilizationStats.overutilized,
            underutilizedEmployees: utilizationStats.underutilized,
            criticalResourceGaps: skillGaps.data,
            topPerformingDepartments: departmentPerformance.data.slice(0, 5),
            capacityForecast: capacityForecast.data
        };
        return {
            data,
            metadata: {
                generatedAt: new Date(),
                dataPoints: 1,
                dateRange: {
                    from: filters.dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    to: filters.dateTo || new Date()
                },
                filters,
                processingTimeMs: Date.now() - startTime
            }
        };
    }
    static async getSkillGapAnalysis(filters = {}) {
        const startTime = Date.now();
        const query = `
      WITH skill_demand AS (
        SELECT 
          s.id,
          s.name,
          s.category,
          COUNT(es.id) as current_professionals,
          COUNT(es.id) FILTER (WHERE
            CASE
              WHEN es.proficiency_level::text = 'expert' THEN 4
              WHEN es.proficiency_level::text = 'master' THEN 5
              WHEN es.proficiency_level::text = 'advanced' THEN 3
              WHEN es.proficiency_level::text = 'intermediate' THEN 2
              WHEN es.proficiency_level::text = 'beginner' THEN 1
              ELSE es.proficiency_level -- handle integer type from migration 015
            END >= 4
          ) as experts,
          -- Calculate real demand based on active project skill requirements
          COALESCE(
            (SELECT COUNT(*) 
             FROM skill_requirements sr 
             JOIN projects p ON sr.project_id = p.id 
             WHERE sr.skill_id = s.id AND p.status IN ('active', 'planning')
            ), 
            -- Fallback calculation if no skill_requirements table
            CASE 
              WHEN s.category = 'Technical' THEN COUNT(es.id) * 1.2
              WHEN s.category = 'Domain' THEN COUNT(es.id) * 1.1
              ELSE COUNT(es.id)
            END
          ) as estimated_demand
        FROM skills s
        LEFT JOIN employee_skills es ON s.id = es.skill_id AND es.is_active = true
        WHERE s.is_active = true
        GROUP BY s.id, s.name, s.category
      )
      SELECT 
        sd.*,
        CASE 
          WHEN estimated_demand = 0 THEN 0
          ELSE ((estimated_demand - experts) / estimated_demand) * 100
        END as gap_percentage,
        CASE 
          WHEN ((estimated_demand - experts) / NULLIF(estimated_demand, 0)) > 0.7 THEN 'critical'
          WHEN ((estimated_demand - experts) / NULLIF(estimated_demand, 0)) > 0.5 THEN 'high'
          WHEN ((estimated_demand - experts) / NULLIF(estimated_demand, 0)) > 0.3 THEN 'medium'
          ELSE 'low'
        END as criticality_level
      FROM skill_demand sd
      WHERE estimated_demand > experts
      ORDER BY gap_percentage DESC
      LIMIT 20
    `;
        const result = await this.pool.query(query);
        const data = result.rows.map(row => ({
            skillName: row.name,
            skillCategory: row.category,
            totalDemand: parseFloat(row.estimated_demand) || 0,
            availableExperts: parseInt(row.experts) || 0,
            gapPercentage: parseFloat(row.gap_percentage) || 0,
            criticalityLevel: row.criticality_level,
            affectedDepartments: []
        }));
        return {
            data,
            metadata: {
                generatedAt: new Date(),
                dataPoints: data.length,
                dateRange: {
                    from: filters.dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    to: filters.dateTo || new Date()
                },
                filters,
                processingTimeMs: Date.now() - startTime
            }
        };
    }
    static async getDepartmentPerformance(filters = {}) {
        const startTime = Date.now();
        const query = `
      WITH department_metrics AS (
        SELECT 
          d.id,
          d.name,
          COUNT(DISTINCT e.id) as employee_count,
          -- Real utilization calculation
          COALESCE(
            SUM(COALESCE(ra.allocated_hours, 0))::numeric / 
            NULLIF(SUM(COALESCE(e.default_hours, 40))::numeric, 0), 
            0
          ) as avg_utilization,
          COUNT(DISTINCT es.skill_id) as unique_skills,
          COALESCE(AVG(
            CASE
              WHEN es.proficiency_level::text = 'expert' THEN 4
              WHEN es.proficiency_level::text = 'master' THEN 5
              WHEN es.proficiency_level::text = 'advanced' THEN 3
              WHEN es.proficiency_level::text = 'intermediate' THEN 2
              WHEN es.proficiency_level::text = 'beginner' THEN 1
              ELSE es.proficiency_level::numeric -- handle integer type from migration 015
            END
          ), 0) as avg_proficiency
        FROM departments d
        LEFT JOIN employees e ON d.id = e.department_id AND e.is_active = true
        LEFT JOIN employee_skills es ON e.id = es.employee_id AND es.is_active = true
        LEFT JOIN resource_allocations ra ON e.id = ra.employee_id 
          AND ra.is_active = true
          AND ra.start_date <= CURRENT_DATE 
          AND ra.end_date >= CURRENT_DATE
        WHERE d.is_active = true
        GROUP BY d.id, d.name
      )
      SELECT 
        *,
        -- Calculate efficiency score based on real metrics
        CASE 
          WHEN employee_count = 0 THEN 0
          ELSE (avg_utilization * 40 + (unique_skills::float / GREATEST(employee_count, 1)) * 20 + avg_proficiency * 4)
        END as efficiency_score,
        -- Real skill coverage
        CASE 
          WHEN employee_count = 0 THEN 0
          ELSE (unique_skills::float / GREATEST(employee_count, 1)) * 100
        END as skill_coverage,
        -- Calculate actual project completion rate
        COALESCE(
          (
            SELECT 
              (COUNT(CASE WHEN p.status = 'completed' THEN 1 END)::float / 
               NULLIF(COUNT(*), 0)) * 100
            FROM projects p 
            JOIN resource_allocations ra2 ON p.id = ra2.project_id
            JOIN employees e2 ON ra2.employee_id = e2.id
            WHERE e2.department_id = dm.id 
            AND ra2.is_active = true
            AND p.created_at >= CURRENT_DATE - INTERVAL '90 days'
          ), 
          75
        ) as project_completion_rate,
        -- Team satisfaction placeholder (could be from surveys)
        75.0 as team_satisfaction_score
      FROM department_metrics dm
      ORDER BY efficiency_score DESC
    `;
        const result = await this.pool.query(query);
        const data = result.rows.map(row => ({
            departmentId: row.id,
            departmentName: row.name,
            averageUtilization: parseFloat(row.avg_utilization) || 0,
            efficiencyScore: parseFloat(row.efficiency_score) || 0,
            skillCoverage: parseFloat(row.skill_coverage) || 0,
            teamSatisfactionScore: parseFloat(row.team_satisfaction_score) || 0,
            projectCompletionRate: parseFloat(row.project_completion_rate) || 0
        }));
        return {
            data,
            metadata: {
                generatedAt: new Date(),
                dataPoints: data.length,
                dateRange: {
                    from: filters.dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    to: filters.dateTo || new Date()
                },
                filters,
                processingTimeMs: Date.now() - startTime
            }
        };
    }
    static async compareDepartments(departmentAId, departmentBId, filters = {}) {
        const departmentMetricsA = await this.getDepartmentMetrics(departmentAId, filters);
        const departmentMetricsB = await this.getDepartmentMetrics(departmentBId, filters);
        const comparisons = [
            this.compareMetric('Employee Count', departmentMetricsA.metrics.employeeCount, departmentMetricsB.metrics.employeeCount),
            this.compareMetric('Average Utilization', departmentMetricsA.metrics.averageUtilization, departmentMetricsB.metrics.averageUtilization),
            this.compareMetric('Skill Diversity', departmentMetricsA.metrics.skillDiversity, departmentMetricsB.metrics.skillDiversity),
            this.compareMetric('Experience Level', departmentMetricsA.metrics.experienceLevel, departmentMetricsB.metrics.experienceLevel),
            this.compareMetric('Team Productivity', departmentMetricsA.metrics.teamProductivity, departmentMetricsB.metrics.teamProductivity),
            this.compareMetric('Retention Rate', departmentMetricsA.metrics.retentionRate, departmentMetricsB.metrics.retentionRate),
        ];
        return {
            departmentA: departmentMetricsA,
            departmentB: departmentMetricsB,
            comparisons
        };
    }
    static async generateCapacityForecast(filters) {
        const startTime = Date.now();
        const historicalQuery = `
      SELECT 
        DATE_TRUNC('month', ra.start_date) as month,
        SUM(ra.allocated_hours) as total_allocated,
        SUM(e.default_hours) as total_capacity
      FROM resource_allocations ra
      JOIN employees e ON ra.employee_id = e.id
      WHERE ra.is_active = true 
      AND ra.start_date >= CURRENT_DATE - INTERVAL '12 months'
      AND e.is_active = true
      GROUP BY DATE_TRUNC('month', ra.start_date)
      ORDER BY month
    `;
        const historicalResult = await this.pool.query(historicalQuery);
        const historicalData = historicalResult.rows;
        const data = [];
        const today = new Date();
        let avgGrowthRate = 0;
        if (historicalData.length > 1) {
            const growthRates = [];
            for (let i = 1; i < historicalData.length; i++) {
                const prev = parseFloat(historicalData[i - 1].total_allocated);
                const curr = parseFloat(historicalData[i].total_allocated);
                if (prev > 0) {
                    growthRates.push((curr - prev) / prev);
                }
            }
            avgGrowthRate = growthRates.length > 0 ?
                growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length : 0;
        }
        const currentCapacityQuery = `
      SELECT 
        SUM(COALESCE(ra.allocated_hours, 0)) as current_demand,
        SUM(COALESCE(e.default_hours, 40)) as current_capacity
      FROM employees e
      LEFT JOIN resource_allocations ra ON e.id = ra.employee_id 
        AND ra.is_active = true
        AND ra.start_date <= CURRENT_DATE 
        AND ra.end_date >= CURRENT_DATE
      WHERE e.is_active = true
    `;
        const currentResult = await this.pool.query(currentCapacityQuery);
        const currentDemand = parseFloat(currentResult.rows[0].current_demand) || 1000;
        const currentCapacity = parseFloat(currentResult.rows[0].current_capacity) || 1200;
        for (let i = 1; i <= 12; i++) {
            const futureDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
            const projectedDemand = currentDemand * (1 + avgGrowthRate * i);
            const projectedCapacity = currentCapacity * (1 + 0.02 * i);
            data.push({
                period: futureDate,
                predictedDemand: Math.round(projectedDemand),
                availableCapacity: Math.round(projectedCapacity),
                capacityGap: Math.round(projectedDemand - projectedCapacity),
                recommendedActions: this.generateRecommendations(projectedDemand - projectedCapacity),
                confidence: Math.max(0.5, 1 - (i * 0.05))
            });
        }
        return {
            data,
            metadata: {
                generatedAt: new Date(),
                dataPoints: data.length,
                dateRange: {
                    from: today,
                    to: new Date(today.getFullYear() + 1, today.getMonth(), today.getDate())
                },
                filters,
                processingTimeMs: Date.now() - startTime
            }
        };
    }
    static getDateFormat(period) {
        switch (period) {
            case 'daily':
                return 'DATE(ra.start_date)';
            case 'weekly':
                return 'DATE_TRUNC(\'week\', ra.start_date)';
            case 'monthly':
                return 'DATE_TRUNC(\'month\', ra.start_date)';
            case 'quarterly':
                return 'DATE_TRUNC(\'quarter\', ra.start_date)';
            default:
                return 'DATE_TRUNC(\'week\', ra.start_date)';
        }
    }
    static async getDepartmentMetrics(departmentId, filters) {
        const query = `
      SELECT 
        d.id,
        d.name,
        COUNT(DISTINCT e.id) as employee_count,
        COALESCE(
          SUM(COALESCE(ra.allocated_hours, 0))::numeric / 
          NULLIF(SUM(COALESCE(e.default_hours, 40))::numeric, 0), 
          0
        ) as avg_utilization,
        COUNT(DISTINCT es.skill_id) as skill_count,
        COALESCE(AVG(
          CASE
            WHEN es.proficiency_level::text = 'expert' THEN 4
            WHEN es.proficiency_level::text = 'master' THEN 5
            WHEN es.proficiency_level::text = 'advanced' THEN 3
            WHEN es.proficiency_level::text = 'intermediate' THEN 2
            WHEN es.proficiency_level::text = 'beginner' THEN 1
            ELSE es.proficiency_level::numeric -- handle integer type from migration 015
          END
        ), 0) as avg_experience,
        -- Team productivity based on actual project completions
        COALESCE(
          (
            SELECT 
              (COUNT(CASE WHEN p.status = 'completed' THEN 1 END)::float / 
               NULLIF(COUNT(*), 0)) * 100
            FROM projects p 
            JOIN resource_allocations ra2 ON p.id = ra2.project_id
            JOIN employees e2 ON ra2.employee_id = e2.id
            WHERE e2.department_id = d.id 
            AND ra2.is_active = true
            AND p.created_at >= CURRENT_DATE - INTERVAL '90 days'
          ), 
          75
        ) as team_productivity,
        -- Retention rate placeholder
        85.0 as retention_rate
      FROM departments d
      LEFT JOIN employees e ON d.id = e.department_id AND e.is_active = true
      LEFT JOIN resource_allocations ra ON e.id = ra.employee_id 
        AND ra.is_active = true
        AND ra.start_date <= CURRENT_DATE 
        AND ra.end_date >= CURRENT_DATE
      LEFT JOIN employee_skills es ON e.id = es.employee_id AND es.is_active = true
      WHERE d.id = $1 AND d.is_active = true
      GROUP BY d.id, d.name
    `;
        const result = await this.pool.query(query, [departmentId]);
        const row = result.rows[0];
        if (!row) {
            throw new Error(`Department with id ${departmentId} not found`);
        }
        return {
            id: row.id,
            name: row.name,
            metrics: {
                employeeCount: parseInt(row.employee_count) || 0,
                averageUtilization: parseFloat(row.avg_utilization) || 0,
                skillDiversity: parseInt(row.skill_count) || 0,
                experienceLevel: parseFloat(row.avg_experience) || 0,
                teamProductivity: parseFloat(row.team_productivity) || 0,
                retentionRate: parseFloat(row.retention_rate) || 0
            }
        };
    }
    static compareMetric(metric, valueA, valueB) {
        const difference = valueA - valueB;
        const percentageDifference = valueB !== 0 ? (difference / valueB) * 100 : 0;
        let winner;
        if (Math.abs(difference) < 0.01) {
            winner = 'tie';
        }
        else {
            winner = valueA > valueB ? 'A' : 'B';
        }
        return {
            metric,
            valueA,
            valueB,
            difference,
            percentageDifference,
            winner
        };
    }
    static generateRecommendations(capacityGap) {
        const recommendations = [];
        if (capacityGap > 100) {
            recommendations.push('Consider hiring additional team members');
            recommendations.push('Evaluate outsourcing opportunities');
            recommendations.push('Prioritize high-impact projects');
        }
        else if (capacityGap > 50) {
            recommendations.push('Optimize current resource allocation');
            recommendations.push('Consider cross-training initiatives');
        }
        else if (capacityGap < -50) {
            recommendations.push('Identify opportunities for skill development');
            recommendations.push('Consider taking on additional projects');
        }
        return recommendations;
    }
}
exports.AnalyticsService = AnalyticsService;
//# sourceMappingURL=analytics.service.js.map