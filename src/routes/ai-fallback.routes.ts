import { Router } from 'express';
import { Request, Response } from 'express';

const router = Router();

/**
 * Fallback AI endpoints for testing and development
 * These provide mock responses when the main AI services are not available
 */

// Skills matching fallback
router.post('/skills/match', (req: Request, res: Response) => {
  const mockMatches = [
    {
      employeeId: 'emp-001',
      employeeName: 'John Smith',
      overallMatchScore: 85,
      overallRecommendation: 'excellent',
      skillMatches: [
        {
          skillId: 'js-001',
          skillName: 'JavaScript',
          hasSkill: true,
          proficiency: 4,
          proficiencyGap: 1,
          weight: 8.0
        }
      ],
      availability: 40,
      experience: 'Senior'
    }
  ];

  res.json({
    success: true,
    message: `Found ${mockMatches.length} matching candidates`,
    data: {
      matches: mockMatches,
      summary: {
        totalCandidates: mockMatches.length,
        averageMatchScore: 85
      }
    }
  });
});

// Forecasting capacity fallback
router.get('/forecasting/capacity', (req: Request, res: Response) => {
  const mockCapacity = {
    totalCapacity: [
      { timestamp: new Date(), value: 100, metadata: {} },
      { timestamp: new Date(Date.now() + 86400000), value: 95, metadata: {} }
    ],
    availableCapacity: [
      { timestamp: new Date(), value: 80, metadata: {} },
      { timestamp: new Date(Date.now() + 86400000), value: 75, metadata: {} }
    ],
    utilizationRate: 0.8,
    skillCapacity: {
      'javascript': [
        { timestamp: new Date(), value: 20, metadata: {} }
      ],
      'react': [
        { timestamp: new Date(), value: 15, metadata: {} }
      ]
    },
    skillDemand: {
      'javascript': [
        { timestamp: new Date(), value: 18, metadata: {} }
      ]
    }
  };

  res.json({
    success: true,
    data: mockCapacity,
    metadata: {
      generatedAt: new Date(),
      dataPoints: 2,
      skills: 2
    }
  });
});

// Optimization analysis fallback  
router.post('/optimization/analyze', (req: Request, res: Response) => {
  const mockAnalysis = {
    currentState: {
      conflicts: [
        {
          type: 'time_overlap',
          severity: 'high',
          description: 'Employee assigned to overlapping projects',
          employeeId: 'emp-001',
          projectIds: ['proj-1', 'proj-2']
        }
      ],
      totalCost: 150000,
      utilization: 0.85
    },
    suggestions: [
      {
        type: 'rebalance_allocation',
        description: 'Redistribute workload to reduce conflicts',
        impact: {
          conflictReduction: 2,
          costSaving: 5000,
          utilizationImprovement: 0.1,
          skillMatchImprovement: 0.05
        },
        effort: 'medium',
        priority: 'high'
      }
    ],
    metrics: {
      utilizationBalance: 0.78,
      costEfficiency: 0.82,
      conflictRate: 0.15
    }
  };

  res.json({
    success: true,
    data: mockAnalysis,
    message: 'Resource allocation analysis completed successfully'
  });
});

// Generic AI status endpoint
router.get('/status', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'AI services status',
    data: {
      services: {
        'skills-matching': {
          status: 'fallback',
          description: 'Skills matching fallback'
        },
        'optimization': {
          status: 'fallback', 
          description: 'Optimization fallback'
        },
        'forecasting': {
          status: 'fallback',
          description: 'Forecasting fallback'
        }
      },
      fallback: true,
      timestamp: new Date().toISOString()
    }
  });
});

// Simple health check for AI services
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy_fallback',
    services: ['skills-matching', 'optimization', 'forecasting'],
    mode: 'fallback',
    timestamp: new Date().toISOString()
  });
});

export default router;