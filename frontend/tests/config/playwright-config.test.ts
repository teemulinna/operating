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

    it('should have consistent project naming (simplified config)', () => {
      // Simplified config only has chromium project
      expect(configContent).toMatch(/name:\s*['"]chromium['"]/)

      // Should not have spaces in any project names
      expect(configContent).not.toMatch(/name:\s*['"][^'"]*\s[^'"]*['"]/)
    })

    it('should not have spaces in project names', () => {
      // Verify no project names contain spaces
      const projectNameMatches = configContent.match(/name:\s*['"]([^'"]+)['"]/g) || []
      projectNameMatches.forEach(match => {
        const name = match.match(/name:\s*['"]([^'"]+)['"]/)?.[1]
        if (name) {
          expect(name).not.toMatch(/\s/)
        }
      })
    })
  })

  describe('Project Configuration Completeness', () => {
    it('should have chromium project configured', () => {
      // Simplified config has single chromium project
      expect(configContent).toMatch(/name:\s*['"]chromium['"]/)

      // Should use Desktop Chrome device
      expect(configContent).toMatch(/devices\['Desktop Chrome'\]/)
    })

    it('should have proper browser configuration', () => {
      // Check for chromium project
      expect(configContent).toMatch(/name:\s*['"]chromium['"]/)

      // Should have launch options configured
      expect(configContent).toMatch(/launchOptions:\s*\{/)

      // Should disable web security for testing
      expect(configContent).toMatch(/--disable-web-security/)
    })
  })

  describe('Package.json Script Alignment', () => {
    it('should have matching script names for E2E tests', () => {
      const packageJson = JSON.parse(packageJsonContent)
      const scripts = packageJson.scripts || {}

      // Verify basic Playwright scripts exist
      const requiredScripts = [
        'test:e2e',
        'test:e2e:ui',
        'test:e2e:headed'
      ]

      requiredScripts.forEach(scriptName => {
        expect(scripts[scriptName]).toBeDefined()
      })
    })
  })

  describe('Configuration Structure', () => {
    it('should have proper timeout configurations', () => {
      // Should have timeout configured
      expect(configContent).toMatch(/timeout:\s*\d+/)

      // Verify timeout is reasonable (30s - 10min)
      const timeoutMatch = configContent.match(/timeout:\s*(\d+)/)
      if (timeoutMatch) {
        const timeout = parseInt(timeoutMatch[1])
        expect(timeout).toBeGreaterThanOrEqual(30000) // At least 30 seconds
        expect(timeout).toBeLessThanOrEqual(600000) // At most 10 minutes
      }
    })

    it('should have proper reporter configuration', () => {
      // Should have reporter array configured
      expect(configContent).toMatch(/reporter:\s*\[/)

      // Should include html reporter
      expect(configContent).toMatch(/'html'/)

      // Should include line or list reporter
      const hasConsoleReporter = configContent.match(/'line'/) || configContent.match(/'list'/)
      expect(hasConsoleReporter).toBeTruthy()
    })

    it('should have baseURL configured', () => {
      // Should have localhost baseURL (port may vary)
      expect(configContent).toMatch(/baseURL:\s*['"]http:\/\/localhost:\d+['"]/)
    })

    it('should have webServer configuration', () => {
      // Should have web server configured
      expect(configContent).toMatch(/webServer:\s*\{/)

      // Should have command to start dev server
      expect(configContent).toMatch(/command:\s*['"]npm run dev['"]/)

      // Should have URL configured
      expect(configContent).toMatch(/url:\s*['"]http:\/\/localhost:\d+['"]/)
    })
  })
})
