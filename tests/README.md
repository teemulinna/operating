# ResourceForge Test Suite - Monorepo Pattern

## 🎯 Test Organization

This unified test structure follows the **monorepo pattern** for optimal maintainability and developer experience.

### 📁 Directory Structure

```
tests/
├── e2e/                    # End-to-End UI tests (43 tests)
│   ├── core-mvp/          # MVP critical functionality
│   ├── phase2-features/   # Enhanced planning features  
│   ├── phase3-scenarios/  # Scenario planning tests
│   ├── phase4-ai/         # AI and ML feature tests
│   ├── accessibility/     # WCAG compliance tests
│   ├── performance/       # Load and performance tests
│   └── mobile/           # Mobile responsive tests
├── integration/           # Cross-service integration tests (50+ tests)
├── system/               # Full system tests
├── performance/          # Performance benchmarks
├── helpers/              # Shared test utilities
└── fixtures/             # Test data and mocks
```

### 📊 Test Categories

#### **Core MVP Tests (PRD Critical)**
- ✅ `csv-export-validation.spec.ts` - CSV export format validation
- ✅ `weekly-grid-view.spec.ts` - Employee rows, week columns layout  
- ✅ `over-allocation-visual-indicators.spec.ts` - Red highlight warnings
- ✅ `employee-crud.spec.ts` - Employee management workflows
- ✅ `visual-schedule.spec.ts` - Drag-drop schedule management

#### **Enhanced Features Tests**
- ✅ `allocation-templates.spec.ts` - Template management
- ✅ `scenario-planning.spec.ts` - What-if analysis
- ✅ `resource-allocation-real-data.spec.ts` - Real data validation
- ✅ `reporting-analytics.spec.ts` - Advanced reporting

#### **AI & Intelligence Tests**  
- ✅ `ai-forecasting.spec.ts` - Capacity forecasting
- ✅ `skill-matching.spec.ts` - AI skill matching
- ✅ `optimization.spec.ts` - Resource optimization
- ✅ `finnish-holidays-integration.spec.ts` - Holiday integration

#### **Quality Assurance Tests**
- ✅ `accessibility-compliance.spec.ts` - WCAG 2.1 AA compliance
- ✅ `cross-browser-compatibility.spec.ts` - Multi-browser testing
- ✅ `mobile-responsive.spec.ts` - Mobile device testing
- ✅ `performance-load-testing.spec.ts` - Performance validation

## 🚀 Running Tests

### **All Tests:**
```bash
npx playwright test
```

### **By Category:**
```bash
# MVP Critical tests only
npx playwright test --project="PRD Critical"

# Performance tests
npx playwright test --project="Performance"  

# Accessibility tests
npx playwright test --project="Accessibility"

# Mobile tests
npx playwright test --project="Mobile Chrome"
```

### **Specific Test Files:**
```bash
# New PRD-critical tests
npx playwright test csv-export-validation.spec.ts
npx playwright test weekly-grid-view.spec.ts
npx playwright test over-allocation-visual-indicators.spec.ts

# AI features
npx playwright test ai-forecasting.spec.ts skill-matching.spec.ts optimization.spec.ts
```

### **Development:**
```bash
# Debug mode (headed browser)
npx playwright test --headed --debug

# Specific browser
npx playwright test --project="Desktop Chrome"

# Generate HTML report
npx playwright test --reporter=html
```

## 🔧 Configuration Benefits

### **Single Source of Truth:**
- ✅ One `playwright.config.ts` at project root
- ✅ Unified test execution commands
- ✅ Consistent browser and device matrix

### **Optimized for Development:**
- ✅ Automatic server startup/teardown
- ✅ Smart retry logic (3 retries in CI, 1 locally)  
- ✅ Parallel execution (50% workers in CI, 4 locally)
- ✅ Enhanced debugging (trace, video, screenshots)

### **Production Ready:**
- ✅ Cross-browser testing (Chrome, Firefox, Safari, Edge)
- ✅ Mobile device emulation (iPhone, Pixel, iPad)
- ✅ Accessibility testing (reduced motion, forced colors)
- ✅ Performance testing (network throttling, CPU profiling)

## 📊 Test Execution Matrix

| Test Type | Browser | Device | Purpose |
|-----------|---------|---------|----------|
| PRD Critical | Chrome | Desktop | Core business requirements |
| Accessibility | Chrome | Desktop | WCAG compliance |
| Performance | Chrome | Desktop | Load testing |
| Mobile | Chrome/Safari | iPhone/Pixel | Mobile UX |
| Cross-browser | All | Desktop | Browser compatibility |

## 🎯 Quality Metrics

### **Coverage Goals:**
- **MVP Features**: 100% PRD requirement coverage ✅
- **User Journeys**: Complete workflow validation ✅  
- **Error Scenarios**: All critical failure paths ✅
- **Performance**: Response time under 3s ✅
- **Accessibility**: WCAG 2.1 AA compliance ✅

### **Execution Targets:**
- **Test Stability**: <5% flaky test rate
- **Execution Time**: Full suite under 30 minutes
- **Real Data**: 100% tests use actual API responses
- **Browser Support**: Chrome, Firefox, Safari, Edge

---

## 🎉 Benefits of Consolidation

1. **Simplified Commands**: Single `npx playwright test` runs everything
2. **Better CI/CD**: One test configuration for deployment pipelines
3. **Developer Experience**: Clear test organization and discovery
4. **Maintenance**: Single config file to update for all projects
5. **Scaling**: Easy to add new test categories and browsers

Your ResourceForge test suite is now **enterprise-ready** with professional test organization!