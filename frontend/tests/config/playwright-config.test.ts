/**
 * TDD Test for Playwright Configuration Validation
 * Tests that playwright.config.ts has proper project naming and configuration
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { readFile } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

describe('Playwright Configuration Validation', () => {
  let configContent: string
  let packageJsonContent: string

  beforeAll(async () => {
    const configPath = path.resolve(__dirname, '../../playwright.config.ts')
    const packagePath = path.resolve(__dirname, '../../package.json')
    
    configContent = await readFile(configPath, 'utf-8')
    packageJsonContent = await readFile(packagePath, 'utf-8')
  })

  describe('Project Naming Standards', () => {
    it('should use "chromium" as the standard project name, not "Desktop Chrome"', () => {
      // Should have a chromium project
      expect(configContent).toMatch(/name:\s*['"]chromium['"]/)
      
      // Should not reference "Desktop Chrome" in project names
      expect(configContent).not.toMatch(/name:\s*['"]Desktop Chrome['"]/)
      
      // Should use devices['Desktop Chrome'] for browser config only
      expect(configContent).toMatch(/devices\['Desktop Chrome'\]/)
    })

    it('should have consistent PRD project naming', () => {
      const expectedProjects = [
        'PRD-Alex-Planner-Workflow',
        'PRD-Business-Value', 
        'PRD-Performance-Benchmark',
        'PRD-CSV-Export',
        'chromium',
        'PRD-Critical'  // Fixed from "PRD Critical" (no space)
      ]

      expectedProjects.forEach(projectName => {
        expect(configContent).toMatch(new RegExp(`name:\\s*['"]${projectName.replace(/[-\s]/g, '[-\\s]')}['"]`))
      })
    })

    it('should not have spaces in project names', () => {
      // Check that "PRD Critical" is fixed to "PRD-Critical"
      expect(configContent).not.toMatch(/name:\s*['"]PRD Critical['"]/)
      expect(configContent).toMatch(/name:\s*['"]PRD-Critical['"]/)
    })
  })

  describe('Project Configuration Completeness', () => {
    it('should have proper testMatch patterns for PRD projects', () => {
      const prdProjectPatterns = [
        { project: 'PRD-Alex-Planner-Workflow', pattern: 'prd-validation-alex-planner.spec.ts' },
        { project: 'PRD-Business-Value', pattern: 'business-value-validation.spec.ts' },
        { project: 'PRD-Performance-Benchmark', pattern: 'performance-benchmark.spec.ts' },
        { project: 'PRD-CSV-Export', pattern: 'csv-export-validation.spec.ts' },
        { project: 'PRD-Critical', pattern: 'prd-critical-functionality.spec.ts' }
      ]

      prdProjectPatterns.forEach(({ project, pattern }) => {
        expect(configContent).toMatch(new RegExp(`name:\\s*['"]${project}['"][\\s\\S]*?testMatch:\\s*['"][^'"]*${pattern}['"]`))
      })
    })

    it('should have chromium project with proper testIgnore patterns', () => {
      // Check for chromium project 
      expect(configContent).toMatch(/name:\s*['"]chromium['"]/)  
      
      // Should have global testIgnore patterns that include non-e2e tests
      expect(configContent).toMatch(/testIgnore:\s*\[/)
      
      // Should ignore integration and component tests at global level
      const globalIgnoredPatterns = [
        '**/integration/**',
        '**/components/**',
        '**/hooks/**',
        '**/services/**'
      ]

      globalIgnoredPatterns.forEach(pattern => {
        const escapedPattern = pattern.replace(/\*/g, '\\*').replace(/\//g, '\\/')
        expect(configContent).toMatch(new RegExp(`['"]${escapedPattern}['"]`))
      })
      
      // Chromium project should have its own testIgnore for PRD tests (if present)
      const prdIgnorePatterns = [
        'prd-validation-*.spec.ts',
        'business-value-*.spec.ts', 
        'performance-*.spec.ts',
        'csv-export-*.spec.ts'
      ]

      // Check if chromium has project-level testIgnore
      const chromiumProjectMatch = configContent.match(/name:\s*['"]chromium['"][^}]*}/s)
      if (chromiumProjectMatch && chromiumProjectMatch[0].includes('testIgnore')) {
        prdIgnorePatterns.forEach(pattern => {
          expect(configContent).toMatch(new RegExp(`['"]\\*\\*/\\${pattern}['"]`))
        })
      }
    })

    it('should have consistent browser configuration', () => {
      // All PRD projects should use Desktop Chrome device
      const prdProjects = ['PRD-Alex-Planner-Workflow', 'PRD-Business-Value', 'PRD-Performance-Benchmark', 'PRD-CSV-Export']
      
      prdProjects.forEach(project => {
        expect(configContent).toMatch(
          new RegExp(`name:\\s*['"]${project}['"][\\s\\S]*?\\.\\.\\.devices\\['Desktop Chrome'\\]`)
        )
      })
    })
  })

  describe('Package.json Script Alignment', () => {
    it('should have matching script names for all PRD projects', () => {
      const packageJson = JSON.parse(packageJsonContent)
      const scripts = packageJson.scripts

      // Verify PRD validation scripts exist and match project names
      expect(scripts['prd-validation:alex']).toMatch(/PRD-Alex-Planner-Workflow/)
      expect(scripts['prd-validation:business']).toMatch(/PRD-Business-Value/)
      expect(scripts['prd-validation:performance']).toMatch(/PRD-Performance-Benchmark/)
      expect(scripts['prd-validation:export']).toMatch(/PRD-CSV-Export/)
      
      // The "PRD Critical" should be fixed to "PRD-Critical" in scripts too
      if (scripts['prd-validation:critical']) {
        expect(scripts['prd-validation:critical']).toMatch(/PRD-Critical/)
      }
    })
  })

  describe('Configuration Structure', () => {
    it('should have proper timeout configurations', () => {
      expect(configContent).toMatch(/timeout:\s*15\s*\*\s*60\s*\*\s*1000/) // 15 minutes
      expect(configContent).toMatch(/globalTimeout:\s*30\s*\*\s*60\s*\*\s*1000/) // 30 minutes
    })

    it('should have proper reporter configuration', () => {
      expect(configContent).toMatch(/reporter:\s*\[/)
      expect(configContent).toMatch(/'line'/)
      expect(configContent).toMatch(/'html'/)
      expect(configContent).toMatch(/'json'/)
      expect(configContent).toMatch(/'junit'/)
    })

    it('should have baseURL configured', () => {
      // Should have localhost baseURL (port may vary)
      expect(configContent).toMatch(/baseURL:\s*['"]http:\/\/localhost:\d+['"]/)
    })

    it('should have webServer configuration', () => {
      expect(configContent).toMatch(/webServer:\s*{/)
      expect(configContent).toMatch(/command:\s*['"]npm run dev['"]/)
      expect(configContent).toMatch(/url:\s*['"]http:\/\/localhost:\d+['"]/)  // Port may vary
    })
  })
})