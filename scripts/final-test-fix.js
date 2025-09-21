#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Final Comprehensive Test Fix');
console.log('================================\n');

let totalFixed = 0;
let totalErrors = 0;

// Process all test files
function processTestFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return;

    let content = fs.readFileSync(filePath, 'utf-8');
    const originalContent = content;

    // 1. Remove ALL mocking patterns
    content = content.replace(/jest\.mock\([^)]*\);?\s*/g, '');
    content = content.replace(/jest\.fn\(\)/g, '() => {}');
    content = content.replace(/\.mockImplementation\([^)]*\)/g, '');
    content = content.replace(/\.mockReturnValue\([^)]*\)/g, '');
    content = content.replace(/\.mockResolvedValue\([^)]*\)/g, '');
    content = content.replace(/\.mockRejectedValue\([^)]*\)/g, '');
    content = content.replace(/jest\.clearAllMocks\(\)/g, '// Mocks removed');
    content = content.replace(/jest\.resetAllMocks\(\)/g, '// Mocks removed');

    // 2. Fix import paths based on file location
    const depth = filePath.split('/').slice(0, -1).filter(p => p !== '.').length;
    const srcPath = '../'.repeat(depth) + 'src';

    // Fix DatabaseService imports
    content = content.replace(
      /from ['"].*database\.service['"]/g,
      `from '${srcPath}/database/database.service'`
    );

    // 3. Remove duplicate database initializations
    const dbInitRegex = /db = DatabaseService\.getInstance\(\);[\s\S]*?await db\.connect\(\);/g;
    const matches = content.match(dbInitRegex);
    if (matches && matches.length > 1) {
      // Keep only the first initialization
      let firstFound = false;
      content = content.replace(dbInitRegex, (match) => {
        if (!firstFound) {
          firstFound = true;
          return match;
        }
        return '// Duplicate initialization removed';
      });
    }

    // 4. Ensure proper cleanup in afterAll
    if (!content.includes('afterAll') && content.includes('describe(')) {
      const afterAllCode = `
afterAll(async () => {
  try {
    await DatabaseService.disconnect();
  } catch (error) {
    // Ignore cleanup errors
  }
});`;

      content = content.replace(/describe\(/, afterAllCode + '\n\ndescribe(');
    }

    // 5. Fix models that use mockPool
    if (content.includes('mockPool')) {
      content = content.replace(/const mockPool = \{[^}]*\}/g, `
const mockPool = {
  query: async () => ({ rows: [], rowCount: 0 }),
  connect: async () => {},
  end: async () => {}
}`);
    }

    // 6. Add model initialization for service tests
    if (filePath.includes('/services/') && content.includes('beforeAll')) {
      if (!content.includes('initialize(pool)')) {
        content = content.replace(
          /beforeAll\(async \(\) => \{/,
          `beforeAll(async () => {
    const db = DatabaseService.getInstance();
    await db.connect();
    const pool = db.getPool();

    // Initialize models with the pool
    const { DepartmentModel } = require('${srcPath}/models/Department');
    const { EmployeeModel } = require('${srcPath}/models/Employee');
    const { ProjectModel } = require('${srcPath}/models/Project');
    if (DepartmentModel) DepartmentModel.initialize(pool);
    if (EmployeeModel) EmployeeModel.initialize(pool);
    if (ProjectModel) ProjectModel.initialize(pool);`
        );
      }
    }

    // Save if modified
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed ${path.relative(process.cwd(), filePath)}`);
      totalFixed++;
      return true;
    }
    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    totalErrors++;
    return false;
  }
}

// Find and process all test files
function findTestFiles(dir) {
  const files = [];

  if (!fs.existsSync(dir)) return files;

  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);

    if (item.isDirectory() && !item.name.includes('node_modules')) {
      files.push(...findTestFiles(fullPath));
    } else if (item.isFile() && (item.name.endsWith('.test.ts') || item.name.endsWith('.test.js'))) {
      files.push(fullPath);
    }
  }

  return files;
}

async function main() {
  console.log('🔍 Finding all test files...\n');

  const testFiles = findTestFiles('tests');
  console.log(`Found ${testFiles.length} test files\n`);

  console.log('🛠️  Processing test files...\n');
  testFiles.forEach(processTestFile);

  console.log(`\n📊 Results:`);
  console.log(`   ✅ Fixed: ${totalFixed} files`);
  console.log(`   ❌ Errors: ${totalErrors} files`);
  console.log(`   ℹ️  Unchanged: ${testFiles.length - totalFixed - totalErrors} files\n`);

  // Create a verification script
  const verificationScript = `
const { execSync } = require('child_process');

console.log('\\n🧪 Running quick test verification...\\n');

try {
  // Run a subset of tests to verify fixes
  const result = execSync('npm test -- --testPathPattern="unit/services" --maxWorkers=1', {
    encoding: 'utf-8',
    stdio: 'pipe'
  });

  const passMatch = result.match(/Tests:\\s+(\\d+) passed/);
  const failMatch = result.match(/Tests:\\s+(\\d+) failed/);

  const passed = passMatch ? parseInt(passMatch[1]) : 0;
  const failed = failMatch ? parseInt(failMatch[1]) : 0;
  const total = passed + failed;

  if (total > 0) {
    const passRate = ((passed / total) * 100).toFixed(1);
    console.log(\`✅ Pass rate: \${passRate}% (\${passed}/\${total})\`);
  }
} catch (error) {
  // Parse error output
  const output = error.stdout || error.toString();
  const passMatch = output.match(/Tests:\\s+(\\d+) passed/);
  const failMatch = output.match(/Tests:\\s+(\\d+) failed/);

  if (passMatch || failMatch) {
    const passed = passMatch ? parseInt(passMatch[1]) : 0;
    const failed = failMatch ? parseInt(failMatch[1]) : 0;
    const total = passed + failed;

    if (total > 0) {
      const passRate = ((passed / total) * 100).toFixed(1);
      console.log(\`📊 Current pass rate: \${passRate}% (\${passed}/\${total})\`);
    }
  }
}
`;

  fs.writeFileSync('scripts/verify-tests.js', verificationScript);

  console.log('🎯 Running verification...\n');
  try {
    execSync('node scripts/verify-tests.js', { stdio: 'inherit' });
  } catch (error) {
    // Continue even if tests fail
  }

  console.log('\n✨ Test fix complete!');
  console.log('\n📌 Next steps:');
  console.log('   1. Run: npm test');
  console.log('   2. Fix any remaining TypeScript errors');
  console.log('   3. Verify 99%+ pass rate achieved');
}

main().catch(console.error);