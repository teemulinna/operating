/**
 * Comprehensive Test Runner Configuration
 * Orchestrates all E2E test suites for maximum coverage
 */

const fs = require('fs');
const path = require('path');

class TestOrchestrator {
  constructor() {
    this.testSuites = {
      'phase3-project-pipeline': {
        file: 'phase3-project-pipeline.spec.ts',
        priority: 1,
        dependencies: [],
        description: 'Phase 3 Project Pipeline Integration workflows',
        estimatedTime: '15 minutes'
      },
      'allocation-templates': {
        file: 'allocation-templates.spec.ts',
        priority: 1,
        dependencies: [],
        description: 'Allocation Templates CRUD operations and management',
        estimatedTime: '12 minutes'
      },
      'enhanced-ui-components': {
        file: 'enhanced-ui-components.spec.ts',
        priority: 2,
        dependencies: ['phase3-project-pipeline'],
        description: 'Enhanced UI components and interactions',
        estimatedTime: '18 minutes'
      },
      'cross-browser-compatibility': {
        file: 'cross-browser-compatibility.spec.ts',
        priority: 3,
        dependencies: [],
        description: 'Cross-browser compatibility (Chrome, Firefox, Safari)',
        estimatedTime: '25 minutes'
      },
      'mobile-responsive': {
        file: 'mobile-responsive.spec.ts',
        priority: 3,
        dependencies: [],
        description: 'Mobile responsiveness and touch interactions',
        estimatedTime: '20 minutes'
      },
      'accessibility-compliance': {
        file: 'accessibility-compliance.spec.ts',
        priority: 2,
        dependencies: [],
        description: 'WCAG 2.1 AA accessibility compliance',
        estimatedTime: '15 minutes'
      },
      'performance-load-testing': {
        file: 'performance-load-testing.spec.ts',
        priority: 3,
        dependencies: ['phase3-project-pipeline'],
        description: 'Performance testing under realistic data loads',
        estimatedTime: '22 minutes'
      },
      'visual-regression': {
        file: 'visual-regression.spec.ts',
        priority: 4,
        dependencies: ['enhanced-ui-components'],
        description: 'Visual regression testing for UI consistency',
        estimatedTime: '30 minutes'
      }
    };

    this.browserConfigs = {
      chrome: { project: 'Desktop Chrome' },
      firefox: { project: 'Desktop Firefox' },
      safari: { project: 'Desktop Safari' },
      'mobile-chrome': { project: 'Mobile Chrome' },
      'mobile-safari': { project: 'Mobile Safari' },
      tablet: { project: 'Tablet' }
    };
  }

  /**
   * Generate test execution plan based on priority and dependencies
   */
  generateExecutionPlan(options = {}) {
    const {
      includeVisualRegression = true,
      includeCrossBrowser = true,
      includeMobile = true,
      includePerformance = true,
      priorityFilter = null
    } = options;

    let testPlan = Object.entries(this.testSuites)
      .filter(([name, config]) => {
        if (priorityFilter && config.priority > priorityFilter) return false;
        if (!includeVisualRegression && name === 'visual-regression') return false;
        if (!includeCrossBrowser && name === 'cross-browser-compatibility') return false;
        if (!includeMobile && name === 'mobile-responsive') return false;
        if (!includePerformance && name === 'performance-load-testing') return false;
        return true;
      })
      .sort(([, a], [, b]) => a.priority - b.priority);

    return testPlan.map(([name, config]) => ({
      name,
      ...config,
      command: this.generateTestCommand(name, config)
    }));
  }

  /**
   * Generate Playwright command for specific test suite
   */
  generateTestCommand(suiteName, config, browserOverride = null) {
    const baseCommand = 'npx playwright test';
    const testFile = `tests/e2e/${config.file}`;
    
    let command = `${baseCommand} ${testFile}`;
    
    if (browserOverride) {
      command += ` --project="${browserOverride}"`;
    }
    
    // Add specific flags based on test type
    if (suiteName === 'visual-regression') {
      command += ' --update-snapshots';
    }
    
    if (suiteName === 'performance-load-testing') {
      command += ' --workers=1'; // Run performance tests sequentially
    }
    
    if (suiteName === 'accessibility-compliance') {
      command += ' --reporter=html,json'; // Generate detailed accessibility reports
    }
    
    return command;
  }

  /**
   * Run specific test suite
   */
  async runTestSuite(suiteName, options = {}) {
    const config = this.testSuites[suiteName];
    if (!config) {
      throw new Error(`Unknown test suite: ${suiteName}`);
    }

    console.log(`🚀 Running ${suiteName}: ${config.description}`);
    console.log(`⏱️  Estimated time: ${config.estimatedTime}`);

    const command = this.generateTestCommand(suiteName, config, options.browser);
    
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      const startTime = Date.now();
      const result = await execAsync(command, { 
        cwd: process.cwd(),
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer for large test outputs
      });
      
      const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
      
      console.log(`✅ ${suiteName} completed in ${duration} minutes`);
      
      return {
        success: true,
        duration: parseFloat(duration),
        output: result.stdout,
        errors: result.stderr
      };
    } catch (error) {
      console.error(`❌ ${suiteName} failed:`, error.message);
      
      return {
        success: false,
        duration: 0,
        output: error.stdout || '',
        errors: error.stderr || error.message
      };
    }
  }

  /**
   * Run comprehensive test suite
   */
  async runComprehensiveTests(options = {}) {
    const executionPlan = this.generateExecutionPlan(options);
    const results = [];
    let totalTime = 0;
    let passedTests = 0;
    let failedTests = 0;

    console.log('🎯 Starting Comprehensive E2E Test Suite');
    console.log('=' .repeat(60));
    
    for (const test of executionPlan) {
      console.log(`\n📋 Test ${results.length + 1}/${executionPlan.length}: ${test.name}`);
      
      // Check dependencies
      if (test.dependencies.length > 0) {
        const failedDependencies = test.dependencies.filter(dep => {
          const depResult = results.find(r => r.name === dep);
          return depResult && !depResult.success;
        });
        
        if (failedDependencies.length > 0) {
          console.log(`⚠️  Skipping ${test.name} due to failed dependencies: ${failedDependencies.join(', ')}`);
          results.push({
            name: test.name,
            success: false,
            duration: 0,
            skipped: true,
            reason: `Failed dependencies: ${failedDependencies.join(', ')}`
          });
          failedTests++;
          continue;
        }
      }

      const result = await this.runTestSuite(test.name, options);
      results.push({
        name: test.name,
        ...result
      });

      totalTime += result.duration;
      
      if (result.success) {
        passedTests++;
      } else {
        failedTests++;
        
        // Stop on critical failures if specified
        if (options.stopOnFailure && test.priority <= 2) {
          console.log('🛑 Stopping execution due to critical test failure');
          break;
        }
      }
    }

    // Generate summary report
    this.generateTestReport(results, totalTime);

    return {
      totalTests: results.length,
      passedTests,
      failedTests,
      totalTime,
      results
    };
  }

  /**
   * Run cross-browser tests
   */
  async runCrossBrowserTests(testSuites = ['phase3-project-pipeline', 'enhanced-ui-components'], browsers = ['chrome', 'firefox', 'safari']) {
    const results = [];
    
    console.log('🌐 Starting Cross-Browser Test Suite');
    console.log('=' .repeat(60));

    for (const browser of browsers) {
      console.log(`\n🔍 Testing on ${browser.toUpperCase()}`);
      
      for (const suiteName of testSuites) {
        if (!this.testSuites[suiteName]) {
          console.log(`⚠️  Unknown test suite: ${suiteName}`);
          continue;
        }

        console.log(`  Running ${suiteName} on ${browser}...`);
        
        const result = await this.runTestSuite(suiteName, { browser: this.browserConfigs[browser]?.project });
        results.push({
          suite: suiteName,
          browser,
          ...result
        });
      }
    }

    return this.analyzeCrossBrowserResults(results);
  }

  /**
   * Generate detailed test report
   */
  generateTestReport(results, totalTime) {
    console.log('\n📊 TEST EXECUTION SUMMARY');
    console.log('=' .repeat(60));
    
    const passed = results.filter(r => r.success && !r.skipped).length;
    const failed = results.filter(r => !r.success && !r.skipped).length;
    const skipped = results.filter(r => r.skipped).length;
    
    console.log(`Total Tests: ${results.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`⏱️  Total Time: ${totalTime.toFixed(2)} minutes`);
    
    if (failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      results.filter(r => !r.success).forEach(r => {
        console.log(`  • ${r.name}: ${r.reason || 'Test execution failed'}`);
        if (r.errors && !r.skipped) {
          console.log(`    Error: ${r.errors.substring(0, 200)}...`);
        }
      });
    }
    
    // Generate detailed HTML report
    this.generateHTMLReport(results, totalTime);
    
    console.log('\n📁 Detailed reports generated in:');
    console.log('  • playwright-report/index.html');
    console.log('  • test-results/comprehensive-report.html');
    console.log('  • test-results/results.json');
  }

  /**
   * Generate HTML test report
   */
  generateHTMLReport(results, totalTime) {
    const reportDir = path.join(process.cwd(), 'test-results');
    
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const htmlReport = this.generateHTMLContent(results, totalTime);
    fs.writeFileSync(path.join(reportDir, 'comprehensive-report.html'), htmlReport);
    
    const jsonReport = {
      timestamp: new Date().toISOString(),
      totalTime,
      summary: {
        total: results.length,
        passed: results.filter(r => r.success && !r.skipped).length,
        failed: results.filter(r => !r.success && !r.skipped).length,
        skipped: results.filter(r => r.skipped).length
      },
      results
    };
    
    fs.writeFileSync(path.join(reportDir, 'results.json'), JSON.stringify(jsonReport, null, 2));
  }

  /**
   * Generate HTML report content
   */
  generateHTMLContent(results, totalTime) {
    const passed = results.filter(r => r.success && !r.skipped).length;
    const failed = results.filter(r => !r.success && !r.skipped).length;
    const skipped = results.filter(r => r.skipped).length;
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Comprehensive E2E Test Report</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0; padding: 20px; background: #f5f5f5; 
        }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .stat-card { padding: 20px; border-radius: 8px; text-align: center; }
        .stat-card.total { background: #f0f9ff; border: 2px solid #0ea5e9; }
        .stat-card.passed { background: #f0fdf4; border: 2px solid #22c55e; }
        .stat-card.failed { background: #fef2f2; border: 2px solid #ef4444; }
        .stat-card.skipped { background: #fffbeb; border: 2px solid #f59e0b; }
        .stat-number { font-size: 2em; font-weight: bold; margin-bottom: 5px; }
        .test-results { margin-top: 30px; }
        .test-item { 
            padding: 15px; margin-bottom: 10px; border-radius: 6px; border-left: 4px solid;
            display: flex; justify-content: space-between; align-items: center;
        }
        .test-item.success { background: #f0fdf4; border-left-color: #22c55e; }
        .test-item.failed { background: #fef2f2; border-left-color: #ef4444; }
        .test-item.skipped { background: #fffbeb; border-left-color: #f59e0b; }
        .test-name { font-weight: 600; }
        .test-description { color: #666; font-size: 0.9em; margin-top: 4px; }
        .test-duration { font-size: 0.9em; color: #666; }
        .error-details { 
            margin-top: 10px; padding: 10px; background: #f8f9fa; border-radius: 4px;
            font-family: monospace; font-size: 0.8em; color: #dc3545;
        }
        .timestamp { text-align: center; margin-top: 30px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📋 Comprehensive E2E Test Report</h1>
            <p>Phase 3 Project Resource Integration Testing</p>
        </div>
        
        <div class="summary">
            <div class="stat-card total">
                <div class="stat-number">${results.length}</div>
                <div>Total Tests</div>
            </div>
            <div class="stat-card passed">
                <div class="stat-number">${passed}</div>
                <div>Passed</div>
            </div>
            <div class="stat-card failed">
                <div class="stat-number">${failed}</div>
                <div>Failed</div>
            </div>
            <div class="stat-card skipped">
                <div class="stat-number">${skipped}</div>
                <div>Skipped</div>
            </div>
        </div>
        
        <div style="text-align: center; margin: 20px 0;">
            <strong>Total Execution Time: ${totalTime.toFixed(2)} minutes</strong>
        </div>
        
        <div class="test-results">
            <h3>Test Results</h3>
            ${results.map(result => `
                <div class="test-item ${result.success ? (result.skipped ? 'skipped' : 'success') : 'failed'}">
                    <div>
                        <div class="test-name">
                            ${result.skipped ? '⏭️' : result.success ? '✅' : '❌'} 
                            ${result.name}
                        </div>
                        <div class="test-description">${this.testSuites[result.name]?.description || 'Test suite'}</div>
                        ${!result.success && result.errors && !result.skipped ? `
                            <div class="error-details">${result.errors.substring(0, 500)}${result.errors.length > 500 ? '...' : ''}</div>
                        ` : ''}
                        ${result.skipped && result.reason ? `
                            <div class="test-description" style="color: #f59e0b;">Reason: ${result.reason}</div>
                        ` : ''}
                    </div>
                    <div class="test-duration">
                        ${result.skipped ? 'Skipped' : `${result.duration?.toFixed(2) || 0}min`}
                    </div>
                </div>
            `).join('')}
        </div>
        
        <div class="timestamp">
            Generated on ${new Date().toLocaleString()}
        </div>
    </div>
</body>
</html>
    `;
  }

  /**
   * Analyze cross-browser test results
   */
  analyzeCrossBrowserResults(results) {
    const analysis = {
      totalTests: results.length,
      browsers: {},
      compatibility: {},
      issues: []
    };

    // Group by browser
    results.forEach(result => {
      if (!analysis.browsers[result.browser]) {
        analysis.browsers[result.browser] = {
          total: 0,
          passed: 0,
          failed: 0
        };
      }
      
      analysis.browsers[result.browser].total++;
      if (result.success) {
        analysis.browsers[result.browser].passed++;
      } else {
        analysis.browsers[result.browser].failed++;
        analysis.issues.push({
          browser: result.browser,
          suite: result.suite,
          error: result.errors
        });
      }
    });

    // Group by test suite
    results.forEach(result => {
      if (!analysis.compatibility[result.suite]) {
        analysis.compatibility[result.suite] = {
          total: 0,
          passed: 0,
          browsers: []
        };
      }
      
      analysis.compatibility[result.suite].total++;
      analysis.compatibility[result.suite].browsers.push({
        browser: result.browser,
        success: result.success
      });
      
      if (result.success) {
        analysis.compatibility[result.suite].passed++;
      }
    });

    console.log('\n🌐 CROSS-BROWSER ANALYSIS');
    console.log('=' .repeat(40));
    
    Object.entries(analysis.browsers).forEach(([browser, stats]) => {
      const successRate = ((stats.passed / stats.total) * 100).toFixed(1);
      console.log(`${browser}: ${stats.passed}/${stats.total} (${successRate}%)`);
    });

    if (analysis.issues.length > 0) {
      console.log('\n⚠️  BROWSER-SPECIFIC ISSUES:');
      analysis.issues.forEach(issue => {
        console.log(`  • ${issue.browser} - ${issue.suite}: ${issue.error?.substring(0, 100)}...`);
      });
    }

    return analysis;
  }
}

module.exports = { TestOrchestrator };

// CLI Usage
if (require.main === module) {
  const orchestrator = new TestOrchestrator();
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    console.log(`
🎯 Comprehensive E2E Test Runner

Usage:
  node test-runner-config.js [options]

Options:
  --suite <name>           Run specific test suite
  --cross-browser         Run cross-browser compatibility tests
  --mobile               Include mobile responsiveness tests
  --performance          Include performance testing
  --visual               Include visual regression tests
  --quick                Run only priority 1-2 tests
  --stop-on-failure      Stop execution on critical test failure
  --help                 Show this help message

Examples:
  node test-runner-config.js --suite phase3-project-pipeline
  node test-runner-config.js --cross-browser --mobile
  node test-runner-config.js --quick --stop-on-failure
    `);
    process.exit(0);
  }
  
  const options = {
    includeVisualRegression: args.includes('--visual'),
    includeCrossBrowser: args.includes('--cross-browser'),
    includeMobile: args.includes('--mobile'),
    includePerformance: args.includes('--performance'),
    priorityFilter: args.includes('--quick') ? 2 : null,
    stopOnFailure: args.includes('--stop-on-failure')
  };
  
  const suiteIndex = args.findIndex(arg => arg === '--suite');
  if (suiteIndex !== -1 && args[suiteIndex + 1]) {
    const suiteName = args[suiteIndex + 1];
    orchestrator.runTestSuite(suiteName, options)
      .then(result => {
        process.exit(result.success ? 0 : 1);
      })
      .catch(error => {
        console.error('Test execution error:', error);
        process.exit(1);
      });
  } else if (args.includes('--cross-browser')) {
    orchestrator.runCrossBrowserTests()
      .then(analysis => {
        const hasFailures = analysis.issues.length > 0;
        process.exit(hasFailures ? 1 : 0);
      })
      .catch(error => {
        console.error('Cross-browser test error:', error);
        process.exit(1);
      });
  } else {
    orchestrator.runComprehensiveTests(options)
      .then(summary => {
        console.log(`\n🎉 Test execution complete: ${summary.passedTests}/${summary.totalTests} passed`);
        process.exit(summary.failedTests > 0 ? 1 : 0);
      })
      .catch(error => {
        console.error('Test suite error:', error);
        process.exit(1);
      });
  }
}