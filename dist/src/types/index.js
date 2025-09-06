"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseError = exports.ProficiencyLevel = exports.SkillCategory = void 0;
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
class DatabaseError extends Error {
    code;
    constraint;
    table;
    detail;
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
//# sourceMappingURL=index.js.map