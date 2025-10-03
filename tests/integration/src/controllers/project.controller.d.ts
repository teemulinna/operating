export const __esModule: boolean;
export class ProjectController {
    createProject: (req: any, res: any, next: any) => Promise<void>;
    getProjects: (req: any, res: any, next: any) => Promise<void>;
    getProjectById: (req: any, res: any, next: any) => Promise<void>;
    updateProject: (req: any, res: any, next: any) => Promise<void>;
    deleteProject: (req: any, res: any, next: any) => Promise<void>;
    addProjectRole: (req: any, res: any, next: any) => Promise<void>;
    getProjectRoles: (req: any, res: any, next: any) => Promise<void>;
    assignEmployeeToProject: (req: any, res: any, next: any) => Promise<void>;
    getProjectAssignments: (req: any, res: any, next: any) => Promise<void>;
    projectService: project_service_1.ProjectService;
    assignmentService: resource_assignment_service_1.ResourceAssignmentService;
    webSocketService: any;
}
import project_service_1 = require("../services/project.service");
import resource_assignment_service_1 = require("../services/resource-assignment.service");
//# sourceMappingURL=project.controller.d.ts.map