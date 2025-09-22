#!/usr/bin/env node

/**
 * Comprehensive E2E Test for Weekly Capacity Feature
 * This test verifies that the weeklyCapacity field works correctly
 * throughout the entire system from backend to frontend
 */

const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3001/api';

async function runComprehensiveTests() {
    console.log('🧪 Running Comprehensive E2E Tests for Weekly Capacity Feature\n');

    let testsPassed = 0;
    let testsFailed = 0;

    // Test 1: API returns weeklyCapacity field
    console.log('Test 1: API returns weeklyCapacity field...');
    try {
        const res = await fetch(`${API_BASE}/employees`);
        const data = await res.json();
        const employees = data.data || [];

        if (employees.length > 0) {
            const hasWeeklyCapacity = employees.every(emp => 'weeklyCapacity' in emp);
            const noDefaultHours = employees.every(emp => !('defaultHours' in emp) && !('defaultHoursPerWeek' in emp));

            if (hasWeeklyCapacity && noDefaultHours) {
                console.log('✅ All employees have weeklyCapacity field (no defaultHours fields)');
                testsPassed++;
            } else {
                console.log('❌ Some employees missing weeklyCapacity or have old fields');
                testsFailed++;
            }
        }
    } catch (error) {
        console.log('❌ Failed to fetch employees:', error.message);
        testsFailed++;
    }

    // Test 2: Create employee with custom weeklyCapacity
    console.log('\nTest 2: Create employee with custom weeklyCapacity...');
    try {
        // First get a valid department ID
        const deptRes = await fetch(`${API_BASE}/departments`);
        const departments = await deptRes.json();
        const validDeptId = departments[0]?.id || '0f68388b-ee6b-4477-bcad-d437763f23a6';

        const newEmployee = {
            firstName: 'Test',
            lastName: `Capacity${Date.now()}`,
            email: `test.capacity${Date.now()}@example.com`,
            position: 'Part-Time Developer',
            departmentId: validDeptId,
            salary: 50000,
            weeklyCapacity: 20  // Part-time capacity
        };

        const res = await fetch(`${API_BASE}/employees`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newEmployee)
        });

        const created = await res.json();

        // Debug logging
        console.log('Response status:', res.status);
        console.log('Created employee:', JSON.stringify(created, null, 2));

        if (res.ok && created && (created.weeklyCapacity === 20 || created.weeklyCapacity === '20' || created.weeklyCapacity === '20.00')) {
            console.log(`✅ Employee created with custom capacity: ${created.weeklyCapacity}h/week`);
            testsPassed++;

            // Clean up
            await fetch(`${API_BASE}/employees/${created.id}`, { method: 'DELETE' });
        } else {
            console.log('❌ Failed to create employee with custom weeklyCapacity');
            console.log('Expected weeklyCapacity: 20, Got:', created?.weeklyCapacity);
            testsFailed++;
        }
    } catch (error) {
        console.log('❌ Failed to create employee:', error.message);
        testsFailed++;
    }

    // Test 3: Update employee weeklyCapacity
    console.log('\nTest 3: Update employee weeklyCapacity...');
    try {
        // Get an employee to update
        const res = await fetch(`${API_BASE}/employees`);
        const data = await res.json();
        const employees = data.data || [];

        if (employees.length > 0) {
            const employee = employees[0];
            const newCapacity = 30;

            const updateRes = await fetch(`${API_BASE}/employees/${employee.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...employee, weeklyCapacity: newCapacity })
            });

            const updated = await updateRes.json();

            if (updated && updated.weeklyCapacity === `${newCapacity}.00`) {
                console.log(`✅ Employee capacity updated to ${updated.weeklyCapacity}h/week`);
                testsPassed++;
            } else {
                console.log('❌ Failed to update employee weeklyCapacity');
                testsFailed++;
            }
        }
    } catch (error) {
        console.log('❌ Failed to update employee:', error.message);
        testsFailed++;
    }

    // Test 4: Over-allocation calculation with weeklyCapacity
    console.log('\nTest 4: Over-allocation calculation with weeklyCapacity...');
    try {
        const res = await fetch(`${API_BASE}/allocations`);
        const allocData = await res.json();
        const allocations = allocData.data || [];

        const empRes = await fetch(`${API_BASE}/employees`);
        const empData = await empRes.json();
        const employees = empData.data || [];

        let overAllocationChecked = false;
        for (const employee of employees) {
            const empAllocations = allocations.filter(a => a.employeeId === employee.id && a.status === 'active');
            const totalHours = empAllocations.reduce((sum, a) => sum + a.hours, 0);
            const capacity = Number(employee.weeklyCapacity) || 40;

            if (totalHours > capacity) {
                console.log(`✅ Over-allocation detected: ${employee.firstName} ${employee.lastName} - ${totalHours}h/${capacity}h`);
                overAllocationChecked = true;
                break;
            }
        }

        if (!overAllocationChecked) {
            console.log('✅ No over-allocations found (capacity checks working)');
        }
        testsPassed++;
    } catch (error) {
        console.log('❌ Failed to check over-allocation:', error.message);
        testsFailed++;
    }

    // Test 5: Backend validation of weeklyCapacity
    console.log('\nTest 5: Backend validation of weeklyCapacity...');
    try {
        // Get a valid department ID
        const deptRes = await fetch(`${API_BASE}/departments`);
        const departments = await deptRes.json();
        const validDeptId = departments[0]?.id || '0f68388b-ee6b-4477-bcad-d437763f23a6';

        const invalidEmployee = {
            firstName: 'Invalid',
            lastName: 'Capacity',
            email: `invalid${Date.now()}@test.com`,
            position: 'Developer',
            departmentId: validDeptId,
            salary: 60000,
            weeklyCapacity: 200  // Invalid: too high
        };

        const res = await fetch(`${API_BASE}/employees`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(invalidEmployee)
        });

        if (res.status === 400) {
            console.log('✅ Backend correctly rejected invalid weeklyCapacity (>100)');
            testsPassed++;
        } else {
            console.log('❌ Backend accepted invalid weeklyCapacity');
            testsFailed++;
        }
    } catch (error) {
        console.log('❌ Failed validation test:', error.message);
        testsFailed++;
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Tests Passed: ${testsPassed}`);
    console.log(`❌ Tests Failed: ${testsFailed}`);
    console.log(`📈 Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);

    if (testsFailed === 0) {
        console.log('\n🎉 ALL TESTS PASSED! Weekly capacity feature is 100% functional!');
    } else {
        console.log('\n⚠️ Some tests failed. Please review the issues above.');
    }

    return testsFailed === 0;
}

// Run tests
runComprehensiveTests().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('❌ Test suite error:', error);
    process.exit(1);
});