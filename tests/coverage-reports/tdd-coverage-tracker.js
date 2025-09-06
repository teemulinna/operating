/**
 * TDD Coverage Tracker
 * Tracks and validates test coverage across all teams with detailed reporting
 */

const fs = require('fs').promises;
const path = require('path');

class TDDCoverageTracker {
  constructor() {
    this.coverageThresholds = {
      minimum: 90,
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    };
    
    this.teamCoverage = {
      database: { current: 0, target: 95, tests: [] },
      backend: { current: 0, target: 93, tests: [] },
      frontend: { current: 0, target: 92, tests: [] }
    };
    
    this.coverageHistory = [];
    this.violations = [];
  }

  /**
   * Track test coverage for a specific team
   */
  async trackTeamCoverage(team, coverageData, testFiles = []) {
    if (!this.teamCoverage[team]) {
      throw new Error(`Unknown team: ${team}`);
    }

    const coverage = {
      timestamp: new Date().toISOString(),
      team,
      total: coverageData.total || 0,
      branches: coverageData.branches || 0,
      functions: coverageData.functions || 0,
      lines: coverageData.lines || 0,
      statements: coverageData.statements || 0,
      testFiles: testFiles,
      filesCovered: coverageData.filesCovered || 0,
      totalFiles: coverageData.totalFiles || 0
    };

    // Update team coverage
    this.teamCoverage[team].current = coverage.total;
    this.teamCoverage[team].tests = testFiles;

    // Add to history
    this.coverageHistory.push(coverage);

    // Validate against thresholds
    await this.validateCoverageThresholds(team, coverage);

    return coverage;
  }

  /**
   * Validate coverage against thresholds and record violations
   */
  async validateCoverageThresholds(team, coverage) {
    const violations = [];

    if (coverage.total < this.coverageThresholds.minimum) {
      violations.push({
        team,
        type: 'total_coverage',
        current: coverage.total,
        required: this.coverageThresholds.minimum,
        message: `Total coverage ${coverage.total}% below minimum ${this.coverageThresholds.minimum}%`
      });
    }

    if (coverage.branches < this.coverageThresholds.branches) {
      violations.push({
        team,
        type: 'branch_coverage',
        current: coverage.branches,
        required: this.coverageThresholds.branches,
        message: `Branch coverage ${coverage.branches}% below minimum ${this.coverageThresholds.branches}%`
      });
    }

    if (coverage.functions < this.coverageThresholds.functions) {
      violations.push({
        team,
        type: 'function_coverage',
        current: coverage.functions,
        required: this.coverageThresholds.functions,
        message: `Function coverage ${coverage.functions}% below minimum ${this.coverageThresholds.functions}%`
      });
    }

    if (coverage.lines < this.coverageThresholds.lines) {
      violations.push({
        team,
        type: 'line_coverage',
        current: coverage.lines,
        required: this.coverageThresholds.lines,
        message: `Line coverage ${coverage.lines}% below minimum ${this.coverageThresholds.lines}%`
      });
    }

    if (violations.length > 0) {
      this.violations.push(...violations);
      console.warn(`Coverage violations detected for ${team}:`, violations);
    }

    return violations;
  }

  /**
   * Generate detailed coverage report
   */
  generateDetailedReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTeams: Object.keys(this.teamCoverage).length,
        compliantTeams: 0,
        averageCoverage: 0,
        totalViolations: this.violations.length,
        status: 'FAIL'
      },
      teams: {},
      violations: this.violations,
      trends: this.analyzeCoverageTrends(),
      recommendations: []
    };

    let totalCoverage = 0;
    let compliantCount = 0;

    // Analyze each team
    for (const [teamName, teamData] of Object.entries(this.teamCoverage)) {
      const latestCoverage = this.getLatestCoverageForTeam(teamName);
      const teamViolations = this.violations.filter(v => v.team === teamName);
      const isCompliant = teamViolations.length === 0 && 
                         teamData.current >= this.coverageThresholds.minimum;

      report.teams[teamName] = {
        current: teamData.current,
        target: teamData.target,
        isCompliant,
        violations: teamViolations.length,
        testFiles: teamData.tests.length,
        trend: this.calculateTrend(teamName),
        latestData: latestCoverage,
        recommendations: this.generateTeamRecommendations(teamName, teamData, teamViolations)
      };

      totalCoverage += teamData.current;
      if (isCompliant) compliantCount++;
    }

    // Calculate summary
    report.summary.averageCoverage = totalCoverage / Object.keys(this.teamCoverage).length;
    report.summary.compliantTeams = compliantCount;
    report.summary.status = compliantCount === Object.keys(this.teamCoverage).length ? 'PASS' : 'FAIL';

    // Generate overall recommendations
    report.recommendations = this.generateOverallRecommendations(report);

    return report;
  }

  /**
   * Analyze coverage trends over time
   */
  analyzeCoverageTrends() {
    const trends = {};
    
    for (const team of Object.keys(this.teamCoverage)) {
      const teamHistory = this.coverageHistory
        .filter(h => h.team === team)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      if (teamHistory.length >= 2) {
        const latest = teamHistory[teamHistory.length - 1];
        const previous = teamHistory[teamHistory.length - 2];
        const change = latest.total - previous.total;
        
        trends[team] = {
          direction: change > 0 ? 'improving' : change < 0 ? 'declining' : 'stable',
          change: Math.abs(change),
          dataPoints: teamHistory.length
        };
      } else {
        trends[team] = {
          direction: 'insufficient_data',
          change: 0,
          dataPoints: teamHistory.length
        };
      }
    }

    return trends;
  }

  /**
   * Calculate trend for a specific team
   */
  calculateTrend(teamName) {
    const teamHistory = this.coverageHistory
      .filter(h => h.team === teamName)
      .slice(-5) // Last 5 measurements
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    if (teamHistory.length < 2) return 'insufficient_data';

    const first = teamHistory[0].total;
    const last = teamHistory[teamHistory.length - 1].total;
    const change = last - first;

    if (change > 2) return 'improving';
    if (change < -2) return 'declining';
    return 'stable';
  }

  /**
   * Get latest coverage data for a team
   */
  getLatestCoverageForTeam(teamName) {
    const teamHistory = this.coverageHistory
      .filter(h => h.team === teamName)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return teamHistory.length > 0 ? teamHistory[0] : null;
  }

  /**
   * Generate team-specific recommendations
   */
  generateTeamRecommendations(teamName, teamData, violations) {
    const recommendations = [];

    if (teamData.current < teamData.target) {
      recommendations.push(`Increase coverage from ${teamData.current}% to target ${teamData.target}%`);
    }

    if (teamData.tests.length === 0) {
      recommendations.push('Create initial test files - no tests detected');
    } else if (teamData.tests.length < 5) {
      recommendations.push('Expand test coverage with more comprehensive test files');
    }

    for (const violation of violations) {
      switch (violation.type) {
        case 'total_coverage':
          recommendations.push('Focus on increasing overall test coverage');
          break;
        case 'branch_coverage':
          recommendations.push('Add tests for conditional logic and edge cases');
          break;
        case 'function_coverage':
          recommendations.push('Ensure all functions have corresponding tests');
          break;
        case 'line_coverage':
          recommendations.push('Add tests to cover untested code lines');
          break;
      }
    }

    const trend = this.calculateTrend(teamName);
    if (trend === 'declining') {
      recommendations.push('URGENT: Coverage is declining - investigate and fix immediately');
    }

    return recommendations;
  }

  /**
   * Generate overall project recommendations
   */
  generateOverallRecommendations(report) {
    const recommendations = [];

    if (report.summary.status === 'FAIL') {
      recommendations.push('CRITICAL: Project does not meet minimum coverage requirements');
    }

    if (report.summary.compliantTeams < Object.keys(this.teamCoverage).length) {
      const nonCompliantTeams = Object.keys(report.teams)
        .filter(team => !report.teams[team].isCompliant);
      recommendations.push(`Focus on non-compliant teams: ${nonCompliantTeams.join(', ')}`);
    }

    if (report.summary.averageCoverage < this.coverageThresholds.minimum) {
      recommendations.push(`Increase average coverage from ${report.summary.averageCoverage.toFixed(1)}% to minimum ${this.coverageThresholds.minimum}%`);
    }

    if (report.summary.totalViolations > 10) {
      recommendations.push('High number of violations detected - implement systematic testing improvements');
    }

    // Check trends
    const decliningTeams = Object.entries(report.trends)
      .filter(([, trend]) => trend.direction === 'declining')
      .map(([team]) => team);

    if (decliningTeams.length > 0) {
      recommendations.push(`Address declining coverage in: ${decliningTeams.join(', ')}`);
    }

    return recommendations;
  }

  /**
   * Export coverage data for external tools
   */
  async exportCoverageData(format = 'json', filePath = null) {
    const data = {
      report: this.generateDetailedReport(),
      history: this.coverageHistory,
      thresholds: this.coverageThresholds,
      violations: this.violations
    };

    let output;
    switch (format) {
      case 'json':
        output = JSON.stringify(data, null, 2);
        break;
      case 'csv':
        output = this.convertToCsv(data);
        break;
      case 'html':
        output = this.generateHtmlReport(data);
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    if (filePath) {
      await fs.writeFile(filePath, output, 'utf8');
      console.log(`Coverage report exported to: ${filePath}`);
    }

    return output;
  }

  /**
   * Convert coverage data to CSV format
   */
  convertToCsv(data) {
    const headers = ['timestamp', 'team', 'total', 'branches', 'functions', 'lines', 'statements', 'testFiles'];
    const rows = [headers.join(',')];

    for (const record of data.history) {
      const row = [
        record.timestamp,
        record.team,
        record.total,
        record.branches,
        record.functions,
        record.lines,
        record.statements,
        record.testFiles.length
      ];
      rows.push(row.join(','));
    }

    return rows.join('\n');
  }

  /**
   * Generate HTML coverage report
   */
  generateHtmlReport(data) {
    const report = data.report;
    
    return `
<!DOCTYPE html>
<html>
<head>
    <title>TDD Coverage Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .status-pass { color: #28a745; font-weight: bold; }
        .status-fail { color: #dc3545; font-weight: bold; }
        .team { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .compliant { border-left: 4px solid #28a745; }
        .non-compliant { border-left: 4px solid #dc3545; }
        .violations { background: #f8d7da; padding: 10px; margin: 10px 0; border-radius: 3px; }
        .recommendations { background: #d4edda; padding: 10px; margin: 10px 0; border-radius: 3px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>TDD Coverage Report</h1>
        <p>Generated: ${report.timestamp}</p>
        <p>Status: <span class="status-${report.summary.status.toLowerCase()}">${report.summary.status}</span></p>
        <p>Average Coverage: ${report.summary.averageCoverage.toFixed(1)}%</p>
        <p>Compliant Teams: ${report.summary.compliantTeams}/${report.summary.totalTeams}</p>
    </div>

    ${Object.entries(report.teams).map(([teamName, teamData]) => `
        <div class="team ${teamData.isCompliant ? 'compliant' : 'non-compliant'}">
            <h2>${teamName.toUpperCase()} Team</h2>
            <p>Coverage: ${teamData.current}% (Target: ${teamData.target}%)</p>
            <p>Status: ${teamData.isCompliant ? 'COMPLIANT' : 'NON-COMPLIANT'}</p>
            <p>Test Files: ${teamData.testFiles}</p>
            <p>Trend: ${teamData.trend}</p>
            
            ${teamData.recommendations.length > 0 ? `
                <div class="recommendations">
                    <strong>Recommendations:</strong>
                    <ul>
                        ${teamData.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
        </div>
    `).join('')}

    ${report.recommendations.length > 0 ? `
        <div class="recommendations">
            <h2>Overall Recommendations</h2>
            <ul>
                ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
        </div>
    ` : ''}
</body>
</html>`;
  }

  /**
   * Clear coverage history and reset tracking
   */
  reset() {
    this.coverageHistory = [];
    this.violations = [];
    for (const team of Object.keys(this.teamCoverage)) {
      this.teamCoverage[team].current = 0;
      this.teamCoverage[team].tests = [];
    }
  }
}

module.exports = TDDCoverageTracker;