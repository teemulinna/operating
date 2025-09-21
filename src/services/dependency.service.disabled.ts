// This service has been disabled due to Sequelize dependencies
// that don't exist in the current PostgreSQL setup.
// It needs to be rewritten to use PostgreSQL queries directly.

export class DependencyService {
  // All methods disabled - needs PostgreSQL implementation

  async createDependency(): Promise<any> {
    throw new Error('DependencyService is disabled - needs PostgreSQL implementation');
  }

  async validateDependencies(): Promise<any> {
    throw new Error('DependencyService is disabled - needs PostgreSQL implementation');
  }

  async calculateCriticalPath(): Promise<any> {
    throw new Error('DependencyService is disabled - needs PostgreSQL implementation');
  }

  async updateSchedule(): Promise<any> {
    throw new Error('DependencyService is disabled - needs PostgreSQL implementation');
  }

  async detectScheduleConflicts(): Promise<any> {
    throw new Error('DependencyService is disabled - needs PostgreSQL implementation');
  }

  async getDependencyGraph(): Promise<any> {
    throw new Error('DependencyService is disabled - needs PostgreSQL implementation');
  }
}