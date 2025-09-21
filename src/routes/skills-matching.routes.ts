import { Router } from 'express';
import { DatabaseService } from '../database/database.service';

const router = Router();
const db = DatabaseService.getInstance();

// Simple skills matching endpoint
router.post('/find-matches', async (req, res) => {
  try {
    await db.connect();

    const { skillIds, projectId, experienceLevel } = req.body;

    if (!skillIds || !Array.isArray(skillIds) || skillIds.length === 0) {
      return res.status(400).json({ error: 'skillIds array is required' });
    }

    // Simple query to find employees with matching skills
    const query = `
      SELECT DISTINCT
        e.id as employee_id,
        e.first_name || ' ' || e.last_name as employee_name,
        e.email,
        e.position,
        d.name as department,

        -- Calculate skill match score
        (
          SELECT COUNT(DISTINCT es.skill_id) * 100.0 / $2
          FROM employee_skills es
          WHERE es.employee_id = e.id
            AND es.skill_id::text = ANY($1::text[])
            AND es.is_active = true
        ) as skill_match_score,

        -- Get current utilization
        COALESCE(
          (SELECT SUM(ra.planned_allocation_percentage)
           FROM resource_assignments ra
           WHERE ra.employee_id = e.id
             AND ra.status = 'active'
             AND ra.start_date <= CURRENT_DATE
             AND (ra.end_date IS NULL OR ra.end_date >= CURRENT_DATE)
          ), 0
        ) as current_utilization,

        -- Get skills array
        ARRAY(
          SELECT s.name
          FROM employee_skills es
          JOIN skills s ON es.skill_id = s.id
          WHERE es.employee_id = e.id AND es.is_active = true
        ) as skills

      FROM employees e
      JOIN departments d ON e.department_id = d.id
      WHERE e.is_active = true
        AND EXISTS (
          SELECT 1 FROM employee_skills es
          WHERE es.employee_id = e.id
            AND es.skill_id::text = ANY($1::text[])
            AND es.is_active = true
        )
      ORDER BY skill_match_score DESC, current_utilization ASC
      LIMIT 20
    `;

    const result = await db.query(query, [skillIds, skillIds.length]);

    const matches = result.rows.map(row => ({
      employeeId: row.employee_id,
      employeeName: row.employee_name,
      email: row.email,
      department: row.department,
      position: row.position,
      overallMatchScore: Math.round(parseFloat(row.skill_match_score || '0')),
      confidenceLevel: Math.min(100, Math.round(parseFloat(row.skill_match_score || '0') * 1.2)),
      currentUtilization: parseFloat(row.current_utilization || '0'),
      availableCapacity: Math.max(0, 100 - parseFloat(row.current_utilization || '0')),
      skills: row.skills || [],
      riskLevel: parseFloat(row.current_utilization || '0') > 80 ? 'high' : 'low'
    }));

    return res.json({
      success: true,
      data: matches,
      totalCount: matches.length,
      searchCriteria: {
        skillIds,
        projectId,
        experienceLevel
      }
    });

  } catch (error) {
    console.error('Error in skills matching:', error);
    return res.status(500).json({
      error: 'Failed to find skill matches',
      details: (error as Error).message
    });
  }
});

// Get available skills
router.get('/skills', async (req, res) => {
  try {
    await db.connect();
    
    const query = `
      SELECT 
        s.id,
        s.name,
        s.category,
        s.description,
        COUNT(es.employee_id) as employee_count
      FROM skills s
      LEFT JOIN employee_skills es ON s.id = es.skill_id AND es.is_active = true
      WHERE s.is_active = true
      GROUP BY s.id, s.name, s.category, s.description
      ORDER BY s.category, s.name
    `;

    const result = await db.query(query);
    
    const skillsByCategory = result.rows.reduce((acc: Record<string, any[]>, skill: any) => {
      const category = skill.category || 'Other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push({
        id: skill.id,
        name: skill.name,
        description: skill.description,
        employeeCount: parseInt(skill.employee_count || '0')
      });
      return acc;
    }, {} as Record<string, any[]>);

    return res.json({
      success: true,
      data: skillsByCategory,
      totalSkills: result.rows.length
    });

  } catch (error) {
    console.error('Error fetching skills:', error);
    return res.status(500).json({
      error: 'Failed to fetch skills',
      details: (error as Error).message
    });
  }
});

// Get employee skill profile
router.get('/employee/:employeeId/skills', async (req, res) => {
  try {
    await db.connect();

    const { employeeId } = req.params;

    const query = `
      SELECT
        e.first_name || ' ' || e.last_name as employee_name,
        e.position,
        d.name as department,
        ARRAY_AGG(
          JSON_BUILD_OBJECT(
            'skillId', s.id,
            'skillName', s.name,
            'category', s.category,
            'proficiencyLevel', es.proficiency_level,
            'yearsOfExperience', es.years_of_experience,
            'lastAssessed', es.last_assessed
          )
        ) as skills
      FROM employees e
      JOIN departments d ON e.department_id = d.id
      LEFT JOIN employee_skills es ON e.id = es.employee_id AND es.is_active = true
      LEFT JOIN skills s ON es.skill_id = s.id AND s.is_active = true
      WHERE e.id = $1 AND e.is_active = true
      GROUP BY e.id, e.first_name, e.last_name, e.position, d.name
    `;

    const result = await db.query(query, [employeeId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const employee = result.rows[0];

    return res.json({
      success: true,
      data: {
        employeeName: employee.employee_name,
        position: employee.position,
        department: employee.department,
        skills: employee.skills.filter((skill: any) => skill.skillId !== null) || []
      }
    });

  } catch (error) {
    console.error('Error fetching employee skills:', error);
    return res.status(500).json({
      error: 'Failed to fetch employee skills',
      details: (error as Error).message
    });
  }
});

export default router;