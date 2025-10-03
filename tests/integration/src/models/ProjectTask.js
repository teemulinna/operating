"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectTask = exports.TaskPriority = exports.TaskStatus = exports.TaskType = void 0;
var TaskType;
(function (TaskType) {
    TaskType["TASK"] = "task";
    TaskType["MILESTONE"] = "milestone";
    TaskType["PHASE"] = "phase";
})(TaskType || (exports.TaskType = TaskType = {}));
var TaskStatus;
(function (TaskStatus) {
    TaskStatus["NOT_STARTED"] = "not_started";
    TaskStatus["IN_PROGRESS"] = "in_progress";
    TaskStatus["COMPLETED"] = "completed";
    TaskStatus["ON_HOLD"] = "on_hold";
    TaskStatus["CANCELLED"] = "cancelled";
})(TaskStatus || (exports.TaskStatus = TaskStatus = {}));
var TaskPriority;
(function (TaskPriority) {
    TaskPriority["LOW"] = "low";
    TaskPriority["MEDIUM"] = "medium";
    TaskPriority["HIGH"] = "high";
    TaskPriority["CRITICAL"] = "critical";
})(TaskPriority || (exports.TaskPriority = TaskPriority = {}));
class ProjectTask {
    // Relationships handled via service layer
    // Helper methods
    get isOverdue() {
        if (!this.endDate || this.status === TaskStatus.COMPLETED)
            return false;
        return new Date() > this.endDate;
    }
    get daysRemaining() {
        if (!this.endDate || this.status === TaskStatus.COMPLETED)
            return null;
        const today = new Date();
        const timeDiff = this.endDate.getTime() - today.getTime();
        return Math.ceil(timeDiff / (1000 * 3600 * 24));
    }
    get progressStatus() {
        if (this.status === TaskStatus.COMPLETED)
            return 'on_track';
        const today = new Date();
        if (!this.startDate || !this.endDate)
            return 'on_track';
        const totalDuration = this.endDate.getTime() - this.startDate.getTime();
        const elapsed = today.getTime() - this.startDate.getTime();
        const expectedProgress = Math.min(100, (elapsed / totalDuration) * 100);
        if (this.progress >= expectedProgress)
            return 'on_track';
        if (this.progress >= expectedProgress * 0.8)
            return 'at_risk';
        return 'behind';
    }
    calculateResourceRequirements() {
        try {
            return this.resourceRequirements ? JSON.parse(this.resourceRequirements) : {};
        }
        catch {
            return {};
        }
    }
    setResourceRequirements(requirements) {
        this.resourceRequirements = JSON.stringify(requirements);
    }
}
exports.ProjectTask = ProjectTask;
// Note: Database operations handled via service layer using PostgreSQL pool
