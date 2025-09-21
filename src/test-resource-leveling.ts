/**
 * Test script for resource leveling functions
 * Run with: npx ts-node src/test-resource-leveling.ts
 */

import { ResourceOptimizationService } from './services/resource-optimization.service';
import { DatabaseService } from './database/database.service';

async function testResourceLeveling() {
  console.log('🚀 Testing Resource Leveling Functions...\n');

  try {
    // Initialize database connection
    const dbService = DatabaseService.getInstance();
    await dbService.connect();

    // Create service instance
    const optimizationService = new ResourceOptimizationService(dbService);

    // Test 1: Level Resources
    console.log('1️⃣ Testing levelResources function...');
    const projectIds = ['proj_1', 'proj_2']; // Sample project IDs
    
    try {
      const levelingResult = await optimizationService.levelResources(projectIds, {
        priorityWeights: {
          minimizePeaks: 0.5,
          maximizeUtilization: 0.3,
          respectDeadlines: 0.2
        },
        allowableDelay: 3,
        resourceSmoothing: true
      });

      console.log('✅ Level Resources Results:');
      console.log(`   - Tasks analyzed: ${levelingResult.leveledSchedule?.totalTasksAnalyzed || 0}`);
      console.log(`   - Tasks adjusted: ${levelingResult.leveledSchedule?.tasksAdjusted || 0}`);
      console.log(`   - Peak reduction: ${Math.round((levelingResult.metrics.peakReduction || 0) * 100)}%`);
      console.log(`   - Recommendations: ${levelingResult.recommendations.length}`);
    } catch (error) {
      console.log('❌ Level Resources test failed:', error.message);
    }

    // Test 2: Smooth Workload
    console.log('\n2️⃣ Testing smoothWorkload function...');
    
    try {
      const smoothingResult = await optimizationService.smoothWorkload({
        dateRange: {
          startDate: '2024-01-01',
          endDate: '2024-03-31'
        },
        smoothingLevel: 'moderate',
        preserveCriticalTasks: true
      });

      console.log('✅ Smooth Workload Results:');
      console.log(`   - Original workload items: ${smoothingResult.originalWorkload.length}`);
      console.log(`   - Tasks adjusted: ${smoothingResult.metrics.tasksAdjusted}`);
      console.log(`   - Variance reduction: ${Math.round(smoothingResult.metrics.varianceReduction || 0)}`);
      console.log(`   - Max shift applied: ${smoothingResult.metrics.maxShiftApplied} days`);
      console.log(`   - Recommendations: ${smoothingResult.recommendations.length}`);
    } catch (error) {
      console.log('❌ Smooth Workload test failed:', error.message);
    }

    // Test 3: Balance Team Load
    console.log('\n3️⃣ Testing balanceTeamLoad function...');
    
    try {
      const balancingResult = await optimizationService.balanceTeamLoad({
        departmentId: 'dept_1',
        dateRange: {
          startDate: '2024-01-01',
          endDate: '2024-03-31'
        },
        balancingStrategy: 'hybrid',
        maxReassignmentPercentage: 0.25
      });

      console.log('✅ Balance Team Load Results:');
      console.log(`   - Team members analyzed: ${balancingResult.originalTeamLoad.length}`);
      console.log(`   - Tasks reassigned: ${balancingResult.metrics.tasksReassigned}`);
      console.log(`   - Load balance improvement: ${Math.round((balancingResult.metrics.loadBalanceImprovement || 0) * 100)}%`);
      console.log(`   - Team efficiency gain: ${Math.round((balancingResult.metrics.teamEfficiencyGain || 0) * 100)}%`);
      console.log(`   - Recommendations: ${balancingResult.recommendations.length}`);
    } catch (error) {
      console.log('❌ Balance Team Load test failed:', error.message);
    }

    console.log('\n🎉 Resource leveling tests completed!');

  } catch (error) {
    console.error('❌ Test setup failed:', error.message);
  }
}

// Run the test
if (require.main === module) {
  testResourceLeveling().catch(console.error);
}

export default testResourceLeveling;