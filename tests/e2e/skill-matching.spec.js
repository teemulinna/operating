"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
test_1.test.describe('AI Skill Matching Features', () => {
    test_1.test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await loginIfNeeded(page);
        await page.click('[data-testid="navigation-skill-matching"]');
        await (0, test_1.expect)(page).toHaveURL(/.*skill-matching/);
    });
    test_1.test.describe('Employee-Project Matching Workflow', () => {
        (0, test_1.test)('should find skilled employees for project roles using AI matching', async ({ page }) => {
            await page.click('[data-testid="project-role-matching-tab"]');
            await (0, test_1.expect)(page.locator('h1')).toContainText('AI-Powered Skill Matching');
            await page.click('[data-testid="select-project"]');
            await page.selectOption('[data-testid="project-dropdown"]', '1');
            await page.click('[data-testid="add-role-requirement"]');
            await page.fill('[data-testid="role-name-0"]', 'Senior Frontend Developer');
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
            await page.selectOption('[data-testid="experience-level-0"]', 'senior');
            await page.fill('[data-testid="project-duration-0"]', '12');
            await page.fill('[data-testid="start-date-0"]', '2024-01-01');
            await page.fill('[data-testid="end-date-0"]', '2024-12-31');
            await page.fill('[data-testid="max-results"]', '10');
            await page.check('[data-testid="include-partial-matches"]');
            await page.uncheck('[data-testid="consider-training"]');
            await page.fill('[data-testid="team-fit-weight"]', '10');
            await page.click('[data-testid="run-skill-matching"]');
            await (0, test_1.expect)(page.locator('[data-testid="matching-loading"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="matching-loading"]')).not.toBeVisible({ timeout: 30000 });
            await (0, test_1.expect)(page.locator('[data-testid="matching-results"]')).toBeVisible();
            const matchResultCards = page.locator('[data-testid="match-result-card"]');
            await (0, test_1.expect)(matchResultCards).toHaveCountGreaterThan(0);
            await (0, test_1.expect)(matchResultCards).toHaveCountLessThanOrEqual(10);
            const firstMatch = matchResultCards.first();
            await (0, test_1.expect)(firstMatch.locator('[data-testid="employee-name"]')).not.toBeEmpty();
            await (0, test_1.expect)(firstMatch.locator('[data-testid="employee-email"]')).toContainText(/@/);
            await (0, test_1.expect)(firstMatch.locator('[data-testid="employee-department"]')).not.toBeEmpty();
            await (0, test_1.expect)(firstMatch.locator('[data-testid="employee-position"]')).not.toBeEmpty();
            const matchScore = await firstMatch.locator('[data-testid="overall-match-score"]').textContent();
            (0, test_1.expect)(parseInt(matchScore || '0')).toBeGreaterThan(70);
            (0, test_1.expect)(parseInt(matchScore || '100')).toBeLessThanOrEqual(100);
            const confidenceLevel = await firstMatch.locator('[data-testid="confidence-level"]').textContent();
            (0, test_1.expect)(parseInt(confidenceLevel || '0')).toBeGreaterThan(0);
            (0, test_1.expect)(parseInt(confidenceLevel || '100')).toBeLessThanOrEqual(100);
            await firstMatch.locator('[data-testid="expand-match-details"]').click();
            await (0, test_1.expect)(firstMatch.locator('[data-testid="skill-breakdown"]')).toBeVisible();
            await (0, test_1.expect)(firstMatch.locator('[data-testid="required-skills-section"]')).toBeVisible();
            const requiredSkillRows = firstMatch.locator('[data-testid="required-skill-row"]');
            await (0, test_1.expect)(requiredSkillRows).toHaveCountGreaterThan(0);
            const jsSkillRow = requiredSkillRows.filter({ hasText: 'JavaScript' }).first();
            await (0, test_1.expect)(jsSkillRow.locator('[data-testid="skill-match-score"]')).toContainText(/\d+/);
            await (0, test_1.expect)(jsSkillRow.locator('[data-testid="employee-skill-level"]')).toContainText(/(beginner|intermediate|advanced|expert)/);
            await (0, test_1.expect)(jsSkillRow.locator('[data-testid="required-skill-level"]')).toContainText('intermediate');
            await (0, test_1.expect)(firstMatch.locator('[data-testid="experience-alignment"]')).toBeVisible();
            await (0, test_1.expect)(firstMatch.locator('[data-testid="total-experience"]')).toContainText(/\d+ years?/);
            await (0, test_1.expect)(firstMatch.locator('[data-testid="relevant-experience"]')).toContainText(/\d+ years?/);
            await (0, test_1.expect)(firstMatch.locator('[data-testid="experience-score"]')).toContainText(/\d+/);
            await (0, test_1.expect)(firstMatch.locator('[data-testid="availability-metrics"]')).toBeVisible();
            await (0, test_1.expect)(firstMatch.locator('[data-testid="current-utilization"]')).toContainText(/\d+%/);
            await (0, test_1.expect)(firstMatch.locator('[data-testid="capacity-score"]')).toContainText(/\d+/);
            await (0, test_1.expect)(firstMatch.locator('[data-testid="risk-assessment"]')).toBeVisible();
            await (0, test_1.expect)(firstMatch.locator('[data-testid="overall-risk"]')).toContainText(/(low|medium|high)/);
            const riskFactors = firstMatch.locator('[data-testid="risk-factor"]');
            riskFactors.forEach(async (factor) => {
                await (0, test_1.expect)(factor.locator('[data-testid="risk-type"]')).toContainText(/(availability|skill_gap|overqualification|experience|workload)/);
                await (0, test_1.expect)(factor.locator('[data-testid="risk-severity"]')).toContainText(/(low|medium|high)/);
                await (0, test_1.expect)(factor.locator('[data-testid="risk-description"]')).not.toBeEmpty();
            });
            await (0, test_1.expect)(firstMatch.locator('[data-testid="performance-prediction"]')).toBeVisible();
            const predictedScore = await firstMatch.locator('[data-testid="predicted-performance-score"]').textContent();
            (0, test_1.expect)(parseInt(predictedScore || '0')).toBeGreaterThan(50);
            (0, test_1.expect)(parseInt(predictedScore || '100')).toBeLessThanOrEqual(100);
            await (0, test_1.expect)(firstMatch.locator('[data-testid="confidence-bounds"]')).toContainText(/\d+ - \d+/);
            const keyFactors = firstMatch.locator('[data-testid="key-prediction-factor"]');
            await (0, test_1.expect)(keyFactors).toHaveCountGreaterThan(0);
        });
        (0, test_1.test)('should handle complex multi-skill project requirements', async ({ page }) => {
            await page.click('[data-testid="advanced-matching-tab"]');
            await (0, test_1.expect)(page.locator('h2')).toContainText('Advanced Multi-Skill Matching');
            await page.click('[data-testid="create-complex-project"]');
            await page.fill('[data-testid="project-name"]', 'AI Data Platform Development');
            await page.fill('[data-testid="project-description"]', 'Complex ML platform with cloud deployment');
            await page.click('[data-testid="add-project-role"]');
            await page.fill('[data-testid="role-name-0"]', 'ML Engineer');
            await page.selectOption('[data-testid="role-experience-0"]', 'expert');
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
            await page.fill('[data-testid="weight-0-2', ', ', 70, ');, await page.click('[data-testid="add-project-role"]'));
            await page.fill('[data-testid="role-name-1"]', 'DevOps Engineer');
            await page.selectOption('[data-testid="role-experience-1"]', 'senior');
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
            await page.click('[data-testid="team-dynamics-section"]');
            await page.check('[data-testid="cultural-fit-required"]');
            await page.check('[data-testid="leadership-needed"]');
            await page.fill('[data-testid="existing-team-skills"]', 'Python, TensorFlow, Docker');
            await page.fill('[data-testid="budget-min"]', '150000');
            await page.fill('[data-testid="budget-max"]', '250000');
            await page.fill('[data-testid="project-timeline"]', '18');
            await page.click('[data-testid="run-advanced-matching"]');
            await (0, test_1.expect)(page.locator('[data-testid="advanced-matching-loading"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="advanced-matching-loading"]')).not.toBeVisible({ timeout: 45000 });
            await (0, test_1.expect)(page.locator('[data-testid="role-matching-results"]')).toBeVisible();
            const mlEngineerSection = page.locator('[data-testid="ml-engineer-matches"]');
            await (0, test_1.expect)(mlEngineerSection).toBeVisible();
            const mlMatches = mlEngineerSection.locator('[data-testid="role-match-card"]');
            await (0, test_1.expect)(mlMatches).toHaveCountGreaterThan(0);
            const topMLMatch = mlMatches.first();
            await topMLMatch.locator('[data-testid="expand-details"]').click();
            const mlSkillRow = topMLMatch.locator('[data-testid="required-skill-row"]').filter({ hasText: 'Machine Learning' });
            const mlSkillScore = await mlSkillRow.locator('[data-testid="skill-match-score"]').textContent();
            (0, test_1.expect)(parseInt(mlSkillScore || '0')).toBeGreaterThan(80);
            const devopsSection = page.locator('[data-testid="devops-engineer-matches"]');
            await (0, test_1.expect)(devopsSection).toBeVisible();
            const devopsMatches = devopsSection.locator('[data-testid="role-match-card"]');
            await (0, test_1.expect)(devopsMatches).toHaveCountGreaterThan(0);
            await (0, test_1.expect)(page.locator('[data-testid="team-composition-suggestions"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="optimal-team-size"]')).toContainText(/\d+/);
            await (0, test_1.expect)(page.locator('[data-testid="estimated-project-cost"]')).toContainText(/\$[\d,]+/);
            await (0, test_1.expect)(page.locator('[data-testid="skill-coverage-analysis"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="skill-gap-analysis"]')).toBeVisible();
            const skillGaps = page.locator('[data-testid="skill-gap-item"]');
            skillGaps.forEach(async (gap) => {
                await (0, test_1.expect)(gap.locator('[data-testid="gap-skill-name"]')).not.toBeEmpty();
                await (0, test_1.expect)(gap.locator('[data-testid="gap-severity"]')).toContainText(/(minor|moderate|major|critical)/);
                await (0, test_1.expect)(gap.locator('[data-testid="gap-recommendations"]')).not.toBeEmpty();
            });
        });
        (0, test_1.test)('should calculate skill similarity between candidates', async ({ page }) => {
            await page.click('[data-testid="skill-similarity-tab"]');
            await (0, test_1.expect)(page.locator('h2')).toContainText('Skill Similarity Analysis');
            await page.click('[data-testid="select-employee-set-1"]');
            await page.check('[data-testid="employee-checkbox-alice"]');
            await page.check('[data-testid="employee-checkbox-bob"]');
            await page.check('[data-testid="employee-checkbox-carol"]');
            await page.click('[data-testid="confirm-employee-set-1"]');
            await page.click('[data-testid="select-employee-set-2"]');
            await page.check('[data-testid="employee-checkbox-david"]');
            await page.check('[data-testid="employee-checkbox-eva"]');
            await page.check('[data-testid="employee-checkbox-frank"]');
            await page.click('[data-testid="confirm-employee-set-2"]');
            await page.fill('[data-testid="context-weight"]', '30');
            await page.check('[data-testid="include-semantic-similarity"]');
            await page.check('[data-testid="consider-experience-weights"]');
            await page.click('[data-testid="calculate-similarity"]');
            await (0, test_1.expect)(page.locator('[data-testid="similarity-loading"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="similarity-loading"]')).not.toBeVisible({ timeout: 15000 });
            await (0, test_1.expect)(page.locator('[data-testid="similarity-results"]')).toBeVisible();
            const cosineSimilarity = await page.locator('[data-testid="cosine-similarity"]').textContent();
            (0, test_1.expect)(parseFloat(cosineSimilarity || '0')).toBeGreaterThanOrEqual(0);
            (0, test_1.expect)(parseFloat(cosineSimilarity || '1')).toBeLessThanOrEqual(1);
            const jaccardIndex = await page.locator('[data-testid="jaccard-index"]').textContent();
            (0, test_1.expect)(parseFloat(jaccardIndex || '0')).toBeGreaterThanOrEqual(0);
            (0, test_1.expect)(parseFloat(jaccardIndex || '1')).toBeLessThanOrEqual(1);
            const semanticSimilarity = await page.locator('[data-testid="semantic-similarity"]').textContent();
            (0, test_1.expect)(parseFloat(semanticSimilarity || '0')).toBeGreaterThanOrEqual(0);
            (0, test_1.expect)(parseFloat(semanticSimilarity || '1')).toBeLessThanOrEqual(1);
            const overallSimilarity = await page.locator('[data-testid="overall-similarity"]').textContent();
            (0, test_1.expect)(parseFloat(overallSimilarity || '0')).toBeGreaterThanOrEqual(0);
            (0, test_1.expect)(parseFloat(overallSimilarity || '1')).toBeLessThanOrEqual(1);
            await (0, test_1.expect)(page.locator('[data-testid="similarity-chart"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="skill-overlap-diagram"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="similarity-breakdown"]')).toBeVisible();
            const commonSkills = page.locator('[data-testid="common-skill"]');
            const uniqueSkills1 = page.locator('[data-testid="unique-skill-set-1"]');
            const uniqueSkills2 = page.locator('[data-testid="unique-skill-set-2"]');
            await (0, test_1.expect)(commonSkills).toHaveCountGreaterThanOrEqual(0);
            await (0, test_1.expect)(uniqueSkills1).toHaveCountGreaterThanOrEqual(0);
            await (0, test_1.expect)(uniqueSkills2).toHaveCountGreaterThanOrEqual(0);
        });
        (0, test_1.test)('should provide performance prediction for matched candidates', async ({ page }) => {
            await page.click('[data-testid="project-role-matching-tab"]');
            await page.selectOption('[data-testid="project-dropdown"]', '2');
            await page.click('[data-testid="add-role-requirement"]');
            await page.fill('[data-testid="role-name-0"]', 'Full Stack Developer');
            await page.selectOption('[data-testid="experience-level-0"]', 'senior');
            await page.click('[data-testid="add-required-skill-0"]');
            await page.selectOption('[data-testid="skill-select-0-0"]', 'JavaScript');
            await page.selectOption('[data-testid="minimum-level-0-0"]', 'advanced');
            await page.click('[data-testid="run-skill-matching"]');
            await (0, test_1.expect)(page.locator('[data-testid="matching-loading"]')).not.toBeVisible({ timeout: 30000 });
            const firstMatch = page.locator('[data-testid="match-result-card"]').first();
            await firstMatch.locator('[data-testid="expand-match-details"]').click();
            await firstMatch.locator('[data-testid="predict-performance"]').click();
            await (0, test_1.expect)(page.locator('[data-testid="performance-prediction-loading"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="performance-prediction-loading"]')).not.toBeVisible({ timeout: 20000 });
            await (0, test_1.expect)(page.locator('[data-testid="performance-prediction-results"]')).toBeVisible();
            const predictedScore = await page.locator('[data-testid="predicted-performance-score"]').textContent();
            (0, test_1.expect)(parseInt(predictedScore || '0')).toBeGreaterThan(50);
            (0, test_1.expect)(parseInt(predictedScore || '100')).toBeLessThanOrEqual(100);
            await (0, test_1.expect)(page.locator('[data-testid="prediction-confidence-interval"]')).toContainText(/\d+ - \d+/);
            const confidenceBounds = await page.locator('[data-testid="prediction-confidence-interval"]').textContent();
            const bounds = confidenceBounds?.match(/(\d+) - (\d+)/);
            if (bounds) {
                (0, test_1.expect)(parseInt(bounds[1])).toBeLessThanOrEqual(parseInt(bounds[2]));
            }
            await (0, test_1.expect)(page.locator('[data-testid="key-predictors-section"]')).toBeVisible();
            const keyPredictors = page.locator('[data-testid="key-predictor"]');
            await (0, test_1.expect)(keyPredictors).toHaveCountGreaterThan(0);
            keyPredictors.forEach(async (predictor) => {
                await (0, test_1.expect)(predictor).not.toBeEmpty();
            });
            await (0, test_1.expect)(page.locator('[data-testid="prediction-risk-factors"]')).toBeVisible();
            const riskFactors = page.locator('[data-testid="prediction-risk-factor"]');
            riskFactors.forEach(async (factor) => {
                await (0, test_1.expect)(factor).not.toBeEmpty();
            });
            await (0, test_1.expect)(page.locator('[data-testid="historical-performance-basis"]')).toBeVisible();
            const historicalProjects = page.locator('[data-testid="historical-project"]');
            historicalProjects.forEach(async (project) => {
                await (0, test_1.expect)(project.locator('[data-testid="project-similarity"]')).toContainText(/\d+%/);
                await (0, test_1.expect)(project.locator('[data-testid="actual-performance"]')).toContainText(/\d+/);
                await (0, test_1.expect)(project.locator('[data-testid="client-satisfaction"]')).toContainText(/\d+/);
            });
        });
    });
    test_1.test.describe('Batch Matching and Optimization', () => {
        (0, test_1.test)('should handle bulk project-employee matching', async ({ page }) => {
            await page.click('[data-testid="bulk-matching-tab"]');
            await (0, test_1.expect)(page.locator('h2')).toContainText('Bulk Project Matching');
            await page.click('[data-testid="select-projects-for-bulk"]');
            await page.check('[data-testid="project-checkbox-1"]');
            await page.check('[data-testid="project-checkbox-2"]');
            await page.check('[data-testid="project-checkbox-3"]');
            await page.check('[data-testid="project-checkbox-4"]');
            await page.click('[data-testid="confirm-project-selection"]');
            await page.fill('[data-testid="max-results-per-role"]', '5');
            await page.check('[data-testid="optimize-across-projects"]');
            await page.check('[data-testid="avoid-overallocation"]');
            await page.selectOption('[data-testid="optimization-strategy"]', 'balanced');
            await page.fill('[data-testid="max-utilization-per-employee"]', '100');
            await page.fill('[data-testid="min-skill-match-threshold"]', '70');
            await page.click('[data-testid="run-bulk-matching"]');
            await (0, test_1.expect)(page.locator('[data-testid="bulk-matching-loading"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="bulk-matching-progress"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="bulk-matching-loading"]')).not.toBeVisible({ timeout: 60000 });
            await (0, test_1.expect)(page.locator('[data-testid="bulk-matching-results"]')).toBeVisible();
            const projectResults = page.locator('[data-testid="project-matching-result"]');
            await (0, test_1.expect)(projectResults).toHaveCount(4);
            await (0, test_1.expect)(page.locator('[data-testid="allocation-optimization-summary"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="total-employees-allocated"]')).toContainText(/\d+/);
            await (0, test_1.expect)(page.locator('[data-testid="average-utilization"]')).toContainText(/\d+%/);
            await (0, test_1.expect)(page.locator('[data-testid="allocation-conflicts"]')).toContainText(/\d+/);
            await (0, test_1.expect)(page.locator('[data-testid="optimization-recommendations"]')).toBeVisible();
            const recommendations = page.locator('[data-testid="optimization-recommendation"]');
            recommendations.forEach(async (recommendation) => {
                await (0, test_1.expect)(recommendation.locator('[data-testid="recommendation-type"]')).toContainText(/(reallocation|hiring|training|process_improvement)/);
                await (0, test_1.expect)(recommendation.locator('[data-testid="recommendation-priority"]')).toContainText(/(low|medium|high|critical)/);
                await (0, test_1.expect)(recommendation.locator('[data-testid="recommendation-description"]')).not.toBeEmpty();
            });
            if (await page.locator('[data-testid="allocation-conflicts"]').textContent() !== '0') {
                await (0, test_1.expect)(page.locator('[data-testid="conflict-resolution-suggestions"]')).toBeVisible();
                const conflictResolutions = page.locator('[data-testid="conflict-resolution"]');
                conflictResolutions.forEach(async (resolution) => {
                    await (0, test_1.expect)(resolution.locator('[data-testid="conflict-type"]')).not.toBeEmpty();
                    await (0, test_1.expect)(resolution.locator('[data-testid="resolution-action"]')).not.toBeEmpty();
                    await (0, test_1.expect)(resolution.locator('[data-testid="resolution-impact"]')).toContainText(/\d+/);
                });
            }
        });
        (0, test_1.test)('should export matching results and analysis reports', async ({ page }) => {
            await page.click('[data-testid="project-role-matching-tab"]');
            await page.selectOption('[data-testid="project-dropdown"]', '1');
            await page.click('[data-testid="add-role-requirement"]');
            await page.fill('[data-testid="role-name-0"]', 'Test Role');
            await page.click('[data-testid="add-required-skill-0"]');
            await page.selectOption('[data-testid="skill-select-0-0"]', 'JavaScript');
            await page.click('[data-testid="run-skill-matching"]');
            await (0, test_1.expect)(page.locator('[data-testid="matching-loading"]')).not.toBeVisible({ timeout: 30000 });
            const [csvDownload] = await Promise.all([
                page.waitForEvent('download'),
                page.click('[data-testid="export-matching-csv"]')
            ]);
            (0, test_1.expect)(csvDownload.suggestedFilename()).toMatch(/skill.*matching.*\.csv$/);
            await csvDownload.saveAs(`./test-results/${csvDownload.suggestedFilename()}`);
            const [reportDownload] = await Promise.all([
                page.waitForEvent('download'),
                page.click('[data-testid="export-matching-report"]')
            ]);
            (0, test_1.expect)(reportDownload.suggestedFilename()).toMatch(/skill.*matching.*report\.pdf$/);
            await reportDownload.saveAs(`./test-results/${reportDownload.suggestedFilename()}`);
            const [excelDownload] = await Promise.all([
                page.waitForEvent('download'),
                page.click('[data-testid="export-matching-excel"]')
            ]);
            (0, test_1.expect)(excelDownload.suggestedFilename()).toMatch(/skill.*matching.*analysis\.xlsx$/);
            await excelDownload.saveAs(`./test-results/${excelDownload.suggestedFilename()}`);
            await (0, test_1.expect)(page.locator('[data-testid="export-options"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="export-matching-csv"]')).toBeEnabled();
            await (0, test_1.expect)(page.locator('[data-testid="export-matching-report"]')).toBeEnabled();
            await (0, test_1.expect)(page.locator('[data-testid="export-matching-excel"]')).toBeEnabled();
        });
    });
    test_1.test.describe('Error Handling and Edge Cases', () => {
        (0, test_1.test)('should handle no matching candidates gracefully', async ({ page }) => {
            await page.click('[data-testid="project-role-matching-tab"]');
            await page.selectOption('[data-testid="project-dropdown"]', '1');
            await page.click('[data-testid="add-role-requirement"]');
            await page.fill('[data-testid="role-name-0"]', 'Impossible Role');
            await page.selectOption('[data-testid="experience-level-0"]', 'expert');
            await page.click('[data-testid="add-required-skill-0"]');
            await page.selectOption('[data-testid="skill-select-0-0"]', 'Machine Learning');
            await page.selectOption('[data-testid="minimum-level-0-0"]', 'expert');
            await page.check('[data-testid="skill-mandatory-0-0"]');
            await page.fill('[data-testid="min-skill-match"]', '95');
            await page.click('[data-testid="run-skill-matching"]');
            await (0, test_1.expect)(page.locator('[data-testid="matching-loading"]')).not.toBeVisible({ timeout: 30000 });
            await (0, test_1.expect)(page.locator('[data-testid="no-matches-message"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="no-matches-message"]')).toContainText(/no suitable candidates found/i);
            await (0, test_1.expect)(page.locator('[data-testid="matching-improvement-suggestions"]')).toBeVisible();
            const suggestions = page.locator('[data-testid="improvement-suggestion"]');
            await (0, test_1.expect)(suggestions).toHaveCountGreaterThan(0);
            suggestions.forEach(async (suggestion) => {
                await (0, test_1.expect)(suggestion).not.toBeEmpty();
            });
            await (0, test_1.expect)(page.locator('[data-testid="adjust-criteria-suggestion"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="consider-training-suggestion"]')).toBeVisible();
        });
        (0, test_1.test)('should handle API failures and network issues', async ({ page }) => {
            await page.route('**/api/skill-matching/**', async (route) => {
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
            await (0, test_1.expect)(page.locator('[data-testid="matching-error"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="matching-error"]')).toContainText(/skill matching service unavailable|failed to find matches/i);
            await (0, test_1.expect)(page.locator('[data-testid="retry-matching"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="retry-matching"]')).toBeEnabled();
            await (0, test_1.expect)(page.locator('[data-testid="fallback-options"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="manual-search-option"]')).toBeVisible();
        });
        (0, test_1.test)('should validate input requirements before matching', async ({ page }) => {
            await page.click('[data-testid="project-role-matching-tab"]');
            await page.click('[data-testid="run-skill-matching"]');
            await (0, test_1.expect)(page.locator('[data-testid="validation-error"]')).toBeVisible();
            await (0, test_1.expect)(page.locator('[data-testid="validation-error"]')).toContainText(/please select a project/i);
            await page.selectOption('[data-testid="project-dropdown"]', '1');
            await page.click('[data-testid="run-skill-matching"]');
            await (0, test_1.expect)(page.locator('[data-testid="validation-error"]')).toContainText(/please add at least one role requirement/i);
            await page.click('[data-testid="add-role-requirement"]');
            await page.fill('[data-testid="role-name-0"]', 'Test Role');
            await page.click('[data-testid="run-skill-matching"]');
            await (0, test_1.expect)(page.locator('[data-testid="validation-error"]')).toContainText(/please add at least one required skill/i);
            await page.click('[data-testid="add-required-skill-0"]');
            await page.selectOption('[data-testid="skill-select-0-0"]', 'JavaScript');
            await page.fill('[data-testid="skill-weight-0-0"]', '150');
            await page.click('[data-testid="run-skill-matching"]');
            await (0, test_1.expect)(page.locator('[data-testid="validation-error"]')).toContainText(/skill weight must be between 0 and 100/i);
        });
    });
});
async function loginIfNeeded(page) {
    const isLoggedIn = await page.locator('[data-testid="user-profile"]').isVisible();
    if (!isLoggedIn) {
        const loginButton = page.locator('[data-testid="login-button"]');
        if (await loginButton.isVisible()) {
            await loginButton.click();
            await page.fill('[data-testid="email-input"]', 'test@example.com');
            await page.fill('[data-testid="password-input"]', 'testpassword');
            await page.click('[data-testid="submit-login"]');
            await (0, test_1.expect)(page.locator('[data-testid="user-profile"]')).toBeVisible();
        }
    }
}
//# sourceMappingURL=skill-matching.spec.js.map