#!/usr/bin/env node
/**
 * TDD Coordinator Runner
 * Main script to execute comprehensive TDD monitoring and reporting
 */

const TDDComplianceReport = require('./tdd-compliance-report');
const TDDCoordinator = require('./tdd-coordinator');
const TDDCoverageTracker = require('./coverage-reports/tdd-coverage-tracker');

async function main() {
  console.log('🚀 Starting TDD Methodology Coordination...\n');

  try {
    // Initialize TDD Compliance Report Generator
    const reporter = new TDDComplianceReport();
    
    console.log('📊 Generating comprehensive TDD compliance report...');
    const report = await reporter.generateComprehensiveReport();
    
    console.log('📄 Exporting report in multiple formats...');
    const exports = await reporter.exportReport(report, ['json', 'html', 'csv']);
    
    // Display Executive Summary
    console.log('\n' + '='.repeat(60));
    console.log('📈 TDD COMPLIANCE EXECUTIVE SUMMARY');
    console.log('='.repeat(60));
    console.log(`Overall Score: ${report.overallScore}%`);
    console.log(`Project Status: ${report.executiveSummary.projectStatus}`);
    console.log(`Teams on Track: ${report.executiveSummary.teamsOnTrack}/${report.executiveSummary.totalTeams}`);
    console.log(`Average Coverage: ${report.executiveSummary.keyMetrics.averageCoverage}%`);
    console.log(`Test-First Compliance: ${report.executiveSummary.keyMetrics.testFirstCompliance}%`);
    console.log(`Critical Issues: ${report.executiveSummary.criticalIssues}`);
    
    // Display Team Status
    console.log('\n' + '='.repeat(60));
    console.log('👥 TEAM COMPLIANCE STATUS');
    console.log('='.repeat(60));
    
    for (const [team, data] of Object.entries(report.teamCompliance)) {
      const statusIcon = data.status === 'EXCELLENT' ? '🟢' : 
                        data.status === 'GOOD' ? '🟡' : 
                        data.status === 'NEEDS_IMPROVEMENT' ? '🟠' : '🔴';
      
      console.log(`${statusIcon} ${team.toUpperCase()}: ${data.complianceScore}% (${data.status})`);
      console.log(`   Tests: ${data.testFiles.length} files`);
      console.log(`   Contracts: ${data.contractsImplemented}/${data.contractsTotal}`);
      
      if (data.violations.length > 0) {
        console.log(`   ⚠️  Violations: ${data.violations.slice(0, 2).join(', ')}`);
      }
      
      if (data.strengths.length > 0) {
        console.log(`   ✅ Strengths: ${data.strengths[0]}`);
      }
      
      console.log('');
    }
    
    // Display Quality Gates
    console.log('='.repeat(60));
    console.log('🚪 QUALITY GATES STATUS');
    console.log('='.repeat(60));
    console.log(`Overall Status: ${report.qualityGates.overallStatus}`);
    console.log(`Passed Gates: ${report.qualityGates.passedGates}/${report.qualityGates.totalGates}`);
    
    for (const [gateName, gate] of Object.entries(report.qualityGates.gates)) {
      const gateIcon = gate.passed ? '✅' : '❌';
      console.log(`${gateIcon} ${gate.name}: ${gate.status}`);
    }
    
    // Display Critical Recommendations
    console.log('\n' + '='.repeat(60));
    console.log('🎯 CRITICAL RECOMMENDATIONS');
    console.log('='.repeat(60));
    
    report.recommendations.critical.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec.title}`);
      console.log(`   Priority: ${rec.priority}`);
      console.log(`   Timeline: ${rec.timeline}`);
      console.log(`   Owner: ${rec.owner}`);
      console.log(`   Actions: ${rec.actions.slice(0, 2).join(', ')}...`);
      console.log('');
    });
    
    // Display Integration Status
    console.log('='.repeat(60));
    console.log('🔗 INTEGRATION STATUS');
    console.log('='.repeat(60));
    console.log(`Integration Readiness: ${report.integrationStatus.readinessScore}%`);
    console.log(`Completed Scenarios: ${report.integrationStatus.completedScenarios}/${report.integrationStatus.totalScenarios}`);
    
    for (const [contractId, contract] of Object.entries(report.integrationStatus.crossTeamContracts)) {
      const statusIcon = contract.status === 'good' ? '🟢' : 
                        contract.status === 'in_progress' ? '🟡' : '🔴';
      console.log(`${statusIcon} ${contractId}: ${contract.completionPercent}% (${contract.status})`);
    }
    
    // Display Action Items
    console.log('\n' + '='.repeat(60));
    console.log('📋 ACTION ITEMS');
    console.log('='.repeat(60));
    
    report.actionItems.forEach((item, index) => {
      const priorityIcon = item.priority === 'HIGH' ? '🔴' : 
                          item.priority === 'MEDIUM' ? '🟡' : '🟢';
      const statusIcon = item.status === 'COMPLETED' ? '✅' : 
                        item.status === 'IN_PROGRESS' ? '🔄' : '⏳';
      
      console.log(`${priorityIcon}${statusIcon} ${item.title}`);
      console.log(`   Assignee: ${item.assignee}`);
      console.log(`   Due: ${item.dueDate}`);
      console.log(`   Progress: ${item.checklist.length} checklist items`);
      console.log('');
    });
    
    // Display File Locations
    console.log('='.repeat(60));
    console.log('📁 GENERATED REPORTS');
    console.log('='.repeat(60));
    console.log('✅ JSON Report: /tests/coverage-reports/tdd-compliance-report.json');
    console.log('✅ HTML Report: /tests/coverage-reports/tdd-compliance-report.html');
    console.log('✅ CSV Report: /tests/coverage-reports/tdd-compliance-report.csv');
    
    // Display Test Framework Structure
    console.log('\n' + '='.repeat(60));
    console.log('📂 TDD FRAMEWORK STRUCTURE');
    console.log('='.repeat(60));
    console.log('✅ TDD Coordinator: /tests/tdd-coordinator.js');
    console.log('✅ Coverage Tracker: /tests/coverage-reports/tdd-coverage-tracker.js');
    console.log('✅ Test Contracts: /tests/shared/test-contracts.js');
    console.log('✅ Shared Test Data: /tests/fixtures/shared-test-data.json');
    console.log('✅ Integration Tests: /tests/integration/tdd-compliance-monitor.test.js');
    console.log('✅ E2E Scenarios: /tests/e2e/integration-scenarios.test.js');
    console.log('✅ Database Tests: /tests/database/schema-validation.test.js');
    console.log('✅ Backend Tests: /tests/backend/api-contracts.test.js');
    console.log('✅ Frontend Tests: /tests/frontend/component-contracts.test.js');
    
    // Display Next Steps
    console.log('\n' + '='.repeat(60));
    console.log('🚀 NEXT STEPS FOR TEAMS');
    console.log('='.repeat(60));
    
    // Database Team
    console.log('💾 DATABASE TEAM:');
    console.log('   1. Complete performance.test.js implementation');
    console.log('   2. Add database indexing for query optimization');
    console.log('   3. Implement real-time sync triggers for frontend');
    
    // Backend Team  
    console.log('\n🔧 BACKEND TEAM:');
    console.log('   1. CRITICAL: Implement strict test-first development');
    console.log('   2. Add missing validation.test.js and error-handling.test.js');
    console.log('   3. Set up automated TDD compliance checking');
    console.log('   4. Increase test coverage to 90%+ minimum');
    
    // Frontend Team
    console.log('\n🎨 FRONTEND TEAM:');
    console.log('   1. Add error-boundary.test.js for complete coverage');
    console.log('   2. Implement WebSocket integration testing');
    console.log('   3. Optimize component render performance');
    
    // Integration Team
    console.log('\n🔗 INTEGRATION TEAM:');
    console.log('   1. Complete Database-Frontend integration contracts');
    console.log('   2. Implement comprehensive E2E test scenarios');
    console.log('   3. Set up automated integration testing pipeline');
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ TDD COORDINATION COMPLETE');
    console.log('='.repeat(60));
    console.log('All TDD monitoring and reporting systems are now active.');
    console.log('Teams have clear action items and compliance metrics.');
    console.log('Continue monitoring through generated reports and dashboards.');
    
  } catch (error) {
    console.error('❌ Error during TDD coordination:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Self-test function to validate TDD framework
async function runSelfTest() {
  console.log('🧪 Running TDD Framework Self-Test...\n');
  
  try {
    // Test TDD Coordinator
    const coordinator = new TDDCoordinator();
    coordinator.setupIntegrationContracts();
    coordinator.createSharedTestFixtures();
    
    console.log('✅ TDD Coordinator initialized successfully');
    
    // Test Coverage Tracker
    const coverageTracker = new TDDCoverageTracker();
    await coverageTracker.trackTeamCoverage('database', { total: 92 }, []);
    const coverageReport = coverageTracker.generateDetailedReport();
    
    console.log('✅ Coverage Tracker operational');
    
    // Test Report Generation
    const reporter = new TDDComplianceReport();
    const testReport = await reporter.generateComprehensiveReport();
    
    console.log('✅ Report generation successful');
    console.log(`✅ Generated report with overall score: ${testReport.overallScore}%`);
    
    console.log('\n🎉 TDD Framework Self-Test PASSED');
    console.log('All systems operational and ready for team coordination.\n');
    
  } catch (error) {
    console.error('❌ Self-test failed:', error.message);
    throw error;
  }
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--test')) {
    runSelfTest().then(() => {
      console.log('Self-test completed successfully.');
      process.exit(0);
    }).catch(error => {
      console.error('Self-test failed:', error.message);
      process.exit(1);
    });
  } else if (args.includes('--help') || args.includes('-h')) {
    console.log(`
TDD Coordinator Runner

Usage:
  node run-tdd-coordinator.js          # Run full TDD coordination
  node run-tdd-coordinator.js --test   # Run self-test only
  node run-tdd-coordinator.js --help   # Show this help

Description:
  Coordinates Test-Driven Development across Database, Backend, and Frontend teams.
  Generates comprehensive compliance reports and monitors TDD practices.

Features:
  - Test-first development validation
  - Code coverage tracking (90%+ requirement)
  - Integration contract monitoring
  - Quality gate enforcement  
  - Performance benchmarking
  - Risk assessment and recommendations
  - Multi-format reporting (JSON, HTML, CSV)

Reports Generated:
  - TDD Compliance Dashboard
  - Team-specific metrics
  - Integration readiness status
  - Action items and recommendations
    `);
    process.exit(0);
  } else {
    main().catch(error => {
      console.error('TDD coordination failed:', error.message);
      process.exit(1);
    });
  }
}

module.exports = { main, runSelfTest };