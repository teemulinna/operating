import { Router, Request, Response } from 'express';
import { DatabaseService } from '../database/database.service';
import { asyncHandler } from '../middleware/async-handler';

const router = Router();
const db = DatabaseService.getInstance();

// GET /api/working-allocations - Get all allocations
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  await db.connect();
  
  const query = `
    SELECT 
      ra.id,
      ra.employee_id,
      ra.project_id,
      e.first_name || ' ' || e.last_name as employee_name,
      p.name as project_name,
      ra.planned_allocation_percentage,
      ra.actual_allocation_percentage,
      ra.planned_hours_per_week,
      ra.start_date,
      ra.end_date,
      ra.status,
      ra.notes,
      ra.created_at,
      ra.updated_at
    FROM resource_assignments ra
    JOIN employees e ON ra.employee_id = e.id
    JOIN projects p ON ra.project_id = p.id
    ORDER BY ra.created_at DESC
  `;

  const result = await db.query(query);
  
  const allocations = result.rows.map(row => ({
    id: row.id,
    employeeId: row.employee_id,
    projectId: row.project_id,
    employeeName: row.employee_name,
    projectName: row.project_name,
    allocatedPercentage: parseFloat(row.planned_allocation_percentage),
    actualPercentage: row.actual_allocation_percentage ? parseFloat(row.actual_allocation_percentage) : null,
    plannedHoursPerWeek: parseFloat(row.planned_hours_per_week),
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));

  res.json({
    success: true,
    data: allocations,
    total: allocations.length
  });
}));

// GET /api/working-allocations/employee/:employeeId - Get allocations by employee
router.get('/employee/:employeeId', asyncHandler(async (req: Request, res: Response) => {
  await db.connect();
  const { employeeId } = req.params;
  
  const query = `
    SELECT 
      ra.id,
      ra.project_id,
      p.name as project_name,
      ra.planned_allocation_percentage,
      ra.actual_allocation_percentage,
      ra.planned_hours_per_week,
      ra.start_date,
      ra.end_date,
      ra.status,
      ra.notes
    FROM resource_assignments ra
    JOIN projects p ON ra.project_id = p.id
    WHERE ra.employee_id = $1
    ORDER BY ra.start_date DESC
  `;

  const result = await db.query(query, [employeeId]);
  
  const allocations = result.rows.map(row => ({
    id: row.id,
    projectId: row.project_id,
    projectName: row.project_name,
    allocatedPercentage: parseFloat(row.planned_allocation_percentage),
    actualPercentage: row.actual_allocation_percentage ? parseFloat(row.actual_allocation_percentage) : null,
    plannedHoursPerWeek: parseFloat(row.planned_hours_per_week),
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
    notes: row.notes
  }));

  res.json({
    success: true,
    data: allocations,
    total: allocations.length
  });
}));

// GET /api/working-allocations/project/:projectId - Get allocations by project
router.get('/project/:projectId', asyncHandler(async (req: Request, res: Response) => {
  await db.connect();
  const { projectId } = req.params;
  
  const query = `
    SELECT 
      ra.id,
      ra.employee_id,
      e.first_name || ' ' || e.last_name as employee_name,
      e.position,
      ra.planned_allocation_percentage,
      ra.actual_allocation_percentage,
      ra.planned_hours_per_week,
      ra.start_date,
      ra.end_date,
      ra.status,
      ra.notes
    FROM resource_assignments ra
    JOIN employees e ON ra.employee_id = e.id
    WHERE ra.project_id = $1
    ORDER BY ra.planned_allocation_percentage DESC
  `;

  const result = await db.query(query, [parseInt(projectId)]);
  
  const allocations = result.rows.map(row => ({
    id: row.id,
    employeeId: row.employee_id,
    employeeName: row.employee_name,
    position: row.position,
    allocatedPercentage: parseFloat(row.planned_allocation_percentage),
    actualPercentage: row.actual_allocation_percentage ? parseFloat(row.actual_allocation_percentage) : null,
    plannedHoursPerWeek: parseFloat(row.planned_hours_per_week),
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
    notes: row.notes
  }));

  res.json({
    success: true,
    data: allocations,
    total: allocations.length
  });
}));

// GET /api/working-allocations/conflicts - Detect allocation conflicts
router.get('/conflicts', asyncHandler(async (req: Request, res: Response) => {
  await db.connect();
  
  // Find conflicts by checking employees with overlapping assignments over 100%
  const query = `
    WITH overlapping_assignments AS (
      SELECT 
        ra1.employee_id,
        e.first_name || ' ' || e.last_name as employee_name,
        ra1.id as assignment1_id,
        ra2.id as assignment2_id,
        p1.name as project1_name,
        p2.name as project2_name,
        ra1.planned_allocation_percentage as allocation1,
        ra2.planned_allocation_percentage as allocation2,
        GREATEST(ra1.start_date, ra2.start_date) as overlap_start,
        LEAST(ra1.end_date, ra2.end_date) as overlap_end
      FROM resource_assignments ra1
      JOIN resource_assignments ra2 ON ra1.employee_id = ra2.employee_id 
        AND ra1.id != ra2.id
        AND ra1.status = 'active' 
        AND ra2.status = 'active'
        AND ra1.start_date <= ra2.end_date 
        AND ra1.end_date >= ra2.start_date
      JOIN employees e ON ra1.employee_id = e.id
      JOIN projects p1 ON ra1.project_id = p1.id
      JOIN projects p2 ON ra2.project_id = p2.id
    ),
    conflict_summary AS (
      SELECT 
        employee_id,
        employee_name,
        COUNT(*) as conflict_pairs,
        SUM(allocation1 + allocation2) / COUNT(*) as avg_total_allocation,
        array_agg(DISTINCT project1_name || ' (' || allocation1 || '%)') as conflicting_projects
      FROM overlapping_assignments
      GROUP BY employee_id, employee_name
      HAVING SUM(allocation1 + allocation2) / COUNT(*) > 100
    )
    SELECT * FROM conflict_summary
    ORDER BY avg_total_allocation DESC
  `;

  const result = await db.query(query);
  
  const conflicts = result.rows.map(row => ({
    employeeId: row.employee_id,
    employeeName: row.employee_name,
    conflictPairs: parseInt(row.conflict_pairs),
    averageTotalAllocation: parseFloat(row.avg_total_allocation),
    conflictingProjects: row.conflicting_projects,
    severity: parseFloat(row.avg_total_allocation) > 150 ? 'high' : 
             parseFloat(row.avg_total_allocation) > 120 ? 'medium' : 'low'
  }));

  res.json({
    success: true,
    data: conflicts,
    total: conflicts.length,
    hasConflicts: conflicts.length > 0
  });
}));

// GET /api/working-allocations/capacity - Get capacity utilization summary
router.get('/capacity', asyncHandler(async (req: Request, res: Response) => {
  await db.connect();
  
  const query = `
    SELECT 
      e.id as employee_id,
      e.first_name || ' ' || e.last_name as employee_name,
      e.position,
      COALESCE(SUM(ra.planned_allocation_percentage), 0) as total_allocation_percentage,
      COALESCE(SUM(ra.planned_hours_per_week), 0) as total_planned_hours,
      COUNT(ra.id) as active_assignments,
      CASE 
        WHEN COALESCE(SUM(ra.planned_allocation_percentage), 0) > 100 THEN 'over-allocated'
        WHEN COALESCE(SUM(ra.planned_allocation_percentage), 0) = 100 THEN 'fully-allocated'
        WHEN COALESCE(SUM(ra.planned_allocation_percentage), 0) >= 80 THEN 'highly-utilized'
        WHEN COALESCE(SUM(ra.planned_allocation_percentage), 0) > 0 THEN 'under-utilized'
        ELSE 'available'
      END as capacity_status
    FROM employees e
    LEFT JOIN resource_assignments ra ON e.id = ra.employee_id 
      AND ra.status = 'active'
      AND ra.start_date <= CURRENT_DATE 
      AND ra.end_date >= CURRENT_DATE
    WHERE e.is_active = true
    GROUP BY e.id, e.first_name, e.last_name, e.position
    ORDER BY total_allocation_percentage DESC
  `;

  const result = await db.query(query);
  
  const capacities = result.rows.map(row => ({
    employeeId: row.employee_id,
    employeeName: row.employee_name,
    position: row.position,
    totalAllocationPercentage: parseFloat(row.total_allocation_percentage),
    totalPlannedHours: parseFloat(row.total_planned_hours),
    activeAssignments: parseInt(row.active_assignments),
    capacityStatus: row.capacity_status,
    availableCapacity: Math.max(0, 100 - parseFloat(row.total_allocation_percentage))
  }));

  // Summary statistics
  const summary = {
    totalEmployees: capacities.length,
    overAllocated: capacities.filter(c => c.capacityStatus === 'over-allocated').length,
    fullyAllocated: capacities.filter(c => c.capacityStatus === 'fully-allocated').length,
    highlyUtilized: capacities.filter(c => c.capacityStatus === 'highly-utilized').length,
    underUtilized: capacities.filter(c => c.capacityStatus === 'under-utilized').length,
    available: capacities.filter(c => c.capacityStatus === 'available').length,
    averageUtilization: capacities.reduce((sum, c) => sum + c.totalAllocationPercentage, 0) / capacities.length
  };

  res.json({
    success: true,
    data: capacities,
    summary: summary,
    total: capacities.length
  });
}));

// POST /api/working-allocations - Create new allocation
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  await db.connect();
  
  const { 
    employeeId, 
    projectId, 
    allocationPercentage, 
    startDate, 
    endDate, 
    notes 
  } = req.body;

  // Validation
  if (!employeeId || !projectId || !allocationPercentage || !startDate || !endDate) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: employeeId, projectId, allocationPercentage, startDate, endDate'
    });
  }

  if (allocationPercentage <= 0 || allocationPercentage > 100) {
    return res.status(400).json({
      success: false,
      message: 'Allocation percentage must be between 0 and 100'
    });
  }

  // Check for conflicts
  const conflictQuery = `
    SELECT COUNT(*) as conflict_count,
           COALESCE(SUM(planned_allocation_percentage), 0) as total_allocation
    FROM resource_assignments
    WHERE employee_id = $1 
      AND status = 'active'
      AND ((start_date <= $2 AND end_date >= $2) 
           OR (start_date <= $3 AND end_date >= $3) 
           OR (start_date >= $2 AND end_date <= $3))
  `;

  const conflictResult = await db.query(conflictQuery, [employeeId, startDate, endDate]);
  const totalExistingAllocation = parseFloat(conflictResult.rows[0].total_allocation);
  const newTotalAllocation = totalExistingAllocation + allocationPercentage;

  if (newTotalAllocation > 100) {
    return res.status(409).json({
      success: false,
      message: `Allocation conflict: Total allocation would be ${newTotalAllocation.toFixed(1)}% (over 100%)`,
      currentAllocation: totalExistingAllocation,
      requestedAllocation: allocationPercentage,
      totalAllocation: newTotalAllocation
    });
  }

  // Create the allocation
  const insertQuery = `
    INSERT INTO resource_assignments (
      employee_id, 
      project_id, 
      start_date, 
      end_date, 
      planned_allocation_percentage, 
      status, 
      notes
    )
    VALUES ($1, $2, $3, $4, $5, 'active', $6)
    RETURNING *
  `;

  const result = await db.query(insertQuery, [
    employeeId,
    parseInt(projectId),
    startDate,
    endDate,
    allocationPercentage,
    notes || null
  ]);

  return res.status(201).json({
    success: true,
    message: 'Allocation created successfully',
    data: {
      id: result.rows[0].id,
      employeeId: result.rows[0].employee_id,
      projectId: result.rows[0].project_id,
      allocationPercentage: parseFloat(result.rows[0].planned_allocation_percentage),
      startDate: result.rows[0].start_date,
      endDate: result.rows[0].end_date,
      status: result.rows[0].status,
      notes: result.rows[0].notes
    }
  });
}));

export default router;