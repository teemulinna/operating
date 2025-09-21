
const { execSync } = require('child_process');

console.log('\n🧪 Running quick test verification...\n');

try {
  // Run a subset of tests to verify fixes
  const result = execSync('npm test -- --testPathPattern="unit/services" --maxWorkers=1', {
    encoding: 'utf-8',
    stdio: 'pipe'
  });

  const passMatch = result.match(/Tests:\s+(\d+) passed/);
  const failMatch = result.match(/Tests:\s+(\d+) failed/);

  const passed = passMatch ? parseInt(passMatch[1]) : 0;
  const failed = failMatch ? parseInt(failMatch[1]) : 0;
  const total = passed + failed;

  if (total > 0) {
    const passRate = ((passed / total) * 100).toFixed(1);
    console.log(`✅ Pass rate: ${passRate}% (${passed}/${total})`);
  }
} catch (error) {
  // Parse error output
  const output = error.stdout || error.toString();
  const passMatch = output.match(/Tests:\s+(\d+) passed/);
  const failMatch = output.match(/Tests:\s+(\d+) failed/);

  if (passMatch || failMatch) {
    const passed = passMatch ? parseInt(passMatch[1]) : 0;
    const failed = failMatch ? parseInt(failMatch[1]) : 0;
    const total = passed + failed;

    if (total > 0) {
      const passRate = ((passed / total) * 100).toFixed(1);
      console.log(`📊 Current pass rate: ${passRate}% (${passed}/${total})`);
    }
  }
}
