import { Request, Response, NextFunction } from 'express';
export declare class ProjectController {
    private projectService;
    private assignmentService;
    private webSocketService;
    constructor();
    createProject: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getProjects: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getProjectById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    updateProject: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    deleteProject: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    addProjectRole: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getProjectRoles: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    assignEmployeeToProject: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getProjectAssignments: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
//# sourceMappingURL=project.controller.d.ts.map