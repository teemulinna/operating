import { Pool } from 'pg';
import { ProjectTemplateModel } from '../models/ProjectTemplateModel';

type PriorityType = 'low' | 'medium' | 'high' | 'critical';
type SkillLevelType = 'junior' | 'mid' | 'senior' | 'expert';

export class BuiltInTemplateSeeder {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
    ProjectTemplateModel.initialize(pool);
  }

  async seedBuiltInTemplates(): Promise<void> {
    console.log('🌱 Starting to seed built-in templates...');

    const templates = [
      this.createSoftwareDevTemplate(),
      this.createMarketingCampaignTemplate(),
      this.createProductLaunchTemplate(),
      this.createConsultingTemplate(),
      this.createConstructionTemplate()
    ];

    for (const templateData of templates) {
      try {
        // Check if template already exists
        const existingTemplates = await ProjectTemplateModel.search({
          search: templateData.name,
          isPublic: true
        }, 1);

        if (existingTemplates.templates.length === 0) {
          await ProjectTemplateModel.create(templateData);
          console.log(`✅ Seeded template: ${templateData.name}`);
        } else {
          console.log(`⏭️  Template already exists: ${templateData.name}`);
        }
      } catch (error) {
        console.error(`❌ Failed to seed template ${templateData.name}:`, error);
      }
    }

    console.log('🌱 Built-in template seeding completed');
  }

  private createSoftwareDevTemplate() {
    return {
      name: 'Software Development Project',
      description: 'Complete web application development from requirements to deployment. Includes frontend, backend, database, and DevOps.',
      category: 'Software Development',
      defaultTasks: [
        {
          id: 'sw-req-analysis',
          name: 'Requirements Analysis',
          description: 'Gather and document functional and non-functional requirements',
          duration: 7,
          dependencies: [],
          requiredSkills: ['business-analysis', 'documentation'],
          estimatedHours: 40,
          priority: 'high' as PriorityType
        },
        {
          id: 'sw-arch-design',
          name: 'Architecture Design',
          description: 'Design system architecture and technical specifications',
          duration: 10,
          dependencies: ['sw-req-analysis'],
          requiredSkills: ['system-architecture', 'technical-design'],
          estimatedHours: 60,
          priority: 'high' as PriorityType
        },
        {
          id: 'sw-ui-design',
          name: 'UI/UX Design',
          description: 'Create user interface mockups and user experience flows',
          duration: 14,
          dependencies: ['sw-req-analysis'],
          requiredSkills: ['ui-design', 'ux-design'],
          estimatedHours: 80,
          priority: 'medium' as PriorityType
        },
        {
          id: 'sw-database-design',
          name: 'Database Design',
          description: 'Design database schema and data models',
          duration: 7,
          dependencies: ['sw-arch-design'],
          requiredSkills: ['database-design', 'sql'],
          estimatedHours: 40,
          priority: 'high' as PriorityType
        },
        {
          id: 'sw-backend-dev',
          name: 'Backend Development',
          description: 'Develop API endpoints and business logic',
          duration: 21,
          dependencies: ['sw-database-design'],
          requiredSkills: ['backend-development', 'api-development'],
          estimatedHours: 120,
          priority: 'critical' as PriorityType
        },
        {
          id: 'sw-frontend-dev',
          name: 'Frontend Development',
          description: 'Develop user interface and client-side functionality',
          duration: 21,
          dependencies: ['sw-ui-design', 'sw-backend-dev'],
          requiredSkills: ['frontend-development', 'javascript', 'react'],
          estimatedHours: 120,
          priority: 'critical' as PriorityType
        },
        {
          id: 'sw-integration',
          name: 'System Integration',
          description: 'Integrate frontend and backend components',
          duration: 7,
          dependencies: ['sw-backend-dev', 'sw-frontend-dev'],
          requiredSkills: ['full-stack-development', 'integration'],
          estimatedHours: 40,
          priority: 'high' as PriorityType
        },
        {
          id: 'sw-testing',
          name: 'Testing & QA',
          description: 'Unit testing, integration testing, and quality assurance',
          duration: 14,
          dependencies: ['sw-integration'],
          requiredSkills: ['testing', 'quality-assurance'],
          estimatedHours: 80,
          priority: 'high' as PriorityType
        },
        {
          id: 'sw-deployment',
          name: 'Deployment & DevOps',
          description: 'Set up deployment pipeline and production environment',
          duration: 5,
          dependencies: ['sw-testing'],
          requiredSkills: ['devops', 'deployment'],
          estimatedHours: 30,
          priority: 'medium' as PriorityType
        }
      ],
      defaultMilestones: [
        {
          id: 'sw-milestone-1',
          name: 'Requirements & Design Complete',
          description: 'All requirements gathered and architecture designed',
          daysFromStart: 17,
          criteria: ['Requirements document approved', 'Architecture diagram completed', 'UI mockups approved'],
          deliverables: ['Requirements Document', 'Architecture Specification', 'UI/UX Mockups']
        },
        {
          id: 'sw-milestone-2',
          name: 'MVP Development Complete',
          description: 'Minimum viable product ready for testing',
          daysFromStart: 45,
          criteria: ['Core features implemented', 'Basic UI functional', 'API endpoints working'],
          deliverables: ['Working MVP', 'API Documentation', 'Test Cases']
        },
        {
          id: 'sw-milestone-3',
          name: 'Production Ready',
          description: 'Software tested and ready for production deployment',
          daysFromStart: 66,
          criteria: ['All tests passing', 'Performance benchmarks met', 'Security review completed'],
          deliverables: ['Production-ready Application', 'Deployment Guide', 'User Manual']
        }
      ],
      defaultBudget: 75000,
      defaultDuration: 70,
      requiredSkills: [
        { skillId: 'skill-1', skillName: 'Full Stack Development', level: 'senior' as SkillLevelType, quantity: 2 },
        { skillId: 'skill-2', skillName: 'UI/UX Design', level: 'mid' as SkillLevelType, quantity: 1 },
        { skillId: 'skill-3', skillName: 'Business Analysis', level: 'mid' as SkillLevelType, quantity: 1 },
        { skillId: 'skill-4', skillName: 'Quality Assurance', level: 'mid' as SkillLevelType, quantity: 1 },
        { skillId: 'skill-5', skillName: 'DevOps', level: 'mid' as SkillLevelType, quantity: 1 }
      ],
      defaultTeamSize: 6,
      metadata: {
        industry: 'Technology',
        complexity: 'complex' as const,
        methodology: 'agile' as const,
        tags: ['web-development', 'full-stack', 'api', 'database'],
        estimatedSuccessRate: 85,
        averageCompletionTime: 70
      },
      isActive: true,
      isBuiltIn: true,
      isPublic: true,
      version: 1,
      usageCount: 0,
      averageRating: 4.5
    };
  }

  private createMarketingCampaignTemplate() {
    return {
      name: 'Marketing Campaign',
      description: 'Comprehensive digital marketing campaign from research to execution and analysis.',
      category: 'Marketing',
      defaultTasks: [
        {
          id: 'mk-market-research',
          name: 'Market Research',
          description: 'Conduct target audience analysis and competitor research',
          duration: 7,
          dependencies: [],
          requiredSkills: ['market-research', 'data-analysis'],
          estimatedHours: 35,
          priority: 'high' as PriorityType
        },
        {
          id: 'mk-strategy-dev',
          name: 'Campaign Strategy Development',
          description: 'Develop comprehensive marketing strategy and messaging',
          duration: 5,
          dependencies: ['mk-market-research'],
          requiredSkills: ['marketing-strategy', 'brand-messaging'],
          estimatedHours: 30,
          priority: 'critical' as PriorityType
        },
        {
          id: 'mk-content-creation',
          name: 'Content Creation',
          description: 'Create marketing materials, copy, and visual assets',
          duration: 14,
          dependencies: ['mk-strategy-dev'],
          requiredSkills: ['content-creation', 'graphic-design', 'copywriting'],
          estimatedHours: 80,
          priority: 'high' as PriorityType
        },
        {
          id: 'mk-channel-setup',
          name: 'Marketing Channels Setup',
          description: 'Set up advertising accounts and marketing automation',
          duration: 3,
          dependencies: ['mk-strategy-dev'],
          requiredSkills: ['digital-marketing', 'marketing-automation'],
          estimatedHours: 20,
          priority: 'medium' as PriorityType
        },
        {
          id: 'mk-campaign-launch',
          name: 'Campaign Launch',
          description: 'Execute marketing campaign across all channels',
          duration: 2,
          dependencies: ['mk-content-creation', 'mk-channel-setup'],
          requiredSkills: ['campaign-management', 'project-coordination'],
          estimatedHours: 15,
          priority: 'critical' as PriorityType
        },
        {
          id: 'mk-monitoring',
          name: 'Campaign Monitoring & Optimization',
          description: 'Monitor performance and optimize campaign elements',
          duration: 21,
          dependencies: ['mk-campaign-launch'],
          requiredSkills: ['analytics', 'campaign-optimization'],
          estimatedHours: 60,
          priority: 'medium' as PriorityType
        }
      ],
      defaultMilestones: [
        {
          id: 'mk-milestone-1',
          name: 'Strategy Approved',
          description: 'Marketing strategy and creative direction approved',
          daysFromStart: 12,
          criteria: ['Market research completed', 'Campaign strategy approved', 'Budget allocated'],
          deliverables: ['Market Research Report', 'Campaign Strategy Document', 'Creative Brief']
        },
        {
          id: 'mk-milestone-2',
          name: 'Campaign Ready',
          description: 'All campaign assets created and channels configured',
          daysFromStart: 29,
          criteria: ['All creative assets completed', 'Channels configured', 'Testing completed'],
          deliverables: ['Marketing Assets', 'Channel Setup Documentation', 'Pre-launch Checklist']
        },
        {
          id: 'mk-milestone-3',
          name: 'Campaign Complete',
          description: 'Campaign executed and results analyzed',
          daysFromStart: 52,
          criteria: ['Campaign executed successfully', 'Performance data collected', 'ROI analyzed'],
          deliverables: ['Campaign Performance Report', 'ROI Analysis', 'Recommendations']
        }
      ],
      defaultBudget: 35000,
      defaultDuration: 52,
      requiredSkills: [
        { skillId: 'skill-6', skillName: 'Marketing Strategy', level: 'senior' as SkillLevelType, quantity: 1 },
        { skillId: 'skill-7', skillName: 'Content Creation', level: 'mid' as SkillLevelType, quantity: 2 },
        { skillId: 'skill-8', skillName: 'Digital Marketing', level: 'mid' as SkillLevelType, quantity: 1 },
        { skillId: 'skill-9', skillName: 'Analytics', level: 'mid' as SkillLevelType, quantity: 1 }
      ],
      defaultTeamSize: 5,
      metadata: {
        industry: 'Marketing',
        complexity: 'moderate' as const,
        methodology: 'agile' as const,
        tags: ['digital-marketing', 'content', 'analytics', 'roi'],
        estimatedSuccessRate: 78,
        averageCompletionTime: 52
      },
      isActive: true,
      isBuiltIn: true,
      isPublic: true,
      version: 1,
      usageCount: 0,
      averageRating: 4.2
    };
  }

  private createProductLaunchTemplate() {
    return {
      name: 'Product Launch',
      description: 'Complete product launch from validation to post-launch support and optimization.',
      category: 'Product Launch',
      defaultTasks: [
        {
          id: 'pl-market-validation',
          name: 'Market Validation',
          description: 'Validate product-market fit and customer demand',
          duration: 10,
          dependencies: [],
          requiredSkills: ['market-research', 'product-management'],
          estimatedHours: 50,
          priority: 'critical' as PriorityType
        },
        {
          id: 'pl-go-to-market',
          name: 'Go-to-Market Strategy',
          description: 'Develop comprehensive go-to-market strategy',
          duration: 7,
          dependencies: ['pl-market-validation'],
          requiredSkills: ['product-marketing', 'strategy'],
          estimatedHours: 40,
          priority: 'high' as PriorityType
        },
        {
          id: 'pl-product-finalization',
          name: 'Product Finalization',
          description: 'Complete product development and quality assurance',
          duration: 21,
          dependencies: [],
          requiredSkills: ['product-development', 'quality-assurance'],
          estimatedHours: 120,
          priority: 'critical' as PriorityType
        },
        {
          id: 'pl-marketing-materials',
          name: 'Marketing Materials',
          description: 'Create launch marketing materials and campaigns',
          duration: 14,
          dependencies: ['pl-go-to-market'],
          requiredSkills: ['marketing-design', 'content-creation'],
          estimatedHours: 70,
          priority: 'high' as PriorityType
        },
        {
          id: 'pl-sales-enablement',
          name: 'Sales Enablement',
          description: 'Prepare sales team with training and materials',
          duration: 10,
          dependencies: ['pl-product-finalization', 'pl-marketing-materials'],
          requiredSkills: ['sales-training', 'product-knowledge'],
          estimatedHours: 40,
          priority: 'medium' as PriorityType
        },
        {
          id: 'pl-pre-launch',
          name: 'Pre-Launch Activities',
          description: 'Execute pre-launch marketing and build anticipation',
          duration: 14,
          dependencies: ['pl-marketing-materials'],
          requiredSkills: ['pr', 'digital-marketing'],
          estimatedHours: 60,
          priority: 'high' as PriorityType
        },
        {
          id: 'pl-launch-event',
          name: 'Launch Event',
          description: 'Execute product launch event or campaign',
          duration: 3,
          dependencies: ['pl-pre-launch', 'pl-sales-enablement'],
          requiredSkills: ['event-management', 'project-coordination'],
          estimatedHours: 30,
          priority: 'critical' as PriorityType
        },
        {
          id: 'pl-post-launch',
          name: 'Post-Launch Support',
          description: 'Monitor launch metrics and provide ongoing support',
          duration: 30,
          dependencies: ['pl-launch-event'],
          requiredSkills: ['analytics', 'customer-support'],
          estimatedHours: 80,
          priority: 'medium' as PriorityType
        }
      ],
      defaultMilestones: [
        {
          id: 'pl-milestone-1',
          name: 'Launch Strategy Ready',
          description: 'Product validated and launch strategy finalized',
          daysFromStart: 17,
          criteria: ['Market validation completed', 'Go-to-market strategy approved', 'Launch timeline confirmed'],
          deliverables: ['Market Validation Report', 'Go-to-Market Strategy', 'Launch Plan']
        },
        {
          id: 'pl-milestone-2',
          name: 'Launch Ready',
          description: 'Product and marketing materials ready for launch',
          daysFromStart: 45,
          criteria: ['Product development complete', 'Marketing materials ready', 'Sales team trained'],
          deliverables: ['Final Product', 'Marketing Campaign', 'Sales Materials']
        },
        {
          id: 'pl-milestone-3',
          name: 'Launch Complete',
          description: 'Product successfully launched and performing',
          daysFromStart: 75,
          criteria: ['Launch executed', 'Initial sales targets met', 'Customer feedback positive'],
          deliverables: ['Launch Report', 'Performance Metrics', 'Success Analysis']
        }
      ],
      defaultBudget: 85000,
      defaultDuration: 75,
      requiredSkills: [
        { skillId: 'skill-10', skillName: 'Product Management', level: 'senior' as SkillLevelType, quantity: 1 },
        { skillId: 'skill-11', skillName: 'Product Marketing', level: 'senior' as SkillLevelType, quantity: 1 },
        { skillId: 'skill-12', skillName: 'Content Creation', level: 'mid' as SkillLevelType, quantity: 2 },
        { skillId: 'skill-13', skillName: 'Sales Enablement', level: 'mid' as SkillLevelType, quantity: 1 },
        { skillId: 'skill-14', skillName: 'Event Management', level: 'mid' as SkillLevelType, quantity: 1 }
      ],
      defaultTeamSize: 6,
      metadata: {
        industry: 'Product',
        complexity: 'complex' as const,
        methodology: 'waterfall' as const,
        tags: ['product-launch', 'go-to-market', 'sales', 'marketing'],
        estimatedSuccessRate: 72,
        averageCompletionTime: 75
      },
      isActive: true,
      isBuiltIn: true,
      isPublic: true,
      version: 1,
      usageCount: 0,
      averageRating: 4.0
    };
  }

  private createConsultingTemplate() {
    return {
      name: 'Consulting Engagement',
      description: 'Strategic consulting engagement from discovery to implementation planning and knowledge transfer.',
      category: 'Consulting',
      defaultTasks: [
        {
          id: 'cs-discovery',
          name: 'Discovery & Assessment',
          description: 'Understand client needs and assess current situation',
          duration: 5,
          dependencies: [],
          requiredSkills: ['business-analysis', 'consulting'],
          estimatedHours: 30,
          priority: 'critical' as PriorityType
        },
        {
          id: 'cs-stakeholder-interviews',
          name: 'Stakeholder Interviews',
          description: 'Interview key stakeholders to gather requirements',
          duration: 7,
          dependencies: ['cs-discovery'],
          requiredSkills: ['interviewing', 'stakeholder-management'],
          estimatedHours: 35,
          priority: 'high' as PriorityType
        },
        {
          id: 'cs-current-state-analysis',
          name: 'Current State Analysis',
          description: 'Analyze existing processes and identify gaps',
          duration: 10,
          dependencies: ['cs-stakeholder-interviews'],
          requiredSkills: ['process-analysis', 'business-analysis'],
          estimatedHours: 60,
          priority: 'high' as PriorityType
        },
        {
          id: 'cs-future-state-design',
          name: 'Future State Design',
          description: 'Design optimal future state and recommendations',
          duration: 14,
          dependencies: ['cs-current-state-analysis'],
          requiredSkills: ['solution-design', 'strategy'],
          estimatedHours: 80,
          priority: 'critical' as PriorityType
        },
        {
          id: 'cs-implementation-plan',
          name: 'Implementation Planning',
          description: 'Create detailed implementation roadmap',
          duration: 7,
          dependencies: ['cs-future-state-design'],
          requiredSkills: ['project-planning', 'change-management'],
          estimatedHours: 40,
          priority: 'high' as PriorityType
        },
        {
          id: 'cs-presentation-prep',
          name: 'Final Presentation Preparation',
          description: 'Prepare executive presentation and documentation',
          duration: 5,
          dependencies: ['cs-implementation-plan'],
          requiredSkills: ['presentation', 'documentation'],
          estimatedHours: 30,
          priority: 'medium' as PriorityType
        },
        {
          id: 'cs-knowledge-transfer',
          name: 'Knowledge Transfer',
          description: 'Transfer knowledge and recommendations to client team',
          duration: 3,
          dependencies: ['cs-presentation-prep'],
          requiredSkills: ['training', 'knowledge-transfer'],
          estimatedHours: 20,
          priority: 'medium' as PriorityType
        }
      ],
      defaultMilestones: [
        {
          id: 'cs-milestone-1',
          name: 'Assessment Complete',
          description: 'Current state fully understood and documented',
          daysFromStart: 22,
          criteria: ['All stakeholders interviewed', 'Current state mapped', 'Gaps identified'],
          deliverables: ['Current State Report', 'Gap Analysis', 'Stakeholder Map']
        },
        {
          id: 'cs-milestone-2',
          name: 'Recommendations Ready',
          description: 'Future state designed with implementation plan',
          daysFromStart: 43,
          criteria: ['Future state designed', 'Implementation plan created', 'ROI calculated'],
          deliverables: ['Future State Design', 'Implementation Roadmap', 'Business Case']
        },
        {
          id: 'cs-milestone-3',
          name: 'Engagement Complete',
          description: 'Recommendations presented and knowledge transferred',
          daysFromStart: 51,
          criteria: ['Executive presentation delivered', 'Documentation complete', 'Knowledge transferred'],
          deliverables: ['Final Report', 'Executive Summary', 'Handover Documentation']
        }
      ],
      defaultBudget: 65000,
      defaultDuration: 51,
      requiredSkills: [
        { skillId: 'skill-15', skillName: 'Management Consulting', level: 'senior' as SkillLevelType, quantity: 1 },
        { skillId: 'skill-16', skillName: 'Business Analysis', level: 'senior' as SkillLevelType, quantity: 1 },
        { skillId: 'skill-17', skillName: 'Process Optimization', level: 'mid' as SkillLevelType, quantity: 1 },
        { skillId: 'skill-18', skillName: 'Change Management', level: 'mid' as SkillLevelType, quantity: 1 }
      ],
      defaultTeamSize: 4,
      metadata: {
        industry: 'Consulting',
        complexity: 'moderate' as const,
        methodology: 'waterfall' as const,
        tags: ['consulting', 'process-improvement', 'strategy', 'analysis'],
        estimatedSuccessRate: 88,
        averageCompletionTime: 51
      },
      isActive: true,
      isBuiltIn: true,
      isPublic: true,
      version: 1,
      usageCount: 0,
      averageRating: 4.3
    };
  }

  private createConstructionTemplate() {
    return {
      name: 'Construction Project',
      description: 'Commercial or residential construction project from planning to completion.',
      category: 'Construction',
      defaultTasks: [
        {
          id: 'cn-project-planning',
          name: 'Project Planning & Design',
          description: 'Initial project planning and architectural design',
          duration: 21,
          dependencies: [],
          requiredSkills: ['project-management', 'architectural-design'],
          estimatedHours: 120,
          priority: 'critical' as PriorityType
        },
        {
          id: 'cn-permits-approvals',
          name: 'Permits & Approvals',
          description: 'Obtain necessary permits and regulatory approvals',
          duration: 30,
          dependencies: ['cn-project-planning'],
          requiredSkills: ['regulatory-compliance', 'permit-management'],
          estimatedHours: 80,
          priority: 'high' as PriorityType
        },
        {
          id: 'cn-site-preparation',
          name: 'Site Preparation',
          description: 'Clear and prepare construction site',
          duration: 10,
          dependencies: ['cn-permits-approvals'],
          requiredSkills: ['site-preparation', 'heavy-equipment'],
          estimatedHours: 80,
          priority: 'high' as PriorityType
        },
        {
          id: 'cn-foundation',
          name: 'Foundation Work',
          description: 'Excavation and foundation construction',
          duration: 14,
          dependencies: ['cn-site-preparation'],
          requiredSkills: ['foundation-work', 'concrete'],
          estimatedHours: 200,
          priority: 'critical' as PriorityType
        },
        {
          id: 'cn-framing',
          name: 'Structural Framing',
          description: 'Build structural framework of the building',
          duration: 21,
          dependencies: ['cn-foundation'],
          requiredSkills: ['carpentry', 'structural-work'],
          estimatedHours: 300,
          priority: 'critical' as PriorityType
        },
        {
          id: 'cn-utilities',
          name: 'Utilities Installation',
          description: 'Install plumbing, electrical, and HVAC systems',
          duration: 28,
          dependencies: ['cn-framing'],
          requiredSkills: ['plumbing', 'electrical', 'hvac'],
          estimatedHours: 400,
          priority: 'high' as PriorityType
        },
        {
          id: 'cn-insulation-drywall',
          name: 'Insulation & Drywall',
          description: 'Install insulation and drywall systems',
          duration: 14,
          dependencies: ['cn-utilities'],
          requiredSkills: ['insulation', 'drywall'],
          estimatedHours: 200,
          priority: 'medium' as PriorityType
        },
        {
          id: 'cn-flooring-finishes',
          name: 'Flooring & Interior Finishes',
          description: 'Install flooring and complete interior finishes',
          duration: 21,
          dependencies: ['cn-insulation-drywall'],
          requiredSkills: ['flooring', 'interior-finishing'],
          estimatedHours: 250,
          priority: 'medium' as PriorityType
        },
        {
          id: 'cn-final-inspection',
          name: 'Final Inspection & Cleanup',
          description: 'Final inspections and project cleanup',
          duration: 7,
          dependencies: ['cn-flooring-finishes'],
          requiredSkills: ['quality-control', 'project-management'],
          estimatedHours: 40,
          priority: 'high' as PriorityType
        }
      ],
      defaultMilestones: [
        {
          id: 'cn-milestone-1',
          name: 'Planning & Permits Complete',
          description: 'All planning and permits obtained',
          daysFromStart: 51,
          criteria: ['Design approved', 'All permits obtained', 'Site survey complete'],
          deliverables: ['Approved Plans', 'Construction Permits', 'Site Survey']
        },
        {
          id: 'cn-milestone-2',
          name: 'Structure Complete',
          description: 'Foundation and structural work finished',
          daysFromStart: 96,
          criteria: ['Foundation complete', 'Framing finished', 'Roof installed'],
          deliverables: ['Structural Completion Certificate', 'Foundation Inspection Report']
        },
        {
          id: 'cn-milestone-3',
          name: 'Project Complete',
          description: 'Construction finished and ready for occupancy',
          daysFromStart: 166,
          criteria: ['All work completed', 'Final inspections passed', 'Certificate of occupancy obtained'],
          deliverables: ['Certificate of Occupancy', 'Final Inspection Reports', 'Warranty Documentation']
        }
      ],
      defaultBudget: 250000,
      defaultDuration: 166,
      requiredSkills: [
        { skillId: 'skill-19', skillName: 'Construction Management', level: 'senior' as SkillLevelType, quantity: 1 },
        { skillId: 'skill-20', skillName: 'Carpentry', level: 'senior' as SkillLevelType, quantity: 3 },
        { skillId: 'skill-21', skillName: 'Electrical Work', level: 'senior' as SkillLevelType, quantity: 2 },
        { skillId: 'skill-22', skillName: 'Plumbing', level: 'senior' as SkillLevelType, quantity: 2 },
        { skillId: 'skill-23', skillName: 'HVAC', level: 'mid' as SkillLevelType, quantity: 2 },
        { skillId: 'skill-24', skillName: 'General Labor', level: 'junior' as SkillLevelType, quantity: 6 }
      ],
      defaultTeamSize: 16,
      metadata: {
        industry: 'Construction',
        complexity: 'complex' as const,
        methodology: 'waterfall' as const,
        tags: ['construction', 'building', 'permits', 'trades'],
        estimatedSuccessRate: 82,
        averageCompletionTime: 166
      },
      isActive: true,
      isBuiltIn: true,
      isPublic: true,
      version: 1,
      usageCount: 0,
      averageRating: 4.1
    };
  }
}