export interface Employee {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    departmentId: string;
    position: string;
    hireDate: Date;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface Department {
    id: string;
    name: string;
    description?: string;
    managerId?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface Skill {
    id: string;
    name: string;
    description?: string;
    category: SkillCategory;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface EmployeeSkill {
    id: string;
    employeeId: string;
    skillId: string;
    proficiencyLevel: ProficiencyLevel;
    yearsOfExperience: number;
    lastAssessed?: Date;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface CapacityHistory {
    id: string;
    employeeId: string;
    date: Date;
    availableHours: number;
    allocatedHours: number;
    utilizationRate: number;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare enum SkillCategory {
    TECHNICAL = "technical",
    SOFT = "soft",
    LANGUAGE = "language",
    CERTIFICATION = "certification",
    DOMAIN = "domain"
}
export declare enum ProficiencyLevel {
    BEGINNER = 1,
    INTERMEDIATE = 2,
    ADVANCED = 3,
    EXPERT = 4,
    MASTER = 5
}
export interface CreateEmployeeInput {
    firstName: string;
    lastName: string;
    email: string;
    departmentId: string;
    position: string;
    hireDate: Date;
}
export interface UpdateEmployeeInput {
    firstName?: string;
    lastName?: string;
    email?: string;
    departmentId?: string;
    position?: string;
    isActive?: boolean;
}
export interface CreateDepartmentInput {
    name: string;
    description?: string;
    managerId?: string;
}
export interface UpdateDepartmentInput {
    name?: string;
    description?: string;
    managerId?: string;
    isActive?: boolean;
}
export interface CreateSkillInput {
    name: string;
    description?: string;
    category: SkillCategory;
}
export interface UpdateSkillInput {
    name?: string;
    description?: string;
    category?: SkillCategory;
    isActive?: boolean;
}
export interface CreateEmployeeSkillInput {
    employeeId: string;
    skillId: string;
    proficiencyLevel: ProficiencyLevel;
    yearsOfExperience: number;
    lastAssessed?: Date;
}
export interface UpdateEmployeeSkillInput {
    proficiencyLevel?: ProficiencyLevel;
    yearsOfExperience?: number;
    lastAssessed?: Date;
    isActive?: boolean;
}
export interface CreateCapacityHistoryInput {
    employeeId: string;
    date: Date;
    availableHours: number;
    allocatedHours: number;
    notes?: string;
}
export interface UpdateCapacityHistoryInput {
    availableHours?: number;
    allocatedHours?: number;
    notes?: string;
}
export interface EmployeeFilters {
    departmentId?: string;
    position?: string;
    isActive?: boolean;
    skillIds?: string[];
    minProficiencyLevel?: ProficiencyLevel;
}
export interface SkillFilters {
    category?: SkillCategory;
    isActive?: boolean;
}
export interface CapacityFilters {
    employeeId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    minUtilizationRate?: number;
    maxUtilizationRate?: number;
}
export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
export interface EmployeeWithSkills extends Employee {
    skills: Array<EmployeeSkill & {
        skill: Skill;
    }>;
    department: Department;
}
export interface DepartmentWithEmployees extends Department {
    employees: Employee[];
    manager?: Employee;
}
export interface DatabaseConfig {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    ssl?: boolean;
    poolSize?: number;
    idleTimeoutMillis?: number;
    connectionTimeoutMillis?: number;
}
export interface ValidationError {
    field: string;
    message: string;
    value: any;
}
export declare class DatabaseError extends Error {
    code?: string;
    constraint?: string;
    table?: string;
    detail?: string;
    constructor(message: string, code?: string);
}
//# sourceMappingURL=index.d.ts.map