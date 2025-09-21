import { Router, Request, Response } from 'express';
import { DatabaseService } from '../database/database.service';

const router = Router();
const db = DatabaseService.getInstance();

// Basic resource optimization endpoint
router.post('/optimize-allocations', async (req: Request, res: Response): Promise<Response> => {
  try {
    await db.connect();
    
    const { projectIds, maxUtilization = 100, prioritizeSkillMatch = true } = req.body;
    
    // Get current allocation state
    const currentAllocationsQuery = `
      SELECT 
        ra.id,
        ra.employee_id,
        e.first_name || ' ' || e.last_name as employee_name,
        ra.project_id,
        p.name as project_name,
        ra.planned_allocation_percentage,
        ra.start_date,
        ra.end_date,
        ra.status,
        -- Calculate skill match for this assignment
        COALESCE(
          (SELECT AVG(
            CASE es.proficiency_level
              WHEN 'expert' THEN 95
              WHEN 'advanced' THEN 85
              WHEN 'intermediate' THEN 75
              WHEN 'beginner' THEN 60
              ELSE 50
            END
          )
          FROM employee_skills es
          JOIN project_roles pr ON ra.project_role_id = pr.id
          WHERE es.employee_id = ra.employee_id
            AND es.skill_id = ANY(pr.required_skills)
            AND es.is_active = true
          ), 50
        ) as skill_match_score
      FROM resource_assignments ra
      JOIN employees e ON ra.employee_id = e.id
      JOIN projects p ON ra.project_id = p.id
      WHERE ra.status IN ('active', 'planned')
        AND ($1::int[] IS NULL OR ra.project_id = ANY($1::int[]))
        AND e.is_active = true
      ORDER BY ra.employee_id, ra.project_id
    `;

    const allocationsResult = await db.query(currentAllocationsQuery, [projectIds]);

    // Calculate employee utilization
    const utilizationMap = new Map();
    const conflicts = [];

    for (const allocation of allocationsResult.rows) {
      const empId = allocation.employee_id;
      const current = utilizationMap.get(empId) || {
        employeeId: empId,
        employeeName: allocation.employee_name,
        totalUtilization: 0,
        assignments: [],
        averageSkillMatch: 0
      };

      current.totalUtilization += parseFloat(allocation.planned_allocation_percentage);
      current.assignments.push({
        projectId: allocation.project_id,
        projectName: allocation.project_name,
        allocation: parseFloat(allocation.planned_allocation_percentage),
        skillMatch: Math.round(parseFloat(allocation.skill_match_score)),
        assignmentId: allocation.id
      });

      utilizationMap.set(empId, current);

      // Check for over-allocation
      if (current.totalUtilization > maxUtilization) {
        conflicts.push({
          employeeId: empId,
          employeeName: allocation.employee_name,
          currentUtilization: current.totalUtilization,
          overallocation: current.totalUtilization - maxUtilization,
          affectedProjects: current.assignments.map((a: any) => a.projectName)
        });
      }
    }

    // Calculate average skill match per employee
    for (const [empId, data] of utilizationMap) {
      const totalSkillMatch = data.assignments.reduce((sum: number, a: any) => sum + a.skillMatch, 0);
      data.averageSkillMatch = data.assignments.length > 0 ? 
        Math.round(totalSkillMatch / data.assignments.length) : 0;
    }

    // Simple optimization suggestions
    const suggestions = [];

    // Suggest reducing allocations for over-utilized employees
    for (const conflict of conflicts) {
      const employee = utilizationMap.get(conflict.employeeId);
      const lowestSkillMatches = employee.assignments
        .sort((a: any, b: any) => a.skillMatch - b.skillMatch)
        .slice(0, Math.ceil(conflict.overallocation / 25)); // Reduce 25% allocations

      suggestions.push({
        type: 'reduce_allocation',
        priority: 'high',
        employeeId: conflict.employeeId,
        employeeName: conflict.employeeName,
        description: `Reduce allocation by ${conflict.overallocation}% to resolve over-allocation`,
        recommendations: lowestSkillMatches.map((a: any) => ({
          projectId: a.projectId,
          projectName: a.projectName,
          currentAllocation: a.allocation,
          suggestedReduction: Math.min(a.allocation, conflict.overallocation / lowestSkillMatches.length),
          reason: `Low skill match (${a.skillMatch}%)`
        })),
        expectedImprovement: {
          utilizationImprovement: -conflict.overallocation,
          conflictReduction: 1
        }
      });
    }

    // Suggest better skill matches for low-scoring assignments
    const lowSkillAssignments = [];
    for (const [empId, data] of utilizationMap) {
      for (const assignment of data.assignments) {
        if (assignment.skillMatch < 70) {
          lowSkillAssignments.push({
            employeeId: empId,
            employeeName: data.employeeName,
            ...assignment
          });
        }
      }
    }

    if (lowSkillAssignments.length > 0) {
      suggestions.push({
        type: 'improve_skill_match',
        priority: 'medium',
        description: `${lowSkillAssignments.length} assignments have low skill match scores`,
        assignments: lowSkillAssignments.slice(0, 10), // Top 10
        recommendation: 'Consider reassigning these roles to employees with better skill alignment',
        expectedImprovement: {
          skillMatchImprovement: 20,
          performanceIncrease: 15
        }
      });
    }

    // Calculate summary metrics
    const totalEmployees = utilizationMap.size;
    const totalUtilization = Array.from(utilizationMap.values())
      .reduce((sum: number, emp: any) => sum + emp.totalUtilization, 0);
    const averageUtilization = totalEmployees > 0 ? totalUtilization / totalEmployees : 0;
    const totalAssignments = allocationsResult.rows.length;
    const averageSkillMatch = Array.from(utilizationMap.values())
      .reduce((sum: number, emp: any) => sum + emp.averageSkillMatch, 0) / totalEmployees || 0;

    return res.json({
      success: true,
      data: {
        optimizationId: `opt_${Date.now()}`,
        timestamp: new Date().toISOString(),
        summary: {
          totalEmployees,
          totalAssignments,
          averageUtilization: Math.round(averageUtilization),
          conflictCount: conflicts.length,
          averageSkillMatch: Math.round(averageSkillMatch)
        },
        conflicts,
        suggestions,
        employeeUtilization: Array.from(utilizationMap.values()),
        performance: {
          feasibilityScore: conflicts.length === 0 ? 100 : Math.max(0, 100 - conflicts.length * 20),
          optimizationPotential: suggestions.length * 10
        }
      }
    });

  } catch (error: any) {
    console.error('Error in optimization:', error);
    return res.status(500).json({
      error: 'Failed to optimize allocations',
      details: error.message
    });
  }
});

// Get utilization analysis
router.get('/utilization-analysis', async (req: Request, res: Response): Promise<Response> => {
  try {
    await db.connect();

    const { departmentId, startDate, endDate } = req.query;

    let whereConditions = ['e.is_active = true'];
    const values: any[] = [];
    let paramIndex = 1;

    if (departmentId) {
      whereConditions.push(`e.department_id = $${paramIndex++}`);
      values.push(departmentId);
    }

    const query = `
      SELECT 
        e.id as employee_id,
        e.first_name || ' ' || e.last_name as employee_name,
        e.position,
        d.name as department,
        
        -- Current utilization
        COALESCE(
          SUM(
            CASE WHEN ra.status IN ('active', 'planned') 
                 AND ra.start_date <= CURRENT_DATE 
                 AND (ra.end_date IS NULL OR ra.end_date >= CURRENT_DATE)
            THEN ra.planned_allocation_percentage
            ELSE 0 END
          ), 0
        ) as current_utilization,
        
        -- Future utilization (next 3 months)
        COALESCE(
          SUM(
            CASE WHEN ra.status = 'planned' 
                 AND ra.start_date > CURRENT_DATE 
                 AND ra.start_date <= CURRENT_DATE + interval '3 months'
            THEN ra.planned_allocation_percentage
            ELSE 0 END
          ), 0
        ) as future_utilization,
        
        -- Project count
        COUNT(DISTINCT 
          CASE WHEN ra.status IN ('active', 'planned') 
               AND ra.start_date <= CURRENT_DATE + interval '3 months'
               AND (ra.end_date IS NULL OR ra.end_date >= CURRENT_DATE)
          THEN ra.project_id END
        ) as active_projects,
        
        -- Available capacity
        GREATEST(0, 100 - COALESCE(
          SUM(
            CASE WHEN ra.status IN ('active', 'planned') 
                 AND ra.start_date <= CURRENT_DATE 
                 AND (ra.end_date IS NULL OR ra.end_date >= CURRENT_DATE)
            THEN ra.planned_allocation_percentage
            ELSE 0 END
          ), 0
        )) as available_capacity
        
      FROM employees e
      JOIN departments d ON e.department_id = d.id
      LEFT JOIN resource_assignments ra ON e.id = ra.employee_id
      WHERE ${whereConditions.join(' AND ')}
      GROUP BY e.id, e.first_name, e.last_name, e.position, d.name
      ORDER BY current_utilization DESC, d.name, e.last_name
    `;

    const result = await db.query(query, values);

    const utilizationData = result.rows.map((row: any) => ({
      employeeId: row.employee_id,
      employeeName: row.employee_name,
      position: row.position,
      department: row.department,
      currentUtilization: parseFloat(row.current_utilization),
      futureUtilization: parseFloat(row.future_utilization),
      activeProjects: parseInt(row.active_projects),
      availableCapacity: parseFloat(row.available_capacity),
      status: parseFloat(row.current_utilization) > 100 ? 'overallocated' :
              parseFloat(row.current_utilization) > 80 ? 'high_utilization' :
              parseFloat(row.current_utilization) > 50 ? 'optimal' : 'underutilized'
    }));

    // Calculate summary statistics
    const totalEmployees = utilizationData.length;
    const overallocated = utilizationData.filter((e: any) => e.status === 'overallocated').length;
    const underutilized = utilizationData.filter((e: any) => e.status === 'underutilized').length;
    const avgUtilization = utilizationData.reduce((sum: number, e: any) => sum + e.currentUtilization, 0) / totalEmployees || 0;
    const totalCapacity = totalEmployees * 100;
    const usedCapacity = utilizationData.reduce((sum: number, e: any) => sum + e.currentUtilization, 0);

    return res.json({
      success: true,
      data: {
        summary: {
          totalEmployees,
          overallocatedCount: overallocated,
          underutilizedCount: underutilized,
          averageUtilization: Math.round(avgUtilization),
          capacityUtilization: Math.round((usedCapacity / totalCapacity) * 100),
          availableCapacity: Math.round(totalCapacity - usedCapacity)
        },
        employees: utilizationData
      }
    });

  } catch (error: any) {
    console.error('Error in utilization analysis:', error);
    return res.status(500).json({
      error: 'Failed to analyze utilization',
      details: error.message
    });
  }
});

export default router;