/**
 * End-to-End Tests for Skill Matching Workflow
 * Tests complete user journeys for AI-powered skill matching features
 */

import { test, expect, Page } from '@playwright/test';

test.describe('AI Skill Matching Features', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application and ensure it's loaded
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Login if required
    await loginIfNeeded(page);
    
    // Navigate to skill matching section
    await page.click('[data-testid="navigation-skill-matching"]');
    await expect(page).toHaveURL(/.*skill-matching/);
  });

  test.describe('Employee-Project Matching Workflow', () => {
    test('should find skilled employees for project roles using AI matching', async ({ page }) => {
      // Navigate to project role matching
      await page.click('[data-testid="project-role-matching-tab"]');
      await expect(page.locator('h1')).toContainText('AI-Powered Skill Matching');

      // Select or create a project for matching
      await page.click('[data-testid="select-project"]');
      await page.selectOption('[data-testid="project-dropdown"]', '1'); // Select first project
      
      // Define role requirements
      await page.click('[data-testid="add-role-requirement"]');
      await page.fill('[data-testid="role-name-0"]', 'Senior Frontend Developer');
      
      // Add required skills
      await page.click('[data-testid="add-required-skill-0"]');
      await page.selectOption('[data-testid="skill-select-0-0"]', 'JavaScript');
      await page.selectOption('[data-testid="minimum-level-0-0"]', 'intermediate');
      await page.fill('[data-testid="skill-weight-0-0"]', '80');
      await page.check('[data-testid="skill-mandatory-0-0"]');

      await page.click('[data-testid="add-required-skill-0"]');
      await page.selectOption('[data-testid="skill-select-0-1"]', 'React');
      await page.selectOption('[data-testid="minimum-level-0-1"]', 'advanced');
      await page.fill('[data-testid="skill-weight-0-1"]', '90');
      await page.check('[data-testid="skill-mandatory-0-1"]');

      // Set experience level and project duration
      await page.selectOption('[data-testid="experience-level-0"]', 'senior');
      await page.fill('[data-testid="project-duration-0"]', '12');
      
      // Set project dates
      await page.fill('[data-testid="start-date-0"]', '2024-01-01');
      await page.fill('[data-testid="end-date-0"]', '2024-12-31');

      // Configure matching options
      await page.fill('[data-testid="max-results"]', '10');
      await page.check('[data-testid="include-partial-matches"]');
      await page.uncheck('[data-testid="consider-training"]'); // Focus on exact matches first
      await page.fill('[data-testid="team-fit-weight"]', '10');

      // Run AI matching algorithm
      await page.click('[data-testid="run-skill-matching"]');
      
      // Wait for matching to complete
      await expect(page.locator('[data-testid="matching-loading"]')).toBeVisible();
      await expect(page.locator('[data-testid="matching-loading"]')).not.toBeVisible({ timeout: 30000 });

      // Validate matching results
      await expect(page.locator('[data-testid="matching-results"]')).toBeVisible();
      
      const matchResultCards = page.locator('[data-testid="match-result-card"]');
      await expect(matchResultCards).toHaveCountGreaterThan(0);
      await expect(matchResultCards).toHaveCountLessThanOrEqual(10);

      // Validate individual match result
      const firstMatch = matchResultCards.first();
      await expect(firstMatch.locator('[data-testid="employee-name"]')).not.toBeEmpty();
      await expect(firstMatch.locator('[data-testid="employee-email"]')).toContainText(/@/);
      await expect(firstMatch.locator('[data-testid="employee-department"]')).not.toBeEmpty();
      await expect(firstMatch.locator('[data-testid="employee-position"]')).not.toBeEmpty();

      // Check overall match score
      const matchScore = await firstMatch.locator('[data-testid="overall-match-score"]').textContent();
      expect(parseInt(matchScore || '0')).toBeGreaterThan(70); // Should be high for top match
      expect(parseInt(matchScore || '100')).toBeLessThanOrEqual(100);

      // Check confidence level
      const confidenceLevel = await firstMatch.locator('[data-testid="confidence-level"]').textContent();
      expect(parseInt(confidenceLevel || '0')).toBeGreaterThan(0);
      expect(parseInt(confidenceLevel || '100')).toBeLessThanOrEqual(100);

      // Expand first match to see details
      await firstMatch.locator('[data-testid="expand-match-details"]').click();
      
      // Validate skill breakdown
      await expect(firstMatch.locator('[data-testid="skill-breakdown"]')).toBeVisible();
      await expect(firstMatch.locator('[data-testid="required-skills-section"]')).toBeVisible();
      
      const requiredSkillRows = firstMatch.locator('[data-testid="required-skill-row"]');
      await expect(requiredSkillRows).toHaveCountGreaterThan(0);
      
      // Check JavaScript skill match
      const jsSkillRow = requiredSkillRows.filter({ hasText: 'JavaScript' }).first();
      await expect(jsSkillRow.locator('[data-testid="skill-match-score"]')).toContainText(/\d+/);
      await expect(jsSkillRow.locator('[data-testid="employee-skill-level"]')).toContainText(/(beginner|intermediate|advanced|expert)/);
      await expect(jsSkillRow.locator('[data-testid="required-skill-level"]')).toContainText('intermediate');

      // Check experience alignment
      await expect(firstMatch.locator('[data-testid="experience-alignment"]')).toBeVisible();
      await expect(firstMatch.locator('[data-testid="total-experience"]')).toContainText(/\d+ years?/);
      await expect(firstMatch.locator('[data-testid="relevant-experience"]')).toContainText(/\d+ years?/);
      await expect(firstMatch.locator('[data-testid="experience-score"]')).toContainText(/\d+/);

      // Check availability metrics
      await expect(firstMatch.locator('[data-testid="availability-metrics"]')).toBeVisible();
      await expect(firstMatch.locator('[data-testid="current-utilization"]')).toContainText(/\d+%/);
      await expect(firstMatch.locator('[data-testid="capacity-score"]')).toContainText(/\d+/);

      // Check risk assessment
      await expect(firstMatch.locator('[data-testid="risk-assessment"]')).toBeVisible();
      await expect(firstMatch.locator('[data-testid="overall-risk"]')).toContainText(/(low|medium|high)/);
      
      const riskFactors = firstMatch.locator('[data-testid="risk-factor"]');
      riskFactors.forEach(async (factor) => {
        await expect(factor.locator('[data-testid="risk-type"]')).toContainText(/(availability|skill_gap|overqualification|experience|workload)/);
        await expect(factor.locator('[data-testid="risk-severity"]')).toContainText(/(low|medium|high)/);
        await expect(factor.locator('[data-testid="risk-description"]')).not.toBeEmpty();
      });

      // Check performance prediction
      await expect(firstMatch.locator('[data-testid="performance-prediction"]')).toBeVisible();
      const predictedScore = await firstMatch.locator('[data-testid="predicted-performance-score"]').textContent();
      expect(parseInt(predictedScore || '0')).toBeGreaterThan(50);
      expect(parseInt(predictedScore || '100')).toBeLessThanOrEqual(100);
      
      await expect(firstMatch.locator('[data-testid="confidence-bounds"]')).toContainText(/\d+ - \d+/);
      
      const keyFactors = firstMatch.locator('[data-testid="key-prediction-factor"]');
      await expect(keyFactors).toHaveCountGreaterThan(0);
    });

    test('should handle complex multi-skill project requirements', async ({ page }) => {
      // Navigate to advanced matching
      await page.click('[data-testid="advanced-matching-tab"]');
      await expect(page.locator('h2')).toContainText('Advanced Multi-Skill Matching');

      // Set up complex project requirements
      await page.click('[data-testid="create-complex-project"]');
      await page.fill('[data-testid="project-name"]', 'AI Data Platform Development');
      await page.fill('[data-testid="project-description"]', 'Complex ML platform with cloud deployment');

      // Add multiple role types
      await page.click('[data-testid="add-project-role"]');
      await page.fill('[data-testid="role-name-0"]', 'ML Engineer');
      await page.selectOption('[data-testid="role-experience-0"]', 'expert');
      
      // Add ML Engineer skills
      await page.click('[data-testid="add-skill-requirement-0"]');
      await page.selectOption('[data-testid="skill-0-0"]', 'Python');
      await page.selectOption('[data-testid="level-0-0"]', 'advanced');
      await page.fill('[data-testid="weight-0-0"]', '90');
      await page.check('[data-testid="mandatory-0-0"]');

      await page.click('[data-testid="add-skill-requirement-0"]');
      await page.selectOption('[data-testid="skill-0-1"]', 'Machine Learning');
      await page.selectOption('[data-testid="level-0-1"]', 'expert');
      await page.fill('[data-testid="weight-0-1"]', '100');
      await page.check('[data-testid="mandatory-0-1"]');

      await page.click('[data-testid="add-skill-requirement-0"]');
      await page.selectOption('[data-testid="skill-0-2"]', 'AWS');
      await page.selectOption('[data-testid="level-0-2"]', 'intermediate');
      await page.fill('[data-testid="weight-0-2']', '70');

      // Add second role - DevOps Engineer
      await page.click('[data-testid="add-project-role"]');
      await page.fill('[data-testid="role-name-1"]', 'DevOps Engineer');
      await page.selectOption('[data-testid="role-experience-1"]', 'senior');

      // Add DevOps skills
      await page.click('[data-testid="add-skill-requirement-1"]');
      await page.selectOption('[data-testid="skill-1-0"]', 'AWS');
      await page.selectOption('[data-testid="level-1-0"]', 'expert');
      await page.fill('[data-testid="weight-1-0"]', '95');
      await page.check('[data-testid="mandatory-1-0"]');

      await page.click('[data-testid="add-skill-requirement-1"]');
      await page.selectOption('[data-testid="skill-1-1"]', 'Docker');
      await page.selectOption('[data-testid="level-1-1"]', 'advanced');
      await page.fill('[data-testid="weight-1-1"]', '85');
      await page.check('[data-testid="mandatory-1-1"]');

      // Set team dynamics requirements
      await page.click('[data-testid="team-dynamics-section"]');
      await page.check('[data-testid="cultural-fit-required"]');
      await page.check('[data-testid="leadership-needed"]');
      await page.fill('[data-testid="existing-team-skills"]', 'Python, TensorFlow, Docker');

      // Set budget and timeline constraints
      await page.fill('[data-testid="budget-min"]', '150000');
      await page.fill('[data-testid="budget-max"]', '250000');
      await page.fill('[data-testid="project-timeline"]', '18');

      // Run advanced matching
      await page.click('[data-testid="run-advanced-matching"]');
      
      // Wait for complex matching to complete
      await expect(page.locator('[data-testid="advanced-matching-loading"]')).toBeVisible();
      await expect(page.locator('[data-testid="advanced-matching-loading"]')).not.toBeVisible({ timeout: 45000 });

      // Validate results for each role
      await expect(page.locator('[data-testid="role-matching-results"]')).toBeVisible();
      
      // Check ML Engineer matches
      const mlEngineerSection = page.locator('[data-testid="ml-engineer-matches"]');
      await expect(mlEngineerSection).toBeVisible();
      
      const mlMatches = mlEngineerSection.locator('[data-testid="role-match-card"]');
      await expect(mlMatches).toHaveCountGreaterThan(0);
      
      // Validate ML match has required expertise
      const topMLMatch = mlMatches.first();
      await topMLMatch.locator('[data-testid="expand-details"]').click();
      
      const mlSkillRow = topMLMatch.locator('[data-testid="required-skill-row"]').filter({ hasText: 'Machine Learning' });
      const mlSkillScore = await mlSkillRow.locator('[data-testid="skill-match-score"]').textContent();
      expect(parseInt(mlSkillScore || '0')).toBeGreaterThan(80); // High ML skill match required

      // Check DevOps Engineer matches
      const devopsSection = page.locator('[data-testid="devops-engineer-matches"]');
      await expect(devopsSection).toBeVisible();
      
      const devopsMatches = devopsSection.locator('[data-testid="role-match-card"]');
      await expect(devopsMatches).toHaveCountGreaterThan(0);

      // Check team composition suggestions
      await expect(page.locator('[data-testid="team-composition-suggestions"]')).toBeVisible();
      await expect(page.locator('[data-testid="optimal-team-size"]')).toContainText(/\d+/);
      await expect(page.locator('[data-testid="estimated-project-cost"]')).toContainText(/\$[\d,]+/);
      await expect(page.locator('[data-testid="skill-coverage-analysis"]')).toBeVisible();

      // Validate skill gap analysis
      await expect(page.locator('[data-testid="skill-gap-analysis"]')).toBeVisible();
      const skillGaps = page.locator('[data-testid="skill-gap-item"]');
      
      skillGaps.forEach(async (gap) => {
        await expect(gap.locator('[data-testid="gap-skill-name"]')).not.toBeEmpty();
        await expect(gap.locator('[data-testid="gap-severity"]')).toContainText(/(minor|moderate|major|critical)/);
        await expect(gap.locator('[data-testid="gap-recommendations"]')).not.toBeEmpty();
      });
    });

    test('should calculate skill similarity between candidates', async ({ page }) => {
      // Navigate to skill similarity analysis
      await page.click('[data-testid="skill-similarity-tab"]');
      await expect(page.locator('h2')).toContainText('Skill Similarity Analysis');

      // Select first employee set
      await page.click('[data-testid="select-employee-set-1"]');
      await page.check('[data-testid="employee-checkbox-alice"]');
      await page.check('[data-testid="employee-checkbox-bob"]');
      await page.check('[data-testid="employee-checkbox-carol"]');
      await page.click('[data-testid="confirm-employee-set-1"]');

      // Select second employee set for comparison
      await page.click('[data-testid="select-employee-set-2"]');
      await page.check('[data-testid="employee-checkbox-david"]');
      await page.check('[data-testid="employee-checkbox-eva"]');
      await page.check('[data-testid="employee-checkbox-frank"]');
      await page.click('[data-testid="confirm-employee-set-2"]');

      // Configure similarity calculation
      await page.fill('[data-testid="context-weight"]', '30');
      await page.check('[data-testid="include-semantic-similarity"]');
      await page.check('[data-testid="consider-experience-weights"]');

      // Run similarity analysis
      await page.click('[data-testid="calculate-similarity"]');
      
      // Wait for calculation to complete
      await expect(page.locator('[data-testid="similarity-loading"]')).toBeVisible();
      await expect(page.locator('[data-testid="similarity-loading"]')).not.toBeVisible({ timeout: 15000 });

      // Validate similarity results
      await expect(page.locator('[data-testid="similarity-results"]')).toBeVisible();
      
      // Check similarity metrics
      const cosineSimilarity = await page.locator('[data-testid="cosine-similarity"]').textContent();
      expect(parseFloat(cosineSimilarity || '0')).toBeGreaterThanOrEqual(0);
      expect(parseFloat(cosineSimilarity || '1')).toBeLessThanOrEqual(1);

      const jaccardIndex = await page.locator('[data-testid="jaccard-index"]').textContent();
      expect(parseFloat(jaccardIndex || '0')).toBeGreaterThanOrEqual(0);
      expect(parseFloat(jaccardIndex || '1')).toBeLessThanOrEqual(1);

      const semanticSimilarity = await page.locator('[data-testid="semantic-similarity"]').textContent();
      expect(parseFloat(semanticSimilarity || '0')).toBeGreaterThanOrEqual(0);
      expect(parseFloat(semanticSimilarity || '1')).toBeLessThanOrEqual(1);

      const overallSimilarity = await page.locator('[data-testid="overall-similarity"]').textContent();
      expect(parseFloat(overallSimilarity || '0')).toBeGreaterThanOrEqual(0);
      expect(parseFloat(overallSimilarity || '1')).toBeLessThanOrEqual(1);

      // Check similarity visualization
      await expect(page.locator('[data-testid="similarity-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="skill-overlap-diagram"]')).toBeVisible();

      // Check detailed breakdown
      await expect(page.locator('[data-testid="similarity-breakdown"]')).toBeVisible();
      const commonSkills = page.locator('[data-testid="common-skill"]');
      const uniqueSkills1 = page.locator('[data-testid="unique-skill-set-1"]');
      const uniqueSkills2 = page.locator('[data-testid="unique-skill-set-2"]');
      
      await expect(commonSkills).toHaveCountGreaterThanOrEqual(0);
      await expect(uniqueSkills1).toHaveCountGreaterThanOrEqual(0);
      await expect(uniqueSkills2).toHaveCountGreaterThanOrEqual(0);
    });

    test('should provide performance prediction for matched candidates', async ({ page }) => {
      // First run a matching to get candidates
      await page.click('[data-testid="project-role-matching-tab"]');
      await page.selectOption('[data-testid="project-dropdown"]', '2');
      
      // Quick role setup
      await page.click('[data-testid="add-role-requirement"]');
      await page.fill('[data-testid="role-name-0"]', 'Full Stack Developer');
      await page.selectOption('[data-testid="experience-level-0"]', 'senior');
      
      await page.click('[data-testid="add-required-skill-0"]');
      await page.selectOption('[data-testid="skill-select-0-0"]', 'JavaScript');
      await page.selectOption('[data-testid="minimum-level-0-0"]', 'advanced');

      await page.click('[data-testid="run-skill-matching"]');
      await expect(page.locator('[data-testid="matching-loading"]')).not.toBeVisible({ timeout: 30000 });

      // Select first match for performance prediction
      const firstMatch = page.locator('[data-testid="match-result-card"]').first();
      await firstMatch.locator('[data-testid="expand-match-details"]').click();
      await firstMatch.locator('[data-testid="predict-performance"]').click();

      // Wait for performance prediction
      await expect(page.locator('[data-testid="performance-prediction-loading"]')).toBeVisible();
      await expect(page.locator('[data-testid="performance-prediction-loading"]')).not.toBeVisible({ timeout: 20000 });

      // Validate performance prediction results
      await expect(page.locator('[data-testid="performance-prediction-results"]')).toBeVisible();
      
      const predictedScore = await page.locator('[data-testid="predicted-performance-score"]').textContent();
      expect(parseInt(predictedScore || '0')).toBeGreaterThan(50);
      expect(parseInt(predictedScore || '100')).toBeLessThanOrEqual(100);

      // Check confidence interval
      await expect(page.locator('[data-testid="prediction-confidence-interval"]')).toContainText(/\d+ - \d+/);
      const confidenceBounds = await page.locator('[data-testid="prediction-confidence-interval"]').textContent();
      const bounds = confidenceBounds?.match(/(\d+) - (\d+)/);
      if (bounds) {
        expect(parseInt(bounds[1])).toBeLessThanOrEqual(parseInt(bounds[2]));
      }

      // Check key predictive factors
      await expect(page.locator('[data-testid="key-predictors-section"]')).toBeVisible();
      const keyPredictors = page.locator('[data-testid="key-predictor"]');
      await expect(keyPredictors).toHaveCountGreaterThan(0);
      
      keyPredictors.forEach(async (predictor) => {
        await expect(predictor).not.toBeEmpty();
      });

      // Check risk factors
      await expect(page.locator('[data-testid="prediction-risk-factors"]')).toBeVisible();
      const riskFactors = page.locator('[data-testid="prediction-risk-factor"]');
      
      riskFactors.forEach(async (factor) => {
        await expect(factor).not.toBeEmpty();
      });

      // Check historical performance basis
      await expect(page.locator('[data-testid="historical-performance-basis"]')).toBeVisible();
      const historicalProjects = page.locator('[data-testid="historical-project"]');
      
      historicalProjects.forEach(async (project) => {
        await expect(project.locator('[data-testid="project-similarity"]')).toContainText(/\d+%/);
        await expect(project.locator('[data-testid="actual-performance"]')).toContainText(/\d+/);
        await expect(project.locator('[data-testid="client-satisfaction"]')).toContainText(/\d+/);
      });
    });
  });

  test.describe('Batch Matching and Optimization', () => {
    test('should handle bulk project-employee matching', async ({ page }) => {
      // Navigate to bulk matching
      await page.click('[data-testid="bulk-matching-tab"]');
      await expect(page.locator('h2')).toContainText('Bulk Project Matching');

      // Select multiple projects for bulk matching
      await page.click('[data-testid="select-projects-for-bulk"]');
      await page.check('[data-testid="project-checkbox-1"]');
      await page.check('[data-testid="project-checkbox-2"]');
      await page.check('[data-testid="project-checkbox-3"]');
      await page.check('[data-testid="project-checkbox-4"]');
      await page.click('[data-testid="confirm-project-selection"]');

      // Configure bulk matching options
      await page.fill('[data-testid="max-results-per-role"]', '5');
      await page.check('[data-testid="optimize-across-projects"]');
      await page.check('[data-testid="avoid-overallocation"]');
      await page.selectOption('[data-testid="optimization-strategy"]', 'balanced');

      // Set constraints
      await page.fill('[data-testid="max-utilization-per-employee"]', '100');
      await page.fill('[data-testid="min-skill-match-threshold"]', '70');

      // Run bulk matching
      await page.click('[data-testid="run-bulk-matching"]');
      
      // Wait for bulk processing (should take longer)
      await expect(page.locator('[data-testid="bulk-matching-loading"]')).toBeVisible();
      await expect(page.locator('[data-testid="bulk-matching-progress"]')).toBeVisible();
      await expect(page.locator('[data-testid="bulk-matching-loading"]')).not.toBeVisible({ timeout: 60000 });

      // Validate bulk matching results
      await expect(page.locator('[data-testid="bulk-matching-results"]')).toBeVisible();
      
      // Check results for each project
      const projectResults = page.locator('[data-testid="project-matching-result"]');
      await expect(projectResults).toHaveCount(4); // Should have results for all 4 projects

      // Validate allocation optimization
      await expect(page.locator('[data-testid="allocation-optimization-summary"]')).toBeVisible();
      await expect(page.locator('[data-testid="total-employees-allocated"]')).toContainText(/\d+/);
      await expect(page.locator('[data-testid="average-utilization"]')).toContainText(/\d+%/);
      await expect(page.locator('[data-testid="allocation-conflicts"]')).toContainText(/\d+/);

      // Check optimization recommendations
      await expect(page.locator('[data-testid="optimization-recommendations"]')).toBeVisible();
      const recommendations = page.locator('[data-testid="optimization-recommendation"]');
      
      recommendations.forEach(async (recommendation) => {
        await expect(recommendation.locator('[data-testid="recommendation-type"]')).toContainText(/(reallocation|hiring|training|process_improvement)/);
        await expect(recommendation.locator('[data-testid="recommendation-priority"]')).toContainText(/(low|medium|high|critical)/);
        await expect(recommendation.locator('[data-testid="recommendation-description"]')).not.toBeEmpty();
      });

      // Check conflict resolution suggestions
      if (await page.locator('[data-testid="allocation-conflicts"]').textContent() !== '0') {
        await expect(page.locator('[data-testid="conflict-resolution-suggestions"]')).toBeVisible();
        const conflictResolutions = page.locator('[data-testid="conflict-resolution"]');
        
        conflictResolutions.forEach(async (resolution) => {
          await expect(resolution.locator('[data-testid="conflict-type"]')).not.toBeEmpty();
          await expect(resolution.locator('[data-testid="resolution-action"]')).not.toBeEmpty();
          await expect(resolution.locator('[data-testid="resolution-impact"]')).toContainText(/\d+/);
        });
      }
    });

    test('should export matching results and analysis reports', async ({ page }) => {
      // First generate some matching results
      await page.click('[data-testid="project-role-matching-tab"]');
      await page.selectOption('[data-testid="project-dropdown"]', '1');
      
      // Quick setup and run
      await page.click('[data-testid="add-role-requirement"]');
      await page.fill('[data-testid="role-name-0"]', 'Test Role');
      await page.click('[data-testid="add-required-skill-0"]');
      await page.selectOption('[data-testid="skill-select-0-0"]', 'JavaScript');
      
      await page.click('[data-testid="run-skill-matching"]');
      await expect(page.locator('[data-testid="matching-loading"]')).not.toBeVisible({ timeout: 30000 });

      // Test CSV export
      const [csvDownload] = await Promise.all([
        page.waitForEvent('download'),
        page.click('[data-testid="export-matching-csv"]')
      ]);
      
      expect(csvDownload.suggestedFilename()).toMatch(/skill.*matching.*\.csv$/);
      await csvDownload.saveAs(`./test-results/${csvDownload.suggestedFilename()}`);

      // Test detailed report export
      const [reportDownload] = await Promise.all([
        page.waitForEvent('download'),
        page.click('[data-testid="export-matching-report"]')
      ]);
      
      expect(reportDownload.suggestedFilename()).toMatch(/skill.*matching.*report\.pdf$/);
      await reportDownload.saveAs(`./test-results/${reportDownload.suggestedFilename()}`);

      // Test Excel export with detailed analysis
      const [excelDownload] = await Promise.all([
        page.waitForEvent('download'),
        page.click('[data-testid="export-matching-excel"]')
      ]);
      
      expect(excelDownload.suggestedFilename()).toMatch(/skill.*matching.*analysis\.xlsx$/);
      await excelDownload.saveAs(`./test-results/${excelDownload.suggestedFilename()}`);

      // Validate export options are available and functional
      await expect(page.locator('[data-testid="export-options"]')).toBeVisible();
      await expect(page.locator('[data-testid="export-matching-csv"]')).toBeEnabled();
      await expect(page.locator('[data-testid="export-matching-report"]')).toBeEnabled();
      await expect(page.locator('[data-testid="export-matching-excel"]')).toBeEnabled();
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle no matching candidates gracefully', async ({ page }) => {
      // Set up impossible requirements
      await page.click('[data-testid="project-role-matching-tab"]');
      await page.selectOption('[data-testid="project-dropdown"]', '1');
      
      await page.click('[data-testid="add-role-requirement"]');
      await page.fill('[data-testid="role-name-0"]', 'Impossible Role');
      await page.selectOption('[data-testid="experience-level-0"]', 'expert');
      
      // Add skill requirements that likely won't be met
      await page.click('[data-testid="add-required-skill-0"]');
      await page.selectOption('[data-testid="skill-select-0-0"]', 'Machine Learning');
      await page.selectOption('[data-testid="minimum-level-0-0"]', 'expert');
      await page.check('[data-testid="skill-mandatory-0-0"]');

      // Set very high skill match threshold
      await page.fill('[data-testid="min-skill-match"]', '95');

      await page.click('[data-testid="run-skill-matching"]');
      await expect(page.locator('[data-testid="matching-loading"]')).not.toBeVisible({ timeout: 30000 });

      // Should handle no matches gracefully
      await expect(page.locator('[data-testid="no-matches-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="no-matches-message"]')).toContainText(/no suitable candidates found/i);

      // Should provide suggestions for improving matches
      await expect(page.locator('[data-testid="matching-improvement-suggestions"]')).toBeVisible();
      const suggestions = page.locator('[data-testid="improvement-suggestion"]');
      await expect(suggestions).toHaveCountGreaterThan(0);

      suggestions.forEach(async (suggestion) => {
        await expect(suggestion).not.toBeEmpty();
      });

      // Should suggest adjusting criteria
      await expect(page.locator('[data-testid="adjust-criteria-suggestion"]')).toBeVisible();
      await expect(page.locator('[data-testid="consider-training-suggestion"]')).toBeVisible();
    });

    test('should handle API failures and network issues', async ({ page }) => {
      // Mock API failure
      await page.route('**/api/skill-matching/**', async route => {
        await route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Skill matching service unavailable' })
        });
      });

      await page.click('[data-testid="project-role-matching-tab"]');
      await page.selectOption('[data-testid="project-dropdown"]', '1');
      
      await page.click('[data-testid="add-role-requirement"]');
      await page.click('[data-testid="add-required-skill-0"]');
      await page.selectOption('[data-testid="skill-select-0-0"]', 'JavaScript');

      await page.click('[data-testid="run-skill-matching"]');

      // Should show error message
      await expect(page.locator('[data-testid="matching-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="matching-error"]')).toContainText(/skill matching service unavailable|failed to find matches/i);

      // Should show retry option
      await expect(page.locator('[data-testid="retry-matching"]')).toBeVisible();
      await expect(page.locator('[data-testid="retry-matching"]')).toBeEnabled();

      // Should provide fallback options
      await expect(page.locator('[data-testid="fallback-options"]')).toBeVisible();
      await expect(page.locator('[data-testid="manual-search-option"]')).toBeVisible();
    });

    test('should validate input requirements before matching', async ({ page }) => {
      await page.click('[data-testid="project-role-matching-tab"]');
      
      // Try to run matching without selecting project
      await page.click('[data-testid="run-skill-matching"]');
      
      // Should show validation error
      await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="validation-error"]')).toContainText(/please select a project/i);

      // Select project but don't add role requirements
      await page.selectOption('[data-testid="project-dropdown"]', '1');
      await page.click('[data-testid="run-skill-matching"]');

      // Should show role requirements validation
      await expect(page.locator('[data-testid="validation-error"]')).toContainText(/please add at least one role requirement/i);

      // Add role but no required skills
      await page.click('[data-testid="add-role-requirement"]');
      await page.fill('[data-testid="role-name-0"]', 'Test Role');
      await page.click('[data-testid="run-skill-matching"]');

      // Should show skills validation
      await expect(page.locator('[data-testid="validation-error"]')).toContainText(/please add at least one required skill/i);

      // Test invalid weight values
      await page.click('[data-testid="add-required-skill-0"]');
      await page.selectOption('[data-testid="skill-select-0-0"]', 'JavaScript');
      await page.fill('[data-testid="skill-weight-0-0"]', '150'); // Invalid weight > 100
      
      await page.click('[data-testid="run-skill-matching"]');
      await expect(page.locator('[data-testid="validation-error"]')).toContainText(/skill weight must be between 0 and 100/i);
    });
  });
});

// Helper function
async function loginIfNeeded(page: Page): Promise<void> {
  const isLoggedIn = await page.locator('[data-testid="user-profile"]').isVisible();
  
  if (!isLoggedIn) {
    const loginButton = page.locator('[data-testid="login-button"]');
    if (await loginButton.isVisible()) {
      await loginButton.click();
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'testpassword');
      await page.click('[data-testid="submit-login"]');
      await expect(page.locator('[data-testid="user-profile"]')).toBeVisible();
    }
  }
}