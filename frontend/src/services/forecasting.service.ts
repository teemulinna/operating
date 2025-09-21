/**
 * Capacity Forecasting Service
 * Specialized ML models for resource capacity prediction and workforce planning
 */

import * as tf from '@tensorflow/tfjs';
import { predictionService, PredictionResult } from './prediction.service';
import { DataPreprocessingService } from './ml/data-preprocessing.service';
import { TimeSeriesProcessor } from './ml/time-series.service';

export interface CapacityForecast {
  date: Date;
  predicted_capacity: number;
  confidence_interval: [number, number];
  utilization_rate: number;
  bottlenecks: string[];
  recommendations: string[];
}

export interface WorkloadPattern {
  seasonal_trends: number[];
  weekly_patterns: number[];
  monthly_patterns: number[];
  project_cycles: number[];
}

export interface ForecastingConfig {
  horizon_days: number;
  confidence_level: number;
  include_seasonality: boolean;
  include_trends: boolean;
  model_type: 'LSTM' | 'GRU' | 'ARIMA' | 'Prophet';
}

export interface ResourceDemand {
  skill_requirements: Record<string, number>;
  timeline: { start: Date; end: Date };
  priority: 'low' | 'medium' | 'high' | 'critical';
  project_id?: string;
}

export class ForecastingService {
  private timeSeriesProcessor: TimeSeriesProcessor;
  private dataPreprocessor: DataPreprocessingService;
  private forecastModels: Map<string, tf.LayersModel> = new Map();

  constructor() {
    this.timeSeriesProcessor = new TimeSeriesProcessor();
    this.dataPreprocessor = new DataPreprocessingService();
    this.initializeForecastingModels();
  }

  private async initializeForecastingModels(): Promise<void> {
    // Initialize specialized forecasting models
    await this.createLSTMModel();
    await this.createSeasonalModel();
    await this.createDemandForecastModel();
  }

  /**
   * Generate capacity forecast for specified time horizon
   */
  async generateCapacityForecast(
    historicalData: {
      dates: Date[];
      capacity_utilization: number[];
      team_sizes: number[];
      project_demands: number[];
    },
    config: ForecastingConfig = {
      horizon_days: 30,
      confidence_level: 0.95,
      include_seasonality: true,
      include_trends: true,
      model_type: 'LSTM'
    }
  ): Promise<CapacityForecast[]> {
    try {
      console.log('Generating capacity forecast...', config);

      // Preprocess historical data
      const processedData = await this.preprocessTimeSeriesData(historicalData);

      // Detect patterns and seasonality
      const patterns = await this.analyzeWorkloadPatterns(processedData);

      // Generate forecast using selected model
      const forecasts = await this.generateForecastsByModel(
        processedData,
        patterns,
        config
      );

      // Add recommendations and bottleneck detection
      const enrichedForecasts = await this.enrichForecastsWithInsights(forecasts, patterns);

      return enrichedForecasts;

    } catch (error) {
      console.error('Capacity forecasting failed:', error);
      throw error;
    }
  }

  /**
   * Forecast resource demand based on project pipeline
   */
  async forecastResourceDemand(
    projectPipeline: ResourceDemand[],
    availableResources: {
      employee_id: string;
      skills: string[];
      availability: number; // 0-1 scale
      hourly_capacity: number;
    }[],
    forecastHorizon: number = 90
  ): Promise<{
    demand_forecast: CapacityForecast[];
    skill_gaps: { skill: string; gap_hours: number; severity: 'low' | 'medium' | 'high' }[];
    hiring_recommendations: { skill: string; suggested_hires: number; timeline: Date }[];
  }> {
    try {
      // Aggregate demand by skill and timeline
      const skillDemandTimeline = this.aggregateSkillDemand(projectPipeline, forecastHorizon);

      // Calculate available capacity by skill
      const skillCapacityMap = this.calculateSkillCapacity(availableResources);

      // Generate demand forecast
      const demandForecast = await this.forecastSkillDemand(skillDemandTimeline);

      // Identify skill gaps
      const skillGaps = this.identifySkillGaps(demandForecast, skillCapacityMap);

      // Generate hiring recommendations
      const hiringRecommendations = this.generateHiringRecommendations(skillGaps, forecastHorizon);

      return {
        demand_forecast: demandForecast,
        skill_gaps: skillGaps,
        hiring_recommendations: hiringRecommendations
      };

    } catch (error) {
      console.error('Resource demand forecasting failed:', error);
      throw error;
    }
  }

  /**
   * Predict optimal team composition for upcoming projects
   */
  async optimizeTeamComposition(
    projectRequirements: {
      skills_needed: string[];
      effort_hours: number;
      timeline: { start: Date; end: Date };
      complexity_score: number;
    },
    availableTeamMembers: {
      employee_id: string;
      skills: { skill: string; proficiency: number }[];
      availability: number;
      collaboration_score: number;
    }[]
  ): Promise<{
    recommended_team: string[];
    skill_coverage: Record<string, number>;
    predicted_success_rate: number;
    alternative_compositions: Array<{
      team: string[];
      success_rate: number;
      trade_offs: string[];
    }>;
  }> {
    try {
      // Create feature vectors for team composition analysis
      const teamFeatures = this.extractTeamFeatures(projectRequirements, availableTeamMembers);

      // Use prediction service to evaluate team compositions
      const compositions = this.generateTeamCompositions(availableTeamMembers, projectRequirements);
      const evaluations = await Promise.all(
        compositions.map(async (composition) => {
          const features = this.teamCompositionToFeatures(composition, projectRequirements);
          const prediction = await predictionService.predict('team_success_predictor', {
            features,
            metadata: { composition_id: composition.id }
          }) as PredictionResult;

          return {
            team: composition.members,
            success_rate: Array.isArray(prediction.prediction) 
              ? prediction.prediction[0] 
              : prediction.prediction,
            confidence: prediction.confidence,
            features: composition
          };
        })
      );

      // Sort by predicted success rate
      evaluations.sort((a, b) => b.success_rate - a.success_rate);

      const bestComposition = evaluations[0];
      const alternatives = evaluations.slice(1, 4); // Top 3 alternatives

      return {
        recommended_team: bestComposition.team,
        skill_coverage: this.calculateSkillCoverage(bestComposition.features, projectRequirements),
        predicted_success_rate: bestComposition.success_rate,
        alternative_compositions: alternatives.map(alt => ({
          team: alt.team,
          success_rate: alt.success_rate,
          trade_offs: this.identifyTradeOffs(bestComposition.features, alt.features)
        }))
      };

    } catch (error) {
      console.error('Team composition optimization failed:', error);
      throw error;
    }
  }

  /**
   * Analyze workload patterns from historical data
   */
  private async analyzeWorkloadPatterns(data: any): Promise<WorkloadPattern> {
    // Extract seasonal trends (yearly patterns)
    const seasonalTrends = await this.timeSeriesProcessor.extractSeasonalTrends(
      data.capacity_utilization,
      365 // yearly cycle
    );

    // Weekly patterns
    const weeklyPatterns = await this.timeSeriesProcessor.extractWeeklyPatterns(data);

    // Monthly patterns
    const monthlyPatterns = await this.timeSeriesProcessor.extractMonthlyPatterns(data);

    // Project cycle patterns
    const projectCycles = await this.timeSeriesProcessor.detectProjectCycles(data.project_demands);

    return {
      seasonal_trends: seasonalTrends,
      weekly_patterns: weeklyPatterns,
      monthly_patterns: monthlyPatterns,
      project_cycles: projectCycles
    };
  }

  /**
   * Create LSTM model for time series forecasting
   */
  private async createLSTMModel(): Promise<void> {
    const model = tf.sequential();

    // LSTM layers for sequence learning
    model.add(tf.layers.lstm({
      units: 64,
      returnSequences: true,
      inputShape: [30, 5] // 30 time steps, 5 features
    }));

    model.add(tf.layers.dropout({ rate: 0.2 }));

    model.add(tf.layers.lstm({
      units: 32,
      returnSequences: false
    }));

    model.add(tf.layers.dropout({ rate: 0.2 }));

    // Dense layers for final prediction
    model.add(tf.layers.dense({ units: 16, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 1, activation: 'linear' }));

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError',
      metrics: ['mae']
    });

    this.forecastModels.set('lstm_capacity', model);
  }

  /**
   * Create seasonal decomposition model
   */
  private async createSeasonalModel(): Promise<void> {
    const model = tf.sequential();

    // Handle seasonal components
    model.add(tf.layers.dense({
      units: 128,
      activation: 'relu',
      inputShape: [52] // 52 weeks of seasonal data
    }));

    model.add(tf.layers.dropout({ rate: 0.3 }));

    model.add(tf.layers.dense({ units: 64, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 1, activation: 'linear' }));

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError',
      metrics: ['mae']
    });

    this.forecastModels.set('seasonal_model', model);
  }

  /**
   * Create demand forecasting model
   */
  private async createDemandForecastModel(): Promise<void> {
    const model = tf.sequential();

    // Multi-input architecture for demand forecasting
    model.add(tf.layers.dense({
      units: 256,
      activation: 'relu',
      inputShape: [20] // Combined features: skills, timeline, priority, historical demand
    }));

    model.add(tf.layers.batchNormalization());
    model.add(tf.layers.dropout({ rate: 0.3 }));

    model.add(tf.layers.dense({ units: 128, activation: 'relu' }));
    model.add(tf.layers.dropout({ rate: 0.2 }));

    model.add(tf.layers.dense({ units: 64, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 32, activation: 'relu' }));

    // Multi-output: demand, confidence, timeline
    model.add(tf.layers.dense({ units: 3, activation: 'linear' }));

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError',
      metrics: ['mae']
    });

    this.forecastModels.set('demand_forecast', model);
  }

  // Helper methods for data processing and analysis
  private async preprocessTimeSeriesData(data: any): Promise<any> {
    return this.timeSeriesProcessor.normalizeTimeSeriesData(data);
  }

  private async generateForecastsByModel(
    data: any, 
    patterns: WorkloadPattern, 
    config: ForecastingConfig
  ): Promise<CapacityForecast[]> {
    const model = this.forecastModels.get(`${config.model_type.toLowerCase()}_capacity`);
    if (!model) {
      throw new Error(`Model ${config.model_type} not available`);
    }

    // Generate predictions for each day in the horizon
    const forecasts: CapacityForecast[] = [];
    const today = new Date();

    for (let i = 0; i < config.horizon_days; i++) {
      const forecastDate = new Date(today.getTime() + i * 24 * 60 * 60 * 1000);
      
      // Create input features combining historical data and patterns
      const features = this.createForecastFeatures(data, patterns, forecastDate, i);
      
      const prediction = await predictionService.predict('capacity_forecasting', {
        features,
        metadata: { date: forecastDate.toISOString() }
      }) as PredictionResult;

      const predictedCapacity = Array.isArray(prediction.prediction) 
        ? prediction.prediction[0] 
        : prediction.prediction;

      forecasts.push({
        date: forecastDate,
        predicted_capacity: predictedCapacity,
        confidence_interval: this.calculateConfidenceInterval(predictedCapacity, prediction.confidence),
        utilization_rate: Math.min(predictedCapacity * 1.2, 1.0), // Estimate utilization
        bottlenecks: [],
        recommendations: []
      });
    }

    return forecasts;
  }

  private async enrichForecastsWithInsights(
    forecasts: CapacityForecast[], 
    patterns: WorkloadPattern
  ): Promise<CapacityForecast[]> {
    return forecasts.map((forecast, index) => ({
      ...forecast,
      bottlenecks: this.identifyBottlenecks(forecast, patterns),
      recommendations: this.generateRecommendations(forecast, forecasts.slice(0, index))
    }));
  }

  private aggregateSkillDemand(pipeline: ResourceDemand[], horizon: number): any {
    // Implementation for skill demand aggregation
    const skillDemand: Record<string, number[]> = {};
    
    pipeline.forEach(demand => {
      Object.entries(demand.skill_requirements).forEach(([skill, hours]) => {
        if (!skillDemand[skill]) {
          skillDemand[skill] = new Array(horizon).fill(0);
        }
        
        // Distribute hours across timeline
        const startDay = Math.max(0, Math.floor((demand.timeline.start.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
        const endDay = Math.min(horizon, Math.floor((demand.timeline.end.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
        
        const dailyHours = hours / Math.max(1, endDay - startDay);
        for (let day = startDay; day < endDay; day++) {
          skillDemand[skill][day] += dailyHours;
        }
      });
    });

    return skillDemand;
  }

  private calculateSkillCapacity(resources: any[]): Record<string, number> {
    const capacity: Record<string, number> = {};
    
    resources.forEach(resource => {
      resource.skills.forEach((skill: string) => {
        if (!capacity[skill]) capacity[skill] = 0;
        capacity[skill] += resource.availability * resource.hourly_capacity;
      });
    });

    return capacity;
  }

  private async forecastSkillDemand(skillDemand: any): Promise<CapacityForecast[]> {
    // Convert skill demand to time series forecasts
    const forecasts: CapacityForecast[] = [];
    
    // Implementation would use time series models for each skill
    // This is a simplified version
    Object.entries(skillDemand).forEach(([skill, timeline]: [string, any]) => {
      timeline.forEach((demand: number, dayIndex: number) => {
        const date = new Date(Date.now() + dayIndex * 24 * 60 * 60 * 1000);
        forecasts.push({
          date,
          predicted_capacity: demand,
          confidence_interval: [demand * 0.8, demand * 1.2],
          utilization_rate: demand,
          bottlenecks: demand > 8 ? [skill] : [], // 8 hours threshold
          recommendations: []
        });
      });
    });

    return forecasts;
  }

  // Additional helper methods...
  private identifySkillGaps(forecast: CapacityForecast[], capacity: Record<string, number>): any[] {
    // Implementation for skill gap identification
    return [];
  }

  private generateHiringRecommendations(gaps: any[], horizon: number): any[] {
    // Implementation for hiring recommendations
    return [];
  }

  private extractTeamFeatures(project: any, members: any[]): number[] {
    // Implementation for team feature extraction
    return [];
  }

  private generateTeamCompositions(members: any[], requirements: any): any[] {
    // Implementation for team composition generation
    return [];
  }

  private teamCompositionToFeatures(composition: any, requirements: any): number[] {
    // Implementation for converting team composition to features
    return [];
  }

  private calculateSkillCoverage(composition: any, requirements: any): Record<string, number> {
    // Implementation for skill coverage calculation
    return {};
  }

  private identifyTradeOffs(best: any, alternative: any): string[] {
    // Implementation for trade-off identification
    return [];
  }

  private createForecastFeatures(data: any, patterns: WorkloadPattern, date: Date, dayIndex: number): number[] {
    // Implementation for forecast feature creation
    return [];
  }

  private calculateConfidenceInterval(prediction: number, confidence: number): [number, number] {
    const margin = prediction * (1 - confidence) * 0.5;
    return [prediction - margin, prediction + margin];
  }

  private identifyBottlenecks(forecast: CapacityForecast, patterns: WorkloadPattern): string[] {
    // Implementation for bottleneck identification
    return [];
  }

  private generateRecommendations(forecast: CapacityForecast, history: CapacityForecast[]): string[] {
    // Implementation for recommendation generation
    return [];
  }
}

// Export singleton instance
export const forecastingService = new ForecastingService();