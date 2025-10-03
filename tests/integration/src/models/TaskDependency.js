"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskDependency = exports.DependencyType = void 0;
const database_service_1 = require("../database/database.service");
var DependencyType;
(function (DependencyType) {
    DependencyType["FINISH_TO_START"] = "FS";
    DependencyType["START_TO_START"] = "SS";
    DependencyType["FINISH_TO_FINISH"] = "FF";
    DependencyType["START_TO_FINISH"] = "SF"; // Task B cannot finish until Task A starts
})(DependencyType || (exports.DependencyType = DependencyType = {}));
class TaskDependency {
    // Associations are handled via service layer
    // Helper methods
    get hasLag() {
        return this.lagTime > 0;
    }
    get hasLead() {
        return this.lagTime < 0;
    }
    get lagDescription() {
        if (this.lagTime === 0)
            return 'No lag/lead time';
        if (this.lagTime > 0)
            return `${this.lagTime} day(s) lag`;
        return `${Math.abs(this.lagTime)} day(s) lead`;
    }
    get typeDescription() {
        switch (this.dependencyType) {
            case DependencyType.FINISH_TO_START:
                return 'Finish-to-Start (FS)';
            case DependencyType.START_TO_START:
                return 'Start-to-Start (SS)';
            case DependencyType.FINISH_TO_FINISH:
                return 'Finish-to-Finish (FF)';
            case DependencyType.START_TO_FINISH:
                return 'Start-to-Finish (SF)';
            default:
                return 'Unknown';
        }
    }
    /**
     * Calculate the earliest possible date for the successor task
     * based on the predecessor task and dependency type
     */
    calculateSuccessorConstraint(predecessorStartDate, predecessorEndDate) {
        let constraintDate;
        switch (this.dependencyType) {
            case DependencyType.FINISH_TO_START:
                constraintDate = new Date(predecessorEndDate);
                break;
            case DependencyType.START_TO_START:
                constraintDate = new Date(predecessorStartDate);
                break;
            case DependencyType.FINISH_TO_FINISH:
                constraintDate = new Date(predecessorEndDate);
                break;
            case DependencyType.START_TO_FINISH:
                constraintDate = new Date(predecessorStartDate);
                break;
            default:
                constraintDate = new Date(predecessorEndDate);
        }
        // Apply lag/lead time
        if (this.lagTime !== 0) {
            constraintDate.setDate(constraintDate.getDate() + this.lagTime);
        }
        return constraintDate;
    }
    /**
     * Validate that this dependency doesn't create a circular reference
     */
    static async validateNoCycle(predecessorId, successorId) {
        if (predecessorId === successorId) {
            return false; // Direct self-dependency
        }
        // Check for cycles using breadth-first search
        const db = database_service_1.DatabaseService.getInstance();
        const visited = new Set();
        const queue = [successorId];
        while (queue.length > 0) {
            const currentTaskId = queue.shift();
            if (visited.has(currentTaskId)) {
                continue;
            }
            visited.add(currentTaskId);
            // If we reach the predecessor, we have a cycle
            if (currentTaskId === predecessorId) {
                return false;
            }
            // Get all successors of the current task
            const query = `
        SELECT successor_id FROM task_dependencies 
        WHERE predecessor_id = $1 AND is_active = true
      `;
            const result = await db.query(query, [currentTaskId]);
            for (const row of result.rows) {
                if (!visited.has(row.successor_id)) {
                    queue.push(row.successor_id);
                }
            }
        }
        return true; // No cycle detected
    }
}
exports.TaskDependency = TaskDependency;
// Note: Database operations handled via service layer using PostgreSQL pool
// TaskDependency model initialization is managed through database migrations
