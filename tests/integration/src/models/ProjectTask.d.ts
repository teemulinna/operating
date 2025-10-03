export const __esModule: boolean;
export const TaskType: {};
export const TaskStatus: {};
export const TaskPriority: {};
export class ProjectTask {
    get isOverdue(): boolean;
    get daysRemaining(): number | null;
    get progressStatus(): "at_risk" | "on_track" | "behind";
    calculateResourceRequirements(): any;
    setResourceRequirements(requirements: any): void;
    resourceRequirements: string | undefined;
}
//# sourceMappingURL=ProjectTask.d.ts.map