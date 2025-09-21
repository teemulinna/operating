import { Application } from 'express';
import forecastingRoutes from '../routes/forecasting.routes';

/**
 * Integrate forecasting routes with the main application
 */
export function integrateForecastingRoutes(app: Application): void {
  // Add forecasting routes
  app.use('/api/forecasting', forecastingRoutes);
  
  console.log('AI Forecasting Engine integrated successfully');
  console.log('Available forecasting endpoints:');
  console.log('  GET  /api/forecasting/capacity - Get capacity forecasts');
  console.log('  GET  /api/forecasting/demand - Get demand forecasts');
  console.log('  GET  /api/forecasting/insights - Get AI-generated insights');
  console.log('  POST /api/forecasting/scenario - Create scenario analysis');
  console.log('  GET  /api/forecasting/scenario/:id - Get scenario results');
  console.log('  POST /api/forecasting/patterns/train - Train ML models');
}

/**
 * Initialize forecasting system on application startup
 */
export async function initializeForecastingSystem(): Promise<void> {
  try {
    // Initialize any required services, models, or background tasks
    console.log('Initializing AI Forecasting System...');
    
    // Could initialize ML models, set up cron jobs for regular training, etc.
    // For now, just log successful initialization
    
    console.log('AI Forecasting System initialized successfully');
  } catch (error) {
    console.error('Failed to initialize AI Forecasting System:', error);
    throw error;
  }
}