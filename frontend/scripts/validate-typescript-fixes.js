#!/usr/bin/env node

/**
 * TypeScript Fix Validation Monitor
 * Continuously monitors for TypeScript fixes and validates functionality
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

class TypeScriptFixValidator {
  constructor() {
    this.lastValidation = Date.now();
    this.baselineErrors = 13; // From initial validation
    this.criticalFiles = [
      'src/components/pages/AllocationsPage.tsx',
      'src/components/pages/ProjectPage.tsx', 
      'src/components/schedule/WeeklyScheduleGrid.tsx',
      'src/features/employees/components/EmployeeDeleteDialog.tsx',
      'src/features/employees/components/EmployeeForm.tsx',
      'src/features/employees/components/EmployeeFormModal.tsx',
      'src/features/projects/components/ProjectDeleteDialog.tsx',
      'src/features/projects/components/ProjectForm.tsx',
      'src/hooks/index.ts',
      'src/hooks/useRealAllocationData.ts'
    ];
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level}] ${message}`);
  }

  async validateBuild() {
    try {
      const result = execSync('npm run build', { 
        cwd: process.cwd(),
        encoding: 'utf8',
        stdio: 'pipe'
      });
      return { success: true, output: result };
    } catch (error) {
      return { 
        success: false, 
        output: error.stdout + error.stderr,
        errors: this.parseTypeScriptErrors(error.stdout + error.stderr)
      };
    }
  }

  parseTypeScriptErrors(output) {
    const errorLines = output.split('\n').filter(line => 
      line.includes('error TS') || line.includes('error:')
    );
    return errorLines.length;
  }

  async validateFunctionality() {
    try {
      // Test API endpoints
      const healthCheck = execSync('curl -s http://localhost:3001/health', { encoding: 'utf8' });
      const employeesCheck = execSync('curl -s http://localhost:3001/api/employees', { encoding: 'utf8' });
      const projectsCheck = execSync('curl -s http://localhost:3001/api/projects', { encoding: 'utf8' });
      
      // Test frontend
      const frontendCheck = execSync('curl -s http://localhost:3002', { encoding: 'utf8' });
      
      return {
        backend: JSON.parse(healthCheck).status === 'healthy',
        employees_api: employeesCheck.includes('data'),
        projects_api: projectsCheck.includes('data') || projectsCheck.includes('[]'),
        frontend: frontendCheck.includes('<title>')
      };
    } catch (error) {
      this.log(`Functionality validation failed: ${error.message}`, 'ERROR');
      return { backend: false, employees_api: false, projects_api: false, frontend: false };
    }
  }

  async checkForRegressions() {
    const buildResult = await this.validateBuild();
    const functionalityResult = await this.validateFunctionality();
    
    const currentErrors = buildResult.errors || 0;
    const regressions = [];

    // Check for new build errors
    if (!buildResult.success && currentErrors > this.baselineErrors) {
      regressions.push(`Build errors increased from ${this.baselineErrors} to ${currentErrors}`);
    }

    // Check for functionality regressions
    if (!functionalityResult.backend) {
      regressions.push('Backend API is not responding');
    }
    
    if (!functionalityResult.employees_api) {
      regressions.push('Employees API is not functioning');
    }
    
    if (!functionalityResult.projects_api) {
      regressions.push('Projects API is not functioning');
    }
    
    if (!functionalityResult.frontend) {
      regressions.push('Frontend application is not loading');
    }

    return {
      hasRegressions: regressions.length > 0,
      regressions,
      buildResult,
      functionalityResult,
      currentErrors
    };
  }

  async saveValidationResults(results) {
    try {
      execSync(`npx claude-flow@alpha hooks post-edit --memory-key "swarm/typescript/validation" --file "validation-results.json"`, {
        cwd: process.cwd(),
        stdio: 'pipe'
      });
    } catch (error) {
      this.log(`Failed to save validation results: ${error.message}`, 'WARN');
    }
  }

  async validate() {
    this.log('Starting TypeScript fix validation...');
    
    const results = await this.checkForRegressions();
    
    if (results.hasRegressions) {
      this.log('🚨 CRITICAL: REGRESSIONS DETECTED!', 'ERROR');
      results.regressions.forEach(regression => {
        this.log(`  - ${regression}`, 'ERROR');
      });
      this.log('🛑 STOPPING FIX PROCESS - IMMEDIATE ATTENTION REQUIRED', 'ERROR');
      
      // Alert coordination system
      try {
        execSync(`npx claude-flow@alpha hooks notify --message "REGRESSION DETECTED: ${results.regressions.join(', ')}"`, {
          cwd: process.cwd(),
          stdio: 'pipe'
        });
      } catch (error) {
        this.log(`Failed to send regression alert: ${error.message}`, 'WARN');
      }
      
      return false;
    }

    // Check for progress
    if (results.buildResult.success) {
      this.log('✅ Build successful - All TypeScript errors resolved!', 'SUCCESS');
    } else if (results.currentErrors < this.baselineErrors) {
      this.log(`📈 Progress detected: Errors reduced from ${this.baselineErrors} to ${results.currentErrors}`, 'INFO');
      this.baselineErrors = results.currentErrors; // Update baseline
    }

    // Validate functionality still works
    if (results.functionalityResult.backend && 
        results.functionalityResult.employees_api && 
        results.functionalityResult.projects_api && 
        results.functionalityResult.frontend) {
      this.log('✅ All functionality tests passing', 'SUCCESS');
    }

    await this.saveValidationResults(results);
    this.lastValidation = Date.now();
    
    return true;
  }
}

// Main execution
async function main() {
  const validator = new TypeScriptFixValidator();
  
  if (process.argv.includes('--continuous')) {
    // Continuous monitoring mode
    setInterval(async () => {
      await validator.validate();
    }, 30000); // Check every 30 seconds
    
    console.log('🔍 Continuous TypeScript fix validation started...');
  } else {
    // Single validation run
    const success = await validator.validate();
    process.exit(success ? 0 : 1);
  }
}

// Main execution for ES modules
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Validation script failed:', error);
    process.exit(1);
  });
}

export { TypeScriptFixValidator };