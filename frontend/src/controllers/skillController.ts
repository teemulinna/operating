import { Request, Response, NextFunction } from 'express';
import { Skill, ApiResponse } from '../types';
import { AppError, catchAsync } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

// Mock data store
let skills: Skill[] = [
  {
    id: '1',
    name: 'JavaScript',
    category: 'Programming',
    description: 'JavaScript programming language',
    level: 'intermediate',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    name: 'React',
    category: 'Frontend',
    description: 'React.js library for building user interfaces',
    level: 'advanced',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '3',
    name: 'Node.js',
    category: 'Backend',
    description: 'Node.js runtime for server-side JavaScript',
    level: 'intermediate',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '4',
    name: 'Python',
    category: 'Programming',
    description: 'Python programming language',
    level: 'advanced',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '5',
    name: 'AWS',
    category: 'Cloud',
    description: 'Amazon Web Services cloud platform',
    level: 'expert',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

export const getAllSkills = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  let filteredSkills = [...skills];

  // Apply filters
  if (req.query.category) {
    filteredSkills = filteredSkills.filter(skill => 
      skill.category.toLowerCase() === (req.query.category as string).toLowerCase()
    );
  }

  if (req.query.level) {
    filteredSkills = filteredSkills.filter(skill => skill.level === req.query.level);
  }

  if (req.query.search) {
    const search = (req.query.search as string).toLowerCase();
    filteredSkills = filteredSkills.filter(skill => 
      skill.name.toLowerCase().includes(search) || 
      skill.description?.toLowerCase().includes(search)
    );
  }

  const total = filteredSkills.length;
  const paginatedSkills = filteredSkills.slice(skip, skip + limit);

  const response: ApiResponse<Skill[]> = {
    success: true,
    data: paginatedSkills,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };

  logger.info('Skills retrieved', { count: paginatedSkills.length, total });
  res.status(200).json(response);
});

export const getSkillById = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const skill = skills.find(s => s.id === id);

  if (!skill) {
    return next(new AppError('Skill not found', 404));
  }

  const response: ApiResponse<Skill> = {
    success: true,
    data: skill
  };

  logger.info('Skill retrieved', { skillId: id });
  res.status(200).json(response);
});

export const createSkill = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  // Check if skill with name already exists
  const existingSkill = skills.find(skill => 
    skill.name.toLowerCase() === req.body.name.toLowerCase()
  );
  if (existingSkill) {
    return next(new AppError('Skill with this name already exists', 400));
  }

  const newSkill: Skill = {
    id: String(skills.length + 1),
    ...req.body,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  skills.push(newSkill);

  const response: ApiResponse<Skill> = {
    success: true,
    data: newSkill,
    message: 'Skill created successfully'
  };

  logger.info('Skill created', { 
    skillId: newSkill.id, 
    name: newSkill.name,
    category: newSkill.category
  });

  res.status(201).json(response);
});

export const updateSkill = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const skillIndex = skills.findIndex(skill => skill.id === id);

  if (skillIndex === -1) {
    return next(new AppError('Skill not found', 404));
  }

  // Check if name is being updated and already exists
  if (req.body.name && req.body.name.toLowerCase() !== skills[skillIndex].name.toLowerCase()) {
    const existingSkill = skills.find(skill => 
      skill.name.toLowerCase() === req.body.name.toLowerCase() && skill.id !== id
    );
    if (existingSkill) {
      return next(new AppError('Skill with this name already exists', 400));
    }
  }

  const updatedSkill: Skill = {
    ...skills[skillIndex],
    ...req.body,
    updatedAt: new Date()
  };

  skills[skillIndex] = updatedSkill;

  const response: ApiResponse<Skill> = {
    success: true,
    data: updatedSkill,
    message: 'Skill updated successfully'
  };

  logger.info('Skill updated', { 
    skillId: id, 
    updatedFields: Object.keys(req.body)
  });

  res.status(200).json(response);
});

export const deleteSkill = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const skillIndex = skills.findIndex(skill => skill.id === id);

  if (skillIndex === -1) {
    return next(new AppError('Skill not found', 404));
  }

  const deletedSkill = skills[skillIndex];
  skills.splice(skillIndex, 1);

  const response: ApiResponse<null> = {
    success: true,
    message: 'Skill deleted successfully'
  };

  logger.info('Skill deleted', { 
    skillId: id,
    name: deletedSkill.name
  });

  res.status(200).json(response);
});

export const getSkillStats = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const stats = {
    total: skills.length,
    byCategory: skills.reduce((acc, skill) => {
      acc[skill.category] = (acc[skill.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    byLevel: skills.reduce((acc, skill) => {
      acc[skill.level] = (acc[skill.level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    categories: [...new Set(skills.map(skill => skill.category))]
  };

  const response: ApiResponse<typeof stats> = {
    success: true,
    data: stats
  };

  logger.info('Skill statistics retrieved');
  res.status(200).json(response);
});

export const getSkillsByCategory = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { category } = req.params;
  const categorySkills = skills.filter(skill => 
    skill.category.toLowerCase() === category.toLowerCase()
  );

  const response: ApiResponse<Skill[]> = {
    success: true,
    data: categorySkills
  };

  logger.info('Skills by category retrieved', { 
    category, 
    count: categorySkills.length 
  });

  res.status(200).json(response);
});