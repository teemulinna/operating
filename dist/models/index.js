"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkillRequirementModel = exports.ResourceAllocationModel = exports.ProjectModel = exports.CapacityHistoryModel = exports.EmployeeSkillModel = exports.EmployeeModel = exports.SkillModel = exports.DepartmentModel = void 0;
exports.initializeModels = initializeModels;
const Department_1 = require("./Department");
Object.defineProperty(exports, "DepartmentModel", { enumerable: true, get: function () { return Department_1.DepartmentModel; } });
const Skill_1 = require("./Skill");
Object.defineProperty(exports, "SkillModel", { enumerable: true, get: function () { return Skill_1.SkillModel; } });
const Employee_1 = require("./Employee");
Object.defineProperty(exports, "EmployeeModel", { enumerable: true, get: function () { return Employee_1.EmployeeModel; } });
const EmployeeSkill_1 = require("./EmployeeSkill");
Object.defineProperty(exports, "EmployeeSkillModel", { enumerable: true, get: function () { return EmployeeSkill_1.EmployeeSkillModel; } });
const CapacityHistory_1 = require("./CapacityHistory");
Object.defineProperty(exports, "CapacityHistoryModel", { enumerable: true, get: function () { return CapacityHistory_1.CapacityHistoryModel; } });
const project_model_1 = require("./project.model");
Object.defineProperty(exports, "ProjectModel", { enumerable: true, get: function () { return project_model_1.ProjectModel; } });
const ResourceAllocation_1 = require("./ResourceAllocation");
Object.defineProperty(exports, "ResourceAllocationModel", { enumerable: true, get: function () { return ResourceAllocation_1.ResourceAllocationModel; } });
const SkillRequirement_1 = require("./SkillRequirement");
Object.defineProperty(exports, "SkillRequirementModel", { enumerable: true, get: function () { return SkillRequirement_1.SkillRequirementModel; } });
function initializeModels(pool) {
    Department_1.DepartmentModel.initialize(pool);
    Skill_1.SkillModel.initialize(pool);
    Employee_1.EmployeeModel.initialize(pool);
    EmployeeSkill_1.EmployeeSkillModel.initialize(pool);
    CapacityHistory_1.CapacityHistoryModel.initialize(pool);
    project_model_1.ProjectModel.initialize(pool);
    ResourceAllocation_1.ResourceAllocationModel.initialize(pool);
    SkillRequirement_1.SkillRequirementModel.initialize(pool);
}
__exportStar(require("../types"), exports);
//# sourceMappingURL=index.js.map