import { DatabaseService } from '../../database/database.service';

export interface TimeSeriesData {
  timestamp: Date;
  value: number;
  metadata?: Record<string, any>;
}

export interface DataAggregationConfig {
  timeWindow: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  aggregationMethod: 'sum' | 'average' | 'max' | 'min' | 'count';
  groupBy: string[];
  filters: Record<string, any>;
}

export interface AggregatedData {
  timestamp: Date;
  value: number;
  metadata: Record<string, any>;
  confidence: number;
  sampleSize: number;
}

export interface HistoricalPattern {
  patternType: 'seasonal' | 'trend' | 'cyclical' | 'irregular';
  description: string;
  strength: number; // 0-1 scale
  frequency: number; // days
  amplitude: number;
  phase: number;
  confidence: number;
}

export interface ResourceHistoricalData {
  employeeId: string;
  skill: string;
  utilizationHistory: TimeSeriesData[];
  projectHistory: Array<{
    projectId: number;
    startDate: Date;
    endDate: Date;
    allocation: number;
    role: string;
  }>;
  performanceMetrics: Array<{
    date: Date;
    metric: string;
    value: number;
  }>;
}

/**
 * Historical Data Aggregation Service
 * Processes and aggregates historical resource allocation and project data for ML model training
 */
export class HistoricalDataAggregator {
  private dbService: DatabaseService;
  private cache: Map<string, { data: any; timestamp: Date; ttl: number }> = new Map();

  constructor(dbService: DatabaseService) {
    this.dbService = dbService;
  }

  /**
   * Aggregate resource utilization data over time
   */
  async aggregateResourceUtilization(config: DataAggregationConfig): Promise<AggregatedData[]> {
    const cacheKey = `utilization_${JSON.stringify(config)}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    const query = this.buildUtilizationQuery(config);
    const rawData = await this.dbService.query(query.sql, query.params);

    const aggregatedData = this.processRawData(rawData.rows, config);
    this.setCachedData(cacheKey, aggregatedData, 3600000); // 1 hour TTL

    return aggregatedData;
  }

  /**
   * Aggregate project performance data
   */
  async aggregateProjectPerformance(config: DataAggregationConfig): Promise<AggregatedData[]> {
    const cacheKey = `project_performance_${JSON.stringify(config)}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    const query = this.buildProjectQuery(config);
    const rawData = await this.dbService.query(query.sql, query.params);

    const aggregatedData = this.processProjectData(rawData.rows, config);
    this.setCachedData(cacheKey, aggregatedData, 7200000); // 2 hours TTL

    return aggregatedData;
  }

  /**
   * Get comprehensive historical data for a specific resource
   */
  async getResourceHistory(employeeId: string, timeRange: { start: Date; end: Date }): Promise<ResourceHistoricalData> {
    const utilizationData = await this.getResourceUtilizationHistory(employeeId, timeRange);
    const projectData = await this.getResourceProjectHistory(employeeId, timeRange);
    const performanceData = await this.getResourcePerformanceHistory(employeeId, timeRange);
    const skillData = await this.getResourceSkills(employeeId);

    return {
      employeeId,
      skill: skillData[0] || 'unknown',
      utilizationHistory: utilizationData,
      projectHistory: projectData,
      performanceMetrics: performanceData
    };
  }

  /**
   * Detect patterns in historical data using statistical analysis
   */
  async detectPatterns(data: TimeSeriesData[], patternTypes: string[] = ['seasonal', 'trend']): Promise<HistoricalPattern[]> {
    const patterns: HistoricalPattern[] = [];

    if (patternTypes.includes('seasonal')) {
      const seasonalPattern = await this.detectSeasonalPattern(data);
      if (seasonalPattern) patterns.push(seasonalPattern);
    }

    if (patternTypes.includes('trend')) {
      const trendPattern = await this.detectTrendPattern(data);
      if (trendPattern) patterns.push(trendPattern);
    }

    if (patternTypes.includes('cyclical')) {
      const cyclicalPattern = await this.detectCyclicalPattern(data);
      if (cyclicalPattern) patterns.push(cyclicalPattern);
    }

    return patterns;
  }

  /**
   * Get aggregated skill demand over time
   */
  async aggregateSkillDemand(skills: string[], timeRange: { start: Date; end: Date }): Promise<Record<string, TimeSeriesData[]>> {
    const skillDemand: Record<string, TimeSeriesData[]> = {};

    for (const skill of skills) {
      const query = `
        SELECT 
          DATE(aa.start_date) as date,
          SUM(aa.allocation_percentage / 100.0) as demand,
          COUNT(*) as projects
        FROM assignment_allocations aa
        JOIN project_roles pr ON aa.role_id = pr.id
        JOIN employees e ON aa.employee_id = e.id
        WHERE e.skills LIKE $1
          AND aa.start_date >= $2
          AND aa.end_date <= $3
        GROUP BY DATE(aa.start_date)
        ORDER BY date
      `;

      const rawData = await this.dbService.query(query, [
        `%${skill}%`,
        timeRange.start.toISOString(),
        timeRange.end.toISOString()
      ]);

      skillDemand[skill] = rawData.rows.map((row: any) => ({
        timestamp: new Date(row.date),
        value: parseFloat(row.demand),
        metadata: { projects: row.projects }
      }));
    }

    return skillDemand;
  }

  /**
   * Calculate resource capacity trends
   */
  async calculateCapacityTrends(timeRange: { start: Date; end: Date }): Promise<{
    totalCapacity: TimeSeriesData[];
    availableCapacity: TimeSeriesData[];
    utilizationRate: TimeSeriesData[];
    bySkill: Record<string, TimeSeriesData[]>;
  }> {
    // Get total capacity over time
    const totalCapacityQuery = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total_employees,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_employees
      FROM employees
      WHERE created_at >= $1 AND created_at <= $2
      GROUP BY DATE(created_at)
      ORDER BY date
    `;

    const capacityData = await this.dbService.query(totalCapacityQuery, [
      timeRange.start.toISOString(),
      timeRange.end.toISOString()
    ]);

    // Get allocation data
    const allocationQuery = `
      SELECT 
        DATE(aa.start_date) as date,
        SUM(aa.allocation_percentage / 100.0) as total_allocation
      FROM assignment_allocations aa
      WHERE aa.start_date >= $1 AND aa.end_date <= $2
      GROUP BY DATE(aa.start_date)
      ORDER BY date
    `;

    const allocationData = await this.dbService.query(allocationQuery, [
      timeRange.start.toISOString(),
      timeRange.end.toISOString()
    ]);

    // Process and combine data
    const totalCapacity: TimeSeriesData[] = capacityData.rows.map((row: any) => ({
      timestamp: new Date(row.date),
      value: row.active_employees,
      metadata: { total_employees: row.total_employees }
    }));

    const utilizationMap = new Map<string, number>();
    allocationData.rows.forEach((row: any) => {
      utilizationMap.set(row.date, row.total_allocation);
    });

    const utilizationRate: TimeSeriesData[] = totalCapacity.map(capacity => {
      const allocated = utilizationMap.get(capacity.timestamp.toISOString().split('T')[0]) || 0;
      return {
        timestamp: capacity.timestamp,
        value: capacity.value > 0 ? allocated / capacity.value : 0,
        metadata: { allocated, capacity: capacity.value }
      };
    });

    const availableCapacity: TimeSeriesData[] = totalCapacity.map((capacity, index) => ({
      timestamp: capacity.timestamp,
      value: Math.max(0, capacity.value - (utilizationRate[index]?.metadata?.allocated || 0)),
      metadata: capacity.metadata
    }));

    // Get capacity by skill
    const skillCapacityQuery = `
      SELECT 
        DATE(e.created_at) as date,
        TRIM(UNNEST(STRING_TO_ARRAY(e.skills, ','))) as skill,
        COUNT(*) as skill_count
      FROM employees e
      WHERE e.created_at >= $1 AND e.created_at <= $2
        AND e.status = 'active'
      GROUP BY DATE(e.created_at), skill
      ORDER BY date, skill
    `;

    const skillData = await this.dbService.query(skillCapacityQuery, [
      timeRange.start.toISOString(),
      timeRange.end.toISOString()
    ]);

    const bySkill: Record<string, TimeSeriesData[]> = {};
    skillData.rows.forEach((row: any) => {
      if (!bySkill[row.skill]) {
        bySkill[row.skill] = [];
      }
      bySkill[row.skill].push({
        timestamp: new Date(row.date),
        value: row.skill_count,
        metadata: {}
      });
    });

    return {
      totalCapacity,
      availableCapacity,
      utilizationRate,
      bySkill
    };
  }

  /**
   * Generate training dataset for ML models
   */
  async generateTrainingDataset(config: {
    features: string[];
    target: string;
    timeRange: { start: Date; end: Date };
    samplingFrequency: 'daily' | 'weekly' | 'monthly';
  }): Promise<{
    features: number[][];
    targets: number[];
    metadata: Record<string, any>[];
  }> {
    const features: number[][] = [];
    const targets: number[] = [];
    const metadata: Record<string, any>[] = [];

    // Build feature extraction queries
    const featureQueries = await this.buildFeatureQueries(config.features, config.timeRange, config.samplingFrequency);
    const targetQuery = await this.buildTargetQuery(config.target, config.timeRange, config.samplingFrequency);

    // Execute queries and combine data
    const featureData = await Promise.all(
      featureQueries.map(query => this.dbService.query(query.sql, query.params))
    );
    const targetData = await this.dbService.query(targetQuery.sql, targetQuery.params);

    // Align data by timestamp and create feature vectors
    const timeIndex = this.createTimeIndex(config.timeRange, config.samplingFrequency);
    
    for (const timestamp of timeIndex) {
      const featureVector: number[] = [];
      const timestampStr = timestamp.toISOString().split('T')[0];
      
      // Extract features for this timestamp
      for (let i = 0; i < featureData.length; i++) {
        const featureValue = this.findValueForTimestamp(featureData[i].rows, timestampStr);
        featureVector.push(featureValue || 0);
      }
      
      // Extract target for this timestamp
      const targetValue = this.findValueForTimestamp(targetData.rows, timestampStr);
      
      if (targetValue !== null && featureVector.length === config.features.length) {
        features.push(featureVector);
        targets.push(targetValue);
        metadata.push({
          timestamp: timestamp,
          features: config.features.reduce((acc, feature, index) => ({
            ...acc,
            [feature]: featureVector[index]
          }), {})
        });
      }
    }

    return { features, targets, metadata };
  }

  // Private helper methods

  private buildUtilizationQuery(config: DataAggregationConfig): { sql: string; params: any[] } {
    let sql = `
      SELECT 
        ${this.getDateTrunc(config.timeWindow, 'aa.start_date')} as period,
        ${this.getAggregationFunction(config.aggregationMethod, 'aa.allocation_percentage / 100.0')} as value,
        COUNT(*) as sample_size
    `;

    if (config.groupBy.length > 0) {
      sql += `, ${config.groupBy.join(', ')}`;
    }

    sql += `
      FROM assignment_allocations aa
      JOIN employees e ON aa.employee_id = e.id
      JOIN project_roles pr ON aa.role_id = pr.id
      JOIN projects p ON pr.project_id = p.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    // Apply filters
    for (const [key, value] of Object.entries(config.filters)) {
      sql += ` AND ${key} = $${paramIndex}`;
      params.push(value);
      paramIndex++;
    }

    sql += ` GROUP BY period`;
    if (config.groupBy.length > 0) {
      sql += `, ${config.groupBy.join(', ')}`;
    }
    sql += ` ORDER BY period`;

    return { sql, params };
  }

  private buildProjectQuery(config: DataAggregationConfig): { sql: string; params: any[] } {
    let sql = `
      SELECT 
        ${this.getDateTrunc(config.timeWindow, 'p.start_date')} as period,
        ${this.getAggregationFunction(config.aggregationMethod, 'p.budget')} as value,
        COUNT(*) as sample_size,
        AVG(EXTRACT(EPOCH FROM (p.end_date - p.start_date)) / 86400) as avg_duration_days
      FROM projects p
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(config.filters)) {
      sql += ` AND p.${key} = $${paramIndex}`;
      params.push(value);
      paramIndex++;
    }

    sql += ` GROUP BY period ORDER BY period`;

    return { sql, params };
  }

  private processRawData(rawData: any[], config: DataAggregationConfig): AggregatedData[] {
    return rawData.map(row => ({
      timestamp: new Date(row.period),
      value: parseFloat(row.value),
      metadata: {
        aggregation_method: config.aggregationMethod,
        time_window: config.timeWindow,
        ...row
      },
      confidence: this.calculateConfidence(row.sample_size),
      sampleSize: row.sample_size
    }));
  }

  private processProjectData(rawData: any[], config: DataAggregationConfig): AggregatedData[] {
    return rawData.map(row => ({
      timestamp: new Date(row.period),
      value: parseFloat(row.value),
      metadata: {
        avg_duration_days: row.avg_duration_days,
        aggregation_method: config.aggregationMethod,
        ...row
      },
      confidence: this.calculateConfidence(row.sample_size),
      sampleSize: row.sample_size
    }));
  }

  private async getResourceUtilizationHistory(employeeId: string, timeRange: { start: Date; end: Date }): Promise<TimeSeriesData[]> {
    const query = `
      SELECT 
        aa.start_date as timestamp,
        SUM(aa.allocation_percentage / 100.0) as utilization,
        STRING_AGG(p.name, ', ') as projects
      FROM assignment_allocations aa
      JOIN project_roles pr ON aa.role_id = pr.id
      JOIN projects p ON pr.project_id = p.id
      WHERE aa.employee_id = $1
        AND aa.start_date >= $2
        AND aa.end_date <= $3
      GROUP BY aa.start_date
      ORDER BY aa.start_date
    `;

    const results = await this.dbService.query(query, [
      employeeId,
      timeRange.start.toISOString(),
      timeRange.end.toISOString()
    ]);

    return results.rows.map((row: any) => ({
      timestamp: new Date(row.timestamp),
      value: parseFloat(row.utilization),
      metadata: { projects: row.projects }
    }));
  }

  private async getResourceProjectHistory(employeeId: string, timeRange: { start: Date; end: Date }): Promise<Array<{
    projectId: number;
    startDate: Date;
    endDate: Date;
    allocation: number;
    role: string;
  }>> {
    const query = `
      SELECT 
        p.id as project_id,
        aa.start_date,
        aa.end_date,
        aa.allocation_percentage as allocation,
        pr.name as role
      FROM assignment_allocations aa
      JOIN project_roles pr ON aa.role_id = pr.id
      JOIN projects p ON pr.project_id = p.id
      WHERE aa.employee_id = $1
        AND aa.start_date >= $2
        AND aa.end_date <= $3
      ORDER BY aa.start_date
    `;

    const results = await this.dbService.query(query, [
      employeeId,
      timeRange.start.toISOString(),
      timeRange.end.toISOString()
    ]);

    return results.rows.map((row: any) => ({
      projectId: row.project_id,
      startDate: new Date(row.start_date),
      endDate: new Date(row.end_date),
      allocation: row.allocation,
      role: row.role
    }));
  }

  private async getResourcePerformanceHistory(employeeId: string, timeRange: { start: Date; end: Date }): Promise<Array<{
    date: Date;
    metric: string;
    value: number;
  }>> {
    // Placeholder for performance metrics - would integrate with performance tracking system
    const query = `
      SELECT 
        created_at as date,
        'productivity' as metric,
        1.0 as value
      FROM assignment_allocations
      WHERE employee_id = $1
        AND created_at >= $2
        AND created_at <= $3
      LIMIT 1
    `;

    const results = await this.dbService.query(query, [
      employeeId,
      timeRange.start.toISOString(),
      timeRange.end.toISOString()
    ]);

    return results.rows.map((row: any) => ({
      date: new Date(row.date),
      metric: row.metric,
      value: parseFloat(row.value)
    }));
  }

  private async getResourceSkills(employeeId: string): Promise<string[]> {
    const query = 'SELECT skills FROM employees WHERE id = $1';
    const results = await this.dbService.query(query, [employeeId]);
    
    if (results.rows.length > 0 && results.rows[0].skills) {
      return results.rows[0].skills.split(',').map((skill: string) => skill.trim());
    }
    
    return [];
  }

  private async detectSeasonalPattern(data: TimeSeriesData[]): Promise<HistoricalPattern | null> {
    if (data.length < 14) return null; // Need at least 2 weeks of data

    const values = data.map(d => d.value);
    const periods = [7, 14, 30, 90]; // Weekly, bi-weekly, monthly, quarterly patterns

    let bestPattern: HistoricalPattern | null = null;
    let maxStrength = 0;

    for (const period of periods) {
      if (data.length < period * 2) continue;

      const strength = this.calculateSeasonalStrength(values, period);
      if (strength > maxStrength && strength > 0.3) {
        maxStrength = strength;
        bestPattern = {
          patternType: 'seasonal',
          description: `${period}-day seasonal pattern`,
          strength,
          frequency: period,
          amplitude: this.calculateAmplitude(values, period),
          phase: this.calculatePhase(values, period),
          confidence: Math.min(0.95, strength * 1.2)
        };
      }
    }

    return bestPattern;
  }

  private async detectTrendPattern(data: TimeSeriesData[]): Promise<HistoricalPattern | null> {
    if (data.length < 7) return null;

    const values = data.map(d => d.value);
    const trend = this.calculateLinearTrend(values);
    
    const strength = Math.abs(trend.correlation);
    if (strength < 0.3) return null;

    return {
      patternType: 'trend',
      description: trend.slope > 0 ? 'Increasing trend' : 'Decreasing trend',
      strength,
      frequency: 0, // Trends don't have frequency
      amplitude: Math.abs(trend.slope * data.length),
      phase: 0,
      confidence: Math.min(0.95, strength * 1.1)
    };
  }

  private async detectCyclicalPattern(data: TimeSeriesData[]): Promise<HistoricalPattern | null> {
    // Simplified cyclical detection - would use FFT or similar in production
    if (data.length < 30) return null;

    const values = data.map(d => d.value);
    const cycles = this.findCycles(values);
    
    if (cycles.length === 0) return null;

    const avgCycleLength = cycles.reduce((sum, c) => sum + c.length, 0) / cycles.length;
    const strength = this.calculateCyclicalStrength(values, avgCycleLength);

    if (strength < 0.4) return null;

    return {
      patternType: 'cyclical',
      description: `${Math.round(avgCycleLength)}-day cyclical pattern`,
      strength,
      frequency: avgCycleLength,
      amplitude: this.calculateAmplitude(values, avgCycleLength),
      phase: 0,
      confidence: Math.min(0.9, strength)
    };
  }

  private calculateSeasonalStrength(values: number[], period: number): number {
    // Calculate seasonal strength using autocorrelation
    if (values.length < period * 2) return 0;

    let sumXY = 0;
    let sumX = 0;
    let sumY = 0;
    let sumX2 = 0;
    let sumY2 = 0;
    let n = 0;

    for (let i = 0; i < values.length - period; i++) {
      const x = values[i];
      const y = values[i + period];
      
      sumXY += x * y;
      sumX += x;
      sumY += y;
      sumX2 += x * x;
      sumY2 += y * y;
      n++;
    }

    if (n === 0) return 0;

    const correlation = (n * sumXY - sumX * sumY) / 
      Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return Math.abs(correlation || 0);
  }

  private calculateLinearTrend(values: number[]): { slope: number; correlation: number } {
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * values[i], 0);
    const sumX2 = x.reduce((sum, val) => sum + val * val, 0);
    const sumY2 = values.reduce((sum, val) => sum + val * val, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const correlation = (n * sumXY - sumX * sumY) / 
      Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    return { slope: slope || 0, correlation: correlation || 0 };
  }

  private calculateAmplitude(values: number[], period: number): number {
    // Calculate amplitude as the standard deviation of seasonal components
    const seasonalComponents = [];
    
    for (let phase = 0; phase < period; phase++) {
      const phaseValues = [];
      for (let i = phase; i < values.length; i += period) {
        phaseValues.push(values[i]);
      }
      if (phaseValues.length > 0) {
        const avg = phaseValues.reduce((sum, v) => sum + v, 0) / phaseValues.length;
        seasonalComponents.push(avg);
      }
    }

    const mean = seasonalComponents.reduce((sum, v) => sum + v, 0) / seasonalComponents.length;
    const variance = seasonalComponents.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / seasonalComponents.length;
    
    return Math.sqrt(variance);
  }

  private calculatePhase(values: number[], period: number): number {
    // Find the phase where the seasonal pattern starts
    const seasonalComponents = [];
    
    for (let phase = 0; phase < period; phase++) {
      const phaseValues = [];
      for (let i = phase; i < values.length; i += period) {
        phaseValues.push(values[i]);
      }
      if (phaseValues.length > 0) {
        const avg = phaseValues.reduce((sum, v) => sum + v, 0) / phaseValues.length;
        seasonalComponents.push({ phase, value: avg });
      }
    }

    // Find phase with maximum value
    const maxPhase = seasonalComponents.reduce((max, current) => 
      current.value > max.value ? current : max, seasonalComponents[0]);

    return maxPhase?.phase || 0;
  }

  private findCycles(values: number[]): Array<{ start: number; end: number; length: number }> {
    // Simple peak-to-peak cycle detection
    const peaks = [];
    const cycles = [];

    // Find peaks
    for (let i = 1; i < values.length - 1; i++) {
      if (values[i] > values[i - 1] && values[i] > values[i + 1]) {
        peaks.push(i);
      }
    }

    // Create cycles between consecutive peaks
    for (let i = 0; i < peaks.length - 1; i++) {
      cycles.push({
        start: peaks[i],
        end: peaks[i + 1],
        length: peaks[i + 1] - peaks[i]
      });
    }

    return cycles;
  }

  private calculateCyclicalStrength(values: number[], cycleLength: number): number {
    // Simplified cyclical strength calculation
    if (values.length < cycleLength * 2) return 0;

    const cycles = Math.floor(values.length / cycleLength);
    if (cycles < 2) return 0;

    let totalCorrelation = 0;
    let count = 0;

    for (let c = 0; c < cycles - 1; c++) {
      const cycle1 = values.slice(c * cycleLength, (c + 1) * cycleLength);
      const cycle2 = values.slice((c + 1) * cycleLength, (c + 2) * cycleLength);
      
      if (cycle2.length === cycleLength) {
        const correlation = this.calculateCorrelation(cycle1, cycle2);
        totalCorrelation += Math.abs(correlation);
        count++;
      }
    }

    return count > 0 ? totalCorrelation / count : 0;
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length) return 0;

    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumX2 = x.reduce((sum, val) => sum + val * val, 0);
    const sumY2 = y.reduce((sum, val) => sum + val * val, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    return denominator !== 0 ? numerator / denominator : 0;
  }

  private getDateTrunc(window: string, column: string): string {
    switch (window) {
      case 'daily':
        return `DATE(${column})`;
      case 'weekly':
        return `DATE_TRUNC('week', ${column})`;
      case 'monthly':
        return `DATE_TRUNC('month', ${column})`;
      case 'quarterly':
        return `DATE_TRUNC('quarter', ${column})`;
      default:
        return `DATE(${column})`;
    }
  }

  private getAggregationFunction(method: string, column: string): string {
    switch (method) {
      case 'sum':
        return `SUM(${column})`;
      case 'average':
        return `AVG(${column})`;
      case 'max':
        return `MAX(${column})`;
      case 'min':
        return `MIN(${column})`;
      case 'count':
        return `COUNT(${column})`;
      default:
        return `AVG(${column})`;
    }
  }

  private calculateConfidence(sampleSize: number): number {
    // Simple confidence calculation based on sample size
    if (sampleSize >= 100) return 0.95;
    if (sampleSize >= 50) return 0.85;
    if (sampleSize >= 20) return 0.75;
    if (sampleSize >= 10) return 0.65;
    return 0.5;
  }

  private async buildFeatureQueries(features: string[], timeRange: { start: Date; end: Date }, frequency: string): Promise<Array<{ sql: string; params: any[] }>> {
    const queries: Array<{ sql: string; params: any[] }> = [];

    for (const feature of features) {
      let query = '';
      const params = [timeRange.start.toISOString(), timeRange.end.toISOString()];

      switch (feature) {
        case 'team_size':
          query = `
            SELECT 
              ${this.getDateTrunc(frequency, 'created_at')} as date,
              COUNT(*) as value
            FROM employees
            WHERE created_at >= $1 AND created_at <= $2 AND status = 'active'
            GROUP BY ${this.getDateTrunc(frequency, 'created_at')}
            ORDER BY date
          `;
          break;
        case 'active_projects':
          query = `
            SELECT 
              ${this.getDateTrunc(frequency, 'start_date')} as date,
              COUNT(*) as value
            FROM projects
            WHERE start_date >= $1 AND start_date <= $2 AND status = 'active'
            GROUP BY ${this.getDateTrunc(frequency, 'start_date')}
            ORDER BY date
          `;
          break;
        case 'utilization_rate':
          query = `
            SELECT 
              ${this.getDateTrunc(frequency, 'aa.start_date')} as date,
              AVG(aa.allocation_percentage / 100.0) as value
            FROM assignment_allocations aa
            WHERE aa.start_date >= $1 AND aa.start_date <= $2
            GROUP BY ${this.getDateTrunc(frequency, 'aa.start_date')}
            ORDER BY date
          `;
          break;
        default:
          // Generic feature query
          query = `
            SELECT 
              ${this.getDateTrunc(frequency, 'created_at')} as date,
              1.0 as value
            FROM employees
            WHERE created_at >= $1 AND created_at <= $2
            LIMIT 1
          `;
      }

      queries.push({ sql: query, params });
    }

    return queries;
  }

  private async buildTargetQuery(target: string, timeRange: { start: Date; end: Date }, frequency: string): Promise<{ sql: string; params: any[] }> {
    let sql = '';
    const params = [timeRange.start.toISOString(), timeRange.end.toISOString()];

    switch (target) {
      case 'resource_demand':
        sql = `
          SELECT 
            ${this.getDateTrunc(frequency, 'aa.start_date')} as date,
            SUM(aa.allocation_percentage / 100.0) as value
          FROM assignment_allocations aa
          WHERE aa.start_date >= $1 AND aa.start_date <= $2
          GROUP BY ${this.getDateTrunc(frequency, 'aa.start_date')}
          ORDER BY date
        `;
        break;
      case 'project_count':
        sql = `
          SELECT 
            ${this.getDateTrunc(frequency, 'start_date')} as date,
            COUNT(*) as value
          FROM projects
          WHERE start_date >= $1 AND start_date <= $2
          GROUP BY ${this.getDateTrunc(frequency, 'start_date')}
          ORDER BY date
        `;
        break;
      default:
        sql = `
          SELECT 
            ${this.getDateTrunc(frequency, 'created_at')} as date,
            1.0 as value
          FROM employees
          WHERE created_at >= $1 AND created_at <= $2
          LIMIT 1
        `;
    }

    return { sql, params };
  }

  private createTimeIndex(timeRange: { start: Date; end: Date }, frequency: string): Date[] {
    const dates: Date[] = [];
    const current = new Date(timeRange.start);
    const end = new Date(timeRange.end);

    while (current <= end) {
      dates.push(new Date(current));
      
      switch (frequency) {
        case 'daily':
          current.setDate(current.getDate() + 1);
          break;
        case 'weekly':
          current.setDate(current.getDate() + 7);
          break;
        case 'monthly':
          current.setMonth(current.getMonth() + 1);
          break;
      }
    }

    return dates;
  }

  private findValueForTimestamp(data: any[], timestampStr: string): number | null {
    const row = data.find((r: any) => {
      const rowDate = new Date(r.date).toISOString().split('T')[0];
      return rowDate === timestampStr;
    });

    return row ? parseFloat(row.value) : null;
  }

  private getCachedData(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp.getTime() < cached.ttl) {
      return cached.data;
    }
    return null;
  }

  private setCachedData(key: string, data: any, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: new Date(),
      ttl
    });
  }
}