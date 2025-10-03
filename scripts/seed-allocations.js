const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

async function seedAllocations() {
  console.log('🚀 Starting to seed allocations...\n');

  try {
    // Get employees and projects
    const [employeesRes, projectsRes] = await Promise.all([
      axios.get(`${API_BASE}/employees?limit=100`),
      axios.get(`${API_BASE}/projects`)
    ]);

    const employees = employeesRes.data.data;
    const projects = projectsRes.data.data.filter(p => p.status === 'active');

    if (employees.length === 0 || projects.length === 0) {
      console.log('❌ Need employees and active projects to create allocations');
      return;
    }

    // Create allocations
    const allocations = [
      // Website Redesign team
      {
        employeeId: employees[0].id, // David Brown - Backend Developer
        projectId: projects[0].id,
        allocatedHours: 20,
        startDate: '2025-01-01',
        endDate: '2025-06-30',
        roleOnProject: 'Backend Development'
      },
      {
        employeeId: employees[5].id, // Emily Davis - UI Designer
        projectId: projects[0].id,
        allocatedHours: 30,
        startDate: '2025-01-01',
        endDate: '2025-06-30',
        roleOnProject: 'UI/UX Design'
      },
      {
        employeeId: employees[6].id, // John Doe - Senior Software Engineer
        projectId: projects[0].id,
        allocatedHours: 25,
        startDate: '2025-01-01',
        endDate: '2025-06-30',
        roleOnProject: 'Technical Lead'
      },

      // Mobile App Development team
      {
        employeeId: employees[0].id, // David Brown
        projectId: projects[1]?.id,
        allocatedHours: 15,
        startDate: '2025-02-01',
        endDate: '2025-08-31',
        roleOnProject: 'API Development'
      },
      {
        employeeId: employees[9].id, // Robert Miller - DevOps
        projectId: projects[1]?.id,
        allocatedHours: 10,
        startDate: '2025-02-01',
        endDate: '2025-08-31',
        roleOnProject: 'Infrastructure Setup'
      },
      {
        employeeId: employees[8].id, // Mike Johnson - Product Manager
        projectId: projects[1]?.id,
        allocatedHours: 15,
        startDate: '2025-02-01',
        endDate: '2025-08-31',
        roleOnProject: 'Product Management'
      },

      // API Integration Platform team
      {
        employeeId: employees[6].id, // John Doe
        projectId: projects[2]?.id,
        allocatedHours: 10,
        startDate: '2025-01-15',
        endDate: '2025-05-15',
        roleOnProject: 'Architecture Design'
      },
      {
        employeeId: employees[7].id, // Test Employee
        projectId: projects[2]?.id,
        allocatedHours: 35,
        startDate: '2025-01-15',
        endDate: '2025-05-15',
        roleOnProject: 'Quality Assurance'
      },
      {
        employeeId: employees[9].id, // Robert Miller
        projectId: projects[2]?.id,
        allocatedHours: 25,
        startDate: '2025-01-15',
        endDate: '2025-05-15',
        roleOnProject: 'DevOps & Deployment'
      }
    ];

    let successCount = 0;
    for (const allocation of allocations) {
      if (!allocation.projectId) continue;

      try {
        await axios.post(`${API_BASE}/allocations`, allocation);
        const employee = employees.find(e => e.id === allocation.employeeId);
        const project = projects.find(p => p.id === allocation.projectId);
        console.log(`✅ Allocated ${employee?.firstName} ${employee?.lastName} to ${project?.name} (${allocation.allocatedHours}h/week)`);
        successCount++;
      } catch (error) {
        console.error(`❌ Failed to create allocation`);
        console.error(`   Error: ${error.response?.data?.message || error.message}`);
      }
    }

    // Get summary
    const allocationsRes = await axios.get(`${API_BASE}/allocations?limit=100`);
    const allAllocations = allocationsRes.data.data;

    console.log(`\n📊 Summary:`);
    console.log(`   Total allocations created: ${successCount}`);
    console.log(`   Total allocations in system: ${allAllocations.length}`);

    // Calculate utilization for a few employees
    const utilizedEmployees = {};
    allAllocations.forEach(alloc => {
      if (!utilizedEmployees[alloc.employeeId]) {
        utilizedEmployees[alloc.employeeId] = 0;
      }
      utilizedEmployees[alloc.employeeId] += (alloc.hours || alloc.allocatedHours || 0);
    });

    console.log(`\n👥 Employee Utilization:`);
    for (const [empId, totalHours] of Object.entries(utilizedEmployees)) {
      const emp = employees.find(e => e.id === empId);
      if (emp) {
        const utilization = Math.round((totalHours / (emp.weeklyCapacity || 40)) * 100);
        console.log(`   ${emp.firstName} ${emp.lastName}: ${totalHours}h/week (${utilization}% utilized)`);
      }
    }

  } catch (error) {
    console.error('❌ Failed to seed allocations:', error.message);
  }
}

seedAllocations().catch(console.error);