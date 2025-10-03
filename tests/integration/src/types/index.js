"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseError = exports.OverAllocationSeverity = exports.AllocationStatus = exports.RequirementPriority = exports.ProjectPriority = exports.ProjectStatus = exports.ProficiencyLevel = exports.SkillCategory = void 0;
// Enums
var SkillCategory;
(function (SkillCategory) {
    SkillCategory["TECHNICAL"] = "technical";
    SkillCategory["SOFT"] = "soft";
    SkillCategory["LANGUAGE"] = "language";
    SkillCategory["CERTIFICATION"] = "certification";
    SkillCategory["DOMAIN"] = "domain";
})(SkillCategory || (exports.SkillCategory = SkillCategory = {}));
var ProficiencyLevel;
(function (ProficiencyLevel) {
    ProficiencyLevel[ProficiencyLevel["BEGINNER"] = 1] = "BEGINNER";
    ProficiencyLevel[ProficiencyLevel["INTERMEDIATE"] = 2] = "INTERMEDIATE";
    ProficiencyLevel[ProficiencyLevel["ADVANCED"] = 3] = "ADVANCED";
    ProficiencyLevel[ProficiencyLevel["EXPERT"] = 4] = "EXPERT";
    ProficiencyLevel[ProficiencyLevel["MASTER"] = 5] = "MASTER";
})(ProficiencyLevel || (exports.ProficiencyLevel = ProficiencyLevel = {}));
var ProjectStatus;
(function (ProjectStatus) {
    ProjectStatus["PLANNING"] = "planning";
    ProjectStatus["ACTIVE"] = "active";
    ProjectStatus["ON_HOLD"] = "on_hold";
    ProjectStatus["COMPLETED"] = "completed";
    ProjectStatus["CANCELLED"] = "cancelled";
})(ProjectStatus || (exports.ProjectStatus = ProjectStatus = {}));
var ProjectPriority;
(function (ProjectPriority) {
    ProjectPriority["LOW"] = "low";
    ProjectPriority["MEDIUM"] = "medium";
    ProjectPriority["HIGH"] = "high";
    ProjectPriority["CRITICAL"] = "critical";
})(ProjectPriority || (exports.ProjectPriority = ProjectPriority = {}));
var RequirementPriority;
(function (RequirementPriority) {
    RequirementPriority["OPTIONAL"] = "optional";
    RequirementPriority["PREFERRED"] = "preferred";
    RequirementPriority["REQUIRED"] = "required";
    RequirementPriority["CRITICAL"] = "critical";
})(RequirementPriority || (exports.RequirementPriority = RequirementPriority = {}));
// Allocation-specific enums and interfaces
var AllocationStatus;
(function (AllocationStatus) {
    AllocationStatus["TENTATIVE"] = "tentative";
    AllocationStatus["CONFIRMED"] = "confirmed";
    AllocationStatus["COMPLETED"] = "completed";
    AllocationStatus["CANCELLED"] = "cancelled";
})(AllocationStatus || (exports.AllocationStatus = AllocationStatus = {}));
// Over-allocation Warning Types
var OverAllocationSeverity;
(function (OverAllocationSeverity) {
    OverAllocationSeverity["LOW"] = "low";
    OverAllocationSeverity["MEDIUM"] = "medium";
    OverAllocationSeverity["HIGH"] = "high";
    OverAllocationSeverity["CRITICAL"] = "critical";
})(OverAllocationSeverity || (exports.OverAllocationSeverity = OverAllocationSeverity = {}));
class DatabaseError extends Error {
    constructor(message, code) {
        super(message);
        this.name = 'DatabaseError';
        if (code !== undefined) {
            this.code = code;
        }
        // Maintains proper stack trace for where our error was thrown (only available on V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, DatabaseError);
        }
    }
}
exports.DatabaseError = DatabaseError;
