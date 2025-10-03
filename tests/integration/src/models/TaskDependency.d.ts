export const __esModule: boolean;
export const DependencyType: {};
export class TaskDependency {
    static validateNoCycle(predecessorId: any, successorId: any): Promise<boolean>;
    get hasLag(): boolean;
    get hasLead(): boolean;
    get lagDescription(): string;
    get typeDescription(): "Unknown" | "Finish-to-Start (FS)" | "Start-to-Start (SS)" | "Finish-to-Finish (FF)" | "Start-to-Finish (SF)";
    calculateSuccessorConstraint(predecessorStartDate: any, predecessorEndDate: any): Date;
}
//# sourceMappingURL=TaskDependency.d.ts.map