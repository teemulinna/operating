const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

const projects = [
  {
    name: 'Website Redesign',
    description: 'Complete redesign of company website with modern UI/UX',
    clientName: 'TechCorp Inc',
    status: 'active',
    startDate: '2025-01-01',
    endDate: '2025-06-30',
    budget: 150000,
    hourlyRate: 175,
    priority: 'high',
    estimatedHours: 800
  },
  {
    name: 'Mobile App Development',
    description: 'Native iOS and Android app for customer portal',
    clientName: 'RetailMax',
    status: 'active',
    startDate: '2025-02-01',
    endDate: '2025-08-31',
    budget: 250000,
    hourlyRate: 200,
    priority: 'high',
    estimatedHours: 1200
  },
  {
    name: 'API Integration Platform',
    description: 'Build RESTful API platform for third-party integrations',
    clientName: 'DataSync Solutions',
    status: 'active',
    startDate: '2025-01-15',
    endDate: '2025-05-15',
    budget: 120000,
    hourlyRate: 185,
    priority: 'medium',
    estimatedHours: 600
  },
  {
    name: 'Legacy System Migration',
    description: 'Migrate legacy systems to cloud infrastructure',
    clientName: 'FinanceHub',
    status: 'planning',
    startDate: '2025-03-01',
    endDate: '2025-09-30',
    budget: 300000,
    hourlyRate: 225,
    priority: 'low',
    estimatedHours: 1300
  },
  {
    name: 'E-commerce Platform',
    description: 'Completed e-commerce platform implementation',
    clientName: 'ShopEasy',
    status: 'completed',
    startDate: '2024-06-01',
    endDate: '2024-12-31',
    budget: 180000,
    hourlyRate: 165,
    priority: 'medium',
    estimatedHours: 1000,
    actualHours: 980
  }
];

async function seedProjects() {
  console.log('🚀 Starting to seed projects...\n');

  for (const project of projects) {
    try {
      const response = await axios.post(`${API_BASE}/projects`, project);
      console.log(`✅ Created project: ${project.name} (${project.status})`);
      console.log(`   ID: ${response.data.data.id}`);
    } catch (error) {
      console.error(`❌ Failed to create project: ${project.name}`);
      console.error(`   Error: ${error.response?.data?.message || error.message}`);
    }
  }

  // Verify the projects were created
  try {
    const response = await axios.get(`${API_BASE}/projects`);
    const activeCount = response.data.data.filter(p => p.status === 'active').length;
    const totalCount = response.data.data.length;

    console.log(`\n📊 Summary:`);
    console.log(`   Total projects: ${totalCount}`);
    console.log(`   Active projects: ${activeCount}`);
    console.log(`   Planning: ${response.data.data.filter(p => p.status === 'planning').length}`);
    console.log(`   Completed: ${response.data.data.filter(p => p.status === 'completed').length}`);
  } catch (error) {
    console.error('Failed to fetch projects summary');
  }
}

seedProjects().catch(console.error);