#!/usr/bin/env node

// Baseline Performance Measurement Setup
// This script collects pre-refactoring metrics that don't require a successful build

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class BaselineAnalyzer {
  constructor() {
    this.metrics = {
      timestamp: new Date().toISOString(),
      codebase: {
        appTsxLines: 0,
        inlineComponents: 0,
        totalComponents: 0,
        routeCount: 0,
        dependencies: 0
      },
      buildConfig: {
        chunks: [],
        optimizations: []
      },
      development: {
        startTime: 0,
        memoryUsage: process.memoryUsage()
      },
      buildStatus: {
        passing: false,
        errorCount: 0,
        warningCount: 0
      }
    };
  }

  async analyzeAppTsx() {
    try {
      const appTsxPath = path.join(__dirname, '../src/App.tsx');
      const content = await fs.readFile(appTsxPath, 'utf8');
      
      this.metrics.codebase.appTsxLines = content.split('\n').length;
      
      // Count inline components (functions defined inside App.tsx)
      const functionMatches = content.match(/^function\s+\w+\s*\(/gm) || [];
      this.metrics.codebase.inlineComponents = functionMatches.length - 1; // Subtract App itself
      
      // Count routes
      const routeMatches = content.match(/<Route\s+path=/g) || [];
      this.metrics.codebase.routeCount = routeMatches.length;
      
      console.log(`📊 App.tsx Analysis:`);
      console.log(`  - Lines of code: ${this.metrics.codebase.appTsxLines}`);
      console.log(`  - Inline components: ${this.metrics.codebase.inlineComponents}`);
      console.log(`  - Routes defined: ${this.metrics.codebase.routeCount}`);
    } catch (error) {
      console.error('Error analyzing App.tsx:', error.message);
    }
  }

  async analyzeComponentStructure() {
    try {
      const componentsDir = path.join(__dirname, '../src/components');
      const featuresDir = path.join(__dirname, '../src/features');
      
      const countTsxFiles = async (dir) => {
        try {
          // Simple recursive file count
          const output = execSync(`find "${dir}" -name "*.tsx" | wc -l`, { encoding: 'utf8' });
          return parseInt(output.trim());
        } catch {
          return 0;
        }
      };
      
      const componentFiles = await countTsxFiles(componentsDir);
      const featureFiles = await countTsxFiles(featuresDir);
      
      this.metrics.codebase.totalComponents = componentFiles + featureFiles;
      
      console.log(`🏗️  Component Structure:`);
      console.log(`  - Components directory: ${componentFiles} files`);
      console.log(`  - Features directory: ${featureFiles} files`);
      console.log(`  - Total TSX files: ${this.metrics.codebase.totalComponents}`);
    } catch (error) {
      console.error('Error analyzing component structure:', error.message);
    }
  }

  async analyzeDependencies() {
    try {
      const packageJsonPath = path.join(__dirname, '../package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
      
      const prodDeps = Object.keys(packageJson.dependencies || {}).length;
      const devDeps = Object.keys(packageJson.devDependencies || {}).length;
      
      this.metrics.codebase.dependencies = prodDeps + devDeps;
      
      console.log(`📦 Dependencies:`);
      console.log(`  - Production: ${prodDeps}`);
      console.log(`  - Development: ${devDeps}`);
      console.log(`  - Total: ${this.metrics.codebase.dependencies}`);
    } catch (error) {
      console.error('Error analyzing dependencies:', error.message);
    }
  }

  async analyzeBuildConfig() {
    try {
      const viteConfigPath = path.join(__dirname, '../vite.config.ts');
      const configContent = await fs.readFile(viteConfigPath, 'utf8');
      
      // Extract chunk configuration
      const chunkMatches = configContent.match(/(\w+): \[.*?\]/g) || [];
      this.metrics.buildConfig.chunks = chunkMatches;
      
      // Check optimizations
      const optimizations = [];
      if (configContent.includes('terser')) optimizations.push('terser');
      if (configContent.includes('manualChunks')) optimizations.push('code-splitting');
      if (configContent.includes('optimizeDeps')) optimizations.push('pre-bundling');
      
      this.metrics.buildConfig.optimizations = optimizations;
      
      console.log(`⚙️  Build Configuration:`);
      console.log(`  - Configured chunks: ${this.metrics.buildConfig.chunks.length}`);
      console.log(`  - Optimizations: ${optimizations.join(', ')}`);
    } catch (error) {
      console.error('Error analyzing build config:', error.message);
    }
  }

  async testBuildStatus() {
    try {
      console.log(`🔨 Testing build status...`);
      const buildOutput = execSync('npm run build', { 
        cwd: path.join(__dirname, '..'),
        encoding: 'utf8',
        timeout: 120000
      });
      
      this.metrics.buildStatus.passing = true;
      console.log(`✅ Build successful!`);
      
      // If build succeeds, measure bundle sizes
      await this.measureBundleSizes();
    } catch (error) {
      this.metrics.buildStatus.passing = false;
      const errorOutput = error.stdout + error.stderr;
      
      // Count errors and warnings
      this.metrics.buildStatus.errorCount = (errorOutput.match(/error TS/g) || []).length;
      this.metrics.buildStatus.warningCount = (errorOutput.match(/warning/g) || []).length;
      
      console.log(`❌ Build failed:`);
      console.log(`  - Errors: ${this.metrics.buildStatus.errorCount}`);
      console.log(`  - Warnings: ${this.metrics.buildStatus.warningCount}`);
    }
  }

  async measureBundleSizes() {
    try {
      const distPath = path.join(__dirname, '../dist');
      
      // Use command line tools for file size measurement
      const jsFiles = execSync(`find "${distPath}" -name "*.js" -exec ls -la {} + | awk '{print $9 ":" $5}' || echo ""`, { encoding: 'utf8' });
      const cssFiles = execSync(`find "${distPath}" -name "*.css" -exec ls -la {} + | awk '{print $9 ":" $5}' || echo ""`, { encoding: 'utf8' });
      
      const chunks = {};
      let totalSize = 0;
      
      [jsFiles, cssFiles].forEach(fileList => {
        fileList.split('\n').forEach(line => {
          if (line.trim()) {
            const [filePath, size] = line.split(':');
            if (filePath && size) {
              const fileName = path.basename(filePath);
              const fileSize = parseInt(size);
              chunks[fileName] = fileSize;
              totalSize += fileSize;
            }
          }
        });
      });
      
      this.metrics.bundleSize = { total: totalSize, chunks };
      
      console.log(`📊 Bundle Analysis:`);
      console.log(`  - Total size: ${(totalSize / 1024).toFixed(2)} KB`);
      console.log(`  - Number of files: ${Object.keys(chunks).length}`);
    } catch (error) {
      console.log(`⏭️  Bundle analysis skipped: ${error.message}`);
    }
  }

  async generateReport() {
    const reportPath = path.join(__dirname, 'baseline-metrics.json');
    await fs.writeFile(reportPath, JSON.stringify(this.metrics, null, 2));
    
    const mdReportPath = path.join(__dirname, 'baseline-report.md');
    const mdContent = this.generateMarkdownReport();
    await fs.writeFile(mdReportPath, mdContent);
    
    console.log(`\n📋 Baseline Report Generated:`);
    console.log(`  - JSON: ${reportPath}`);
    console.log(`  - Markdown: ${mdReportPath}`);
  }

  generateMarkdownReport() {
    const { metrics } = this;
    return `# Performance Baseline Report

**Generated:** ${metrics.timestamp}

## Codebase Analysis

### App.tsx Structure
- **Lines of Code:** ${metrics.codebase.appTsxLines}
- **Inline Components:** ${metrics.codebase.inlineComponents}
- **Routes Defined:** ${metrics.codebase.routeCount}

### Component Architecture
- **Total Components:** ${metrics.codebase.totalComponents}
- **Dependencies:** ${metrics.codebase.dependencies}

### Build Status
- **Build Passing:** ${metrics.buildStatus.passing ? '✅' : '❌'}
- **TypeScript Errors:** ${metrics.buildStatus.errorCount}
- **Warnings:** ${metrics.buildStatus.warningCount}

## Performance Metrics

${metrics.bundleSize ? `
### Bundle Analysis
- **Total Size:** ${(metrics.bundleSize.total / 1024).toFixed(2)} KB
- **Number of Files:** ${Object.keys(metrics.bundleSize.chunks).length}

#### Chunk Breakdown
${Object.entries(metrics.bundleSize.chunks)
  .sort(([,a], [,b]) => b - a)
  .slice(0, 10)
  .map(([file, size]) => `- ${file}: ${(size / 1024).toFixed(2)} KB`)
  .join('\n')}
` : '- Bundle analysis pending (build required)'}

### Development Performance
- **Memory Usage:** ${(metrics.development.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB

## Refactoring Plan

### Performance Targets
- ✅ Extract ${metrics.codebase.inlineComponents} inline components
- ✅ Implement lazy loading for ${metrics.codebase.routeCount} routes
- ✅ Maintain bundle size ≤ ${metrics.bundleSize ? (metrics.bundleSize.total / 1024).toFixed(0) : 'TBD'} KB

### Risk Assessment
${metrics.buildStatus.errorCount > 0 ? '🔴 **HIGH RISK:** TypeScript errors must be resolved before baseline' : '🟢 **LOW RISK:** Build passing'}
${metrics.codebase.inlineComponents > 3 ? '🟡 **MEDIUM RISK:** Multiple inline components may affect bundle splitting' : ''}

### Next Steps
1. ${metrics.buildStatus.errorCount > 0 ? 'Fix TypeScript compilation errors' : 'Begin component extraction'}
2. Establish runtime performance baselines  
3. Monitor changes during refactoring
4. Validate performance targets met

---
*Generated by Performance Analysis Specialist*`;
  }

  async run() {
    console.log(`🔍 Starting Performance Baseline Analysis...\n`);
    
    await this.analyzeAppTsx();
    await this.analyzeComponentStructure();
    await this.analyzeDependencies();
    await this.analyzeBuildConfig();
    await this.testBuildStatus();
    await this.generateReport();
    
    console.log(`\n✅ Baseline analysis complete!`);
    console.log(`📊 Key Metrics:`);
    console.log(`  - App.tsx: ${this.metrics.codebase.appTsxLines} lines, ${this.metrics.codebase.inlineComponents} inline components`);
    console.log(`  - Build Status: ${this.metrics.buildStatus.passing ? 'PASS' : 'FAIL'} (${this.metrics.buildStatus.errorCount} errors)`);
    
    if (this.metrics.bundleSize) {
      console.log(`  - Bundle Size: ${(this.metrics.bundleSize.total / 1024).toFixed(2)} KB`);
    }
  }
}

// Run the analysis
const analyzer = new BaselineAnalyzer();
analyzer.run().catch(console.error);