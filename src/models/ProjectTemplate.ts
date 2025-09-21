import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { EmployeeModel } from './Employee';
import { Employee } from '../types';

export interface DefaultTask {
  id: string;
  name: string;
  description: string;
  duration: number; // in days
  dependencies: string[];
  requiredSkills: string[];
  estimatedHours: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface DefaultMilestone {
  id: string;
  name: string;
  description: string;
  daysFromStart: number;
  criteria: string[];
  deliverables: string[];
}

export interface RequiredSkill {
  skillId: string;
  skillName: string;
  level: 'junior' | 'mid' | 'senior' | 'expert';
  quantity: number;
}

export interface TemplateMetadata {
  industry: string;
  complexity: 'simple' | 'moderate' | 'complex' | 'enterprise';
  methodology: 'agile' | 'waterfall' | 'hybrid' | 'lean';
  tags: string[];
  estimatedSuccessRate: number;
  averageCompletionTime: number;
}

@Entity('project_templates')
export class ProjectTemplate {
  @PrimaryGeneratedColumn('uuid')
  templateId!: string;

  @Column({ length: 255 })
  name!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ length: 100 })
  category!: string;

  @Column({ type: 'json' })
  defaultTasks!: DefaultTask[];

  @Column({ type: 'json' })
  defaultMilestones!: DefaultMilestone[];

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  defaultBudget?: number;

  @Column({ type: 'int', nullable: true })
  defaultDuration?: number; // in days

  @Column({ type: 'json' })
  requiredSkills!: RequiredSkill[];

  @Column({ type: 'int', default: 1 })
  defaultTeamSize!: number;

  @Column({ type: 'json', nullable: true })
  metadata?: TemplateMetadata;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ default: false })
  isBuiltIn!: boolean;

  @Column({ default: false })
  isPublic!: boolean;

  @Column({ type: 'int', default: 1 })
  version!: number;

  @Column({ type: 'uuid', nullable: true })
  createdById?: string;

  @ManyToOne(() => EmployeeModel, { nullable: true })
  @JoinColumn({ name: 'createdById' })
  createdBy?: Employee;

  @Column({ type: 'int', default: 0 })
  usageCount!: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  averageRating!: number;

  @Column({ type: 'json', nullable: true })
  customFields?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Helper methods
  clone(): Partial<ProjectTemplate> {
    return {
      name: `${this.name} (Copy)`,
      description: this.description,
      category: this.category,
      defaultTasks: [...this.defaultTasks],
      defaultMilestones: [...this.defaultMilestones],
      defaultBudget: this.defaultBudget,
      defaultDuration: this.defaultDuration,
      requiredSkills: [...this.requiredSkills],
      defaultTeamSize: this.defaultTeamSize,
      metadata: this.metadata ? { ...this.metadata } : undefined,
      customFields: this.customFields ? { ...this.customFields } : undefined,
      isBuiltIn: false,
      isPublic: false,
      version: 1,
      usageCount: 0,
      averageRating: 0
    };
  }

  getEstimatedProjectDuration(): number {
    if (this.defaultDuration) return this.defaultDuration;
    
    // Calculate from tasks if no explicit duration
    const maxTaskEnd = this.defaultTasks.reduce((max, task) => {
      const taskEnd = task.duration + Math.max(...task.dependencies.map(dep => 
        this.defaultTasks.find(t => t.id === dep)?.duration || 0
      ), 0);
      return Math.max(max, taskEnd);
    }, 0);

    return maxTaskEnd || 30; // Default to 30 days
  }

  getEstimatedBudget(hourlyRate = 100): number {
    if (this.defaultBudget) return this.defaultBudget;
    
    // Calculate from tasks
    const totalHours = this.defaultTasks.reduce((sum, task) => sum + task.estimatedHours, 0);
    return totalHours * hourlyRate;
  }

  validateTemplate(): string[] {
    const errors: string[] = [];

    if (!this.name?.trim()) errors.push('Template name is required');
    if (!this.description?.trim()) errors.push('Template description is required');
    if (!this.category?.trim()) errors.push('Template category is required');
    if (!this.defaultTasks?.length) errors.push('At least one default task is required');
    if (this.defaultTeamSize < 1) errors.push('Default team size must be at least 1');

    // Validate tasks
    this.defaultTasks?.forEach((task, index) => {
      if (!task.name?.trim()) errors.push(`Task ${index + 1}: name is required`);
      if (task.duration < 0) errors.push(`Task ${index + 1}: duration must be positive`);
      if (task.estimatedHours < 0) errors.push(`Task ${index + 1}: estimated hours must be positive`);
    });

    // Validate milestones
    this.defaultMilestones?.forEach((milestone, index) => {
      if (!milestone.name?.trim()) errors.push(`Milestone ${index + 1}: name is required`);
      if (milestone.daysFromStart < 0) errors.push(`Milestone ${index + 1}: days from start must be positive`);
    });

    return errors;
  }
}