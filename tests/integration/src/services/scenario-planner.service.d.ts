export const __esModule: boolean;
export const ScenarioType: zod_1.ZodEnum<["project", "resource", "capacity", "mixed"]>;
export const ScenarioStatus: zod_1.ZodEnum<["draft", "active", "archived", "applied"]>;
export const ImpactLevel: zod_1.ZodEnum<["low", "medium", "high", "critical"]>;
export const ScenarioSchema: zod_1.ZodObject<{
    id: zod_1.ZodOptional<zod_1.ZodString>;
    name: zod_1.ZodString;
    description: zod_1.ZodOptional<zod_1.ZodString>;
    type: zod_1.ZodEnum<["project", "resource", "capacity", "mixed"]>;
    status: zod_1.ZodDefault<zod_1.ZodEnum<["draft", "active", "archived", "applied"]>>;
    baselineDate: zod_1.ZodDate;
    startDate: zod_1.ZodDate;
    endDate: zod_1.ZodDate;
    parameters: zod_1.ZodObject<{
        projectChanges: zod_1.ZodOptional<zod_1.ZodArray<zod_1.ZodObject<{
            projectId: zod_1.ZodString;
            action: zod_1.ZodEnum<["add", "remove", "modify"]>;
            changes: zod_1.ZodOptional<zod_1.ZodRecord<zod_1.ZodString, zod_1.ZodAny>>;
        }, "strip", zod_1.ZodTypeAny, {
            action: "add" | "remove" | "modify";
            projectId: string;
            changes?: Record<string, any> | undefined;
        }, {
            action: "add" | "remove" | "modify";
            projectId: string;
            changes?: Record<string, any> | undefined;
        }>, "many">>;
        resourceChanges: zod_1.ZodOptional<zod_1.ZodArray<zod_1.ZodObject<{
            employeeId: zod_1.ZodString;
            action: zod_1.ZodEnum<["add", "remove", "reassign", "adjust_capacity"]>;
            details: zod_1.ZodOptional<zod_1.ZodRecord<zod_1.ZodString, zod_1.ZodAny>>;
        }, "strip", zod_1.ZodTypeAny, {
            action: "add" | "remove" | "reassign" | "adjust_capacity";
            employeeId: string;
            details?: Record<string, any> | undefined;
        }, {
            action: "add" | "remove" | "reassign" | "adjust_capacity";
            employeeId: string;
            details?: Record<string, any> | undefined;
        }>, "many">>;
        capacityAdjustments: zod_1.ZodOptional<zod_1.ZodArray<zod_1.ZodObject<{
            departmentId: zod_1.ZodOptional<zod_1.ZodString>;
            teamId: zod_1.ZodOptional<zod_1.ZodString>;
            adjustment: zod_1.ZodNumber;
            startDate: zod_1.ZodDate;
            endDate: zod_1.ZodDate;
        }, "strip", zod_1.ZodTypeAny, {
            startDate: Date;
            endDate: Date;
            adjustment: number;
            departmentId?: string | undefined;
            teamId?: string | undefined;
        }, {
            startDate: Date;
            endDate: Date;
            adjustment: number;
            departmentId?: string | undefined;
            teamId?: string | undefined;
        }>, "many">>;
        constraints: zod_1.ZodOptional<zod_1.ZodObject<{
            maxBudget: zod_1.ZodOptional<zod_1.ZodNumber>;
            minResourceUtilization: zod_1.ZodOptional<zod_1.ZodNumber>;
            maxResourceUtilization: zod_1.ZodOptional<zod_1.ZodNumber>;
            requiredSkills: zod_1.ZodOptional<zod_1.ZodArray<zod_1.ZodString, "many">>;
            blackoutDates: zod_1.ZodOptional<zod_1.ZodArray<zod_1.ZodDate, "many">>;
        }, "strip", zod_1.ZodTypeAny, {
            requiredSkills?: string[] | undefined;
            maxBudget?: number | undefined;
            minResourceUtilization?: number | undefined;
            maxResourceUtilization?: number | undefined;
            blackoutDates?: Date[] | undefined;
        }, {
            requiredSkills?: string[] | undefined;
            maxBudget?: number | undefined;
            minResourceUtilization?: number | undefined;
            maxResourceUtilization?: number | undefined;
            blackoutDates?: Date[] | undefined;
        }>>;
    }, "strip", zod_1.ZodTypeAny, {
        projectChanges?: {
            action: "add" | "remove" | "modify";
            projectId: string;
            changes?: Record<string, any> | undefined;
        }[] | undefined;
        resourceChanges?: {
            action: "add" | "remove" | "reassign" | "adjust_capacity";
            employeeId: string;
            details?: Record<string, any> | undefined;
        }[] | undefined;
        capacityAdjustments?: {
            startDate: Date;
            endDate: Date;
            adjustment: number;
            departmentId?: string | undefined;
            teamId?: string | undefined;
        }[] | undefined;
        constraints?: {
            requiredSkills?: string[] | undefined;
            maxBudget?: number | undefined;
            minResourceUtilization?: number | undefined;
            maxResourceUtilization?: number | undefined;
            blackoutDates?: Date[] | undefined;
        } | undefined;
    }, {
        projectChanges?: {
            action: "add" | "remove" | "modify";
            projectId: string;
            changes?: Record<string, any> | undefined;
        }[] | undefined;
        resourceChanges?: {
            action: "add" | "remove" | "reassign" | "adjust_capacity";
            employeeId: string;
            details?: Record<string, any> | undefined;
        }[] | undefined;
        capacityAdjustments?: {
            startDate: Date;
            endDate: Date;
            adjustment: number;
            departmentId?: string | undefined;
            teamId?: string | undefined;
        }[] | undefined;
        constraints?: {
            requiredSkills?: string[] | undefined;
            maxBudget?: number | undefined;
            minResourceUtilization?: number | undefined;
            maxResourceUtilization?: number | undefined;
            blackoutDates?: Date[] | undefined;
        } | undefined;
    }>;
    assumptions: zod_1.ZodOptional<zod_1.ZodArray<zod_1.ZodObject<{
        description: zod_1.ZodString;
        confidence: zod_1.ZodNumber;
        impact: zod_1.ZodEnum<["low", "medium", "high", "critical"]>;
    }, "strip", zod_1.ZodTypeAny, {
        description: string;
        confidence: number;
        impact: "low" | "medium" | "high" | "critical";
    }, {
        description: string;
        confidence: number;
        impact: "low" | "medium" | "high" | "critical";
    }>, "many">>;
    createdBy: zod_1.ZodString;
    approvedBy: zod_1.ZodOptional<zod_1.ZodString>;
    metadata: zod_1.ZodOptional<zod_1.ZodRecord<zod_1.ZodString, zod_1.ZodAny>>;
    createdAt: zod_1.ZodOptional<zod_1.ZodDate>;
    updatedAt: zod_1.ZodOptional<zod_1.ZodDate>;
}, "strip", zod_1.ZodTypeAny, {
    name: string;
    startDate: Date;
    endDate: Date;
    type: "capacity" | "project" | "resource" | "mixed";
    status: "active" | "draft" | "archived" | "applied";
    baselineDate: Date;
    parameters: {
        projectChanges?: {
            action: "add" | "remove" | "modify";
            projectId: string;
            changes?: Record<string, any> | undefined;
        }[] | undefined;
        resourceChanges?: {
            action: "add" | "remove" | "reassign" | "adjust_capacity";
            employeeId: string;
            details?: Record<string, any> | undefined;
        }[] | undefined;
        capacityAdjustments?: {
            startDate: Date;
            endDate: Date;
            adjustment: number;
            departmentId?: string | undefined;
            teamId?: string | undefined;
        }[] | undefined;
        constraints?: {
            requiredSkills?: string[] | undefined;
            maxBudget?: number | undefined;
            minResourceUtilization?: number | undefined;
            maxResourceUtilization?: number | undefined;
            blackoutDates?: Date[] | undefined;
        } | undefined;
    };
    createdBy: string;
    description?: string | undefined;
    metadata?: Record<string, any> | undefined;
    id?: string | undefined;
    createdAt?: Date | undefined;
    updatedAt?: Date | undefined;
    approvedBy?: string | undefined;
    assumptions?: {
        description: string;
        confidence: number;
        impact: "low" | "medium" | "high" | "critical";
    }[] | undefined;
}, {
    name: string;
    startDate: Date;
    endDate: Date;
    type: "capacity" | "project" | "resource" | "mixed";
    baselineDate: Date;
    parameters: {
        projectChanges?: {
            action: "add" | "remove" | "modify";
            projectId: string;
            changes?: Record<string, any> | undefined;
        }[] | undefined;
        resourceChanges?: {
            action: "add" | "remove" | "reassign" | "adjust_capacity";
            employeeId: string;
            details?: Record<string, any> | undefined;
        }[] | undefined;
        capacityAdjustments?: {
            startDate: Date;
            endDate: Date;
            adjustment: number;
            departmentId?: string | undefined;
            teamId?: string | undefined;
        }[] | undefined;
        constraints?: {
            requiredSkills?: string[] | undefined;
            maxBudget?: number | undefined;
            minResourceUtilization?: number | undefined;
            maxResourceUtilization?: number | undefined;
            blackoutDates?: Date[] | undefined;
        } | undefined;
    };
    createdBy: string;
    description?: string | undefined;
    metadata?: Record<string, any> | undefined;
    id?: string | undefined;
    createdAt?: Date | undefined;
    updatedAt?: Date | undefined;
    status?: "active" | "draft" | "archived" | "applied" | undefined;
    approvedBy?: string | undefined;
    assumptions?: {
        description: string;
        confidence: number;
        impact: "low" | "medium" | "high" | "critical";
    }[] | undefined;
}>;
export const ImpactAnalysisSchema: zod_1.ZodObject<{
    scenarioId: zod_1.ZodString;
    timestamp: zod_1.ZodDate;
    baseline: zod_1.ZodObject<{
        totalCapacity: zod_1.ZodNumber;
        allocatedCapacity: zod_1.ZodNumber;
        utilizationRate: zod_1.ZodNumber;
        projectCount: zod_1.ZodNumber;
        resourceCount: zod_1.ZodNumber;
        totalCost: zod_1.ZodOptional<zod_1.ZodNumber>;
    }, "strip", zod_1.ZodTypeAny, {
        utilizationRate: number;
        totalCapacity: number;
        allocatedCapacity: number;
        projectCount: number;
        resourceCount: number;
        totalCost?: number | undefined;
    }, {
        utilizationRate: number;
        totalCapacity: number;
        allocatedCapacity: number;
        projectCount: number;
        resourceCount: number;
        totalCost?: number | undefined;
    }>;
    projected: zod_1.ZodObject<{
        totalCapacity: zod_1.ZodNumber;
        allocatedCapacity: zod_1.ZodNumber;
        utilizationRate: zod_1.ZodNumber;
        projectCount: zod_1.ZodNumber;
        resourceCount: zod_1.ZodNumber;
        totalCost: zod_1.ZodOptional<zod_1.ZodNumber>;
    }, "strip", zod_1.ZodTypeAny, {
        utilizationRate: number;
        totalCapacity: number;
        allocatedCapacity: number;
        projectCount: number;
        resourceCount: number;
        totalCost?: number | undefined;
    }, {
        utilizationRate: number;
        totalCapacity: number;
        allocatedCapacity: number;
        projectCount: number;
        resourceCount: number;
        totalCost?: number | undefined;
    }>;
    impacts: zod_1.ZodArray<zod_1.ZodObject<{
        type: zod_1.ZodEnum<["resource", "project", "budget", "timeline", "skill"]>;
        severity: zod_1.ZodEnum<["low", "medium", "high", "critical"]>;
        description: zod_1.ZodString;
        affectedEntities: zod_1.ZodArray<zod_1.ZodObject<{
            id: zod_1.ZodString;
            name: zod_1.ZodString;
            type: zod_1.ZodString;
        }, "strip", zod_1.ZodTypeAny, {
            id: string;
            name: string;
            type: string;
        }, {
            id: string;
            name: string;
            type: string;
        }>, "many">;
        metrics: zod_1.ZodOptional<zod_1.ZodRecord<zod_1.ZodString, zod_1.ZodAny>>;
    }, "strip", zod_1.ZodTypeAny, {
        description: string;
        severity: "low" | "medium" | "high" | "critical";
        type: "skill" | "budget" | "project" | "resource" | "timeline";
        affectedEntities: {
            id: string;
            name: string;
            type: string;
        }[];
        metrics?: Record<string, any> | undefined;
    }, {
        description: string;
        severity: "low" | "medium" | "high" | "critical";
        type: "skill" | "budget" | "project" | "resource" | "timeline";
        affectedEntities: {
            id: string;
            name: string;
            type: string;
        }[];
        metrics?: Record<string, any> | undefined;
    }>, "many">;
    recommendations: zod_1.ZodArray<zod_1.ZodObject<{
        priority: zod_1.ZodEnum<["low", "medium", "high"]>;
        action: zod_1.ZodString;
        expectedOutcome: zod_1.ZodString;
        effort: zod_1.ZodEnum<["low", "medium", "high"]>;
        risk: zod_1.ZodEnum<["low", "medium", "high"]>;
    }, "strip", zod_1.ZodTypeAny, {
        action: string;
        priority: "low" | "medium" | "high";
        expectedOutcome: string;
        effort: "low" | "medium" | "high";
        risk: "low" | "medium" | "high";
    }, {
        action: string;
        priority: "low" | "medium" | "high";
        expectedOutcome: string;
        effort: "low" | "medium" | "high";
        risk: "low" | "medium" | "high";
    }>, "many">;
    risks: zod_1.ZodArray<zod_1.ZodObject<{
        description: zod_1.ZodString;
        probability: zod_1.ZodNumber;
        impact: zod_1.ZodEnum<["low", "medium", "high", "critical"]>;
        mitigation: zod_1.ZodOptional<zod_1.ZodString>;
    }, "strip", zod_1.ZodTypeAny, {
        description: string;
        impact: "low" | "medium" | "high" | "critical";
        probability: number;
        mitigation?: string | undefined;
    }, {
        description: string;
        impact: "low" | "medium" | "high" | "critical";
        probability: number;
        mitigation?: string | undefined;
    }>, "many">;
    confidenceScore: zod_1.ZodNumber;
}, "strip", zod_1.ZodTypeAny, {
    recommendations: {
        action: string;
        priority: "low" | "medium" | "high";
        expectedOutcome: string;
        effort: "low" | "medium" | "high";
        risk: "low" | "medium" | "high";
    }[];
    scenarioId: string;
    timestamp: Date;
    baseline: {
        utilizationRate: number;
        totalCapacity: number;
        allocatedCapacity: number;
        projectCount: number;
        resourceCount: number;
        totalCost?: number | undefined;
    };
    projected: {
        utilizationRate: number;
        totalCapacity: number;
        allocatedCapacity: number;
        projectCount: number;
        resourceCount: number;
        totalCost?: number | undefined;
    };
    impacts: {
        description: string;
        severity: "low" | "medium" | "high" | "critical";
        type: "skill" | "budget" | "project" | "resource" | "timeline";
        affectedEntities: {
            id: string;
            name: string;
            type: string;
        }[];
        metrics?: Record<string, any> | undefined;
    }[];
    risks: {
        description: string;
        impact: "low" | "medium" | "high" | "critical";
        probability: number;
        mitigation?: string | undefined;
    }[];
    confidenceScore: number;
}, {
    recommendations: {
        action: string;
        priority: "low" | "medium" | "high";
        expectedOutcome: string;
        effort: "low" | "medium" | "high";
        risk: "low" | "medium" | "high";
    }[];
    scenarioId: string;
    timestamp: Date;
    baseline: {
        utilizationRate: number;
        totalCapacity: number;
        allocatedCapacity: number;
        projectCount: number;
        resourceCount: number;
        totalCost?: number | undefined;
    };
    projected: {
        utilizationRate: number;
        totalCapacity: number;
        allocatedCapacity: number;
        projectCount: number;
        resourceCount: number;
        totalCost?: number | undefined;
    };
    impacts: {
        description: string;
        severity: "low" | "medium" | "high" | "critical";
        type: "skill" | "budget" | "project" | "resource" | "timeline";
        affectedEntities: {
            id: string;
            name: string;
            type: string;
        }[];
        metrics?: Record<string, any> | undefined;
    }[];
    risks: {
        description: string;
        impact: "low" | "medium" | "high" | "critical";
        probability: number;
        mitigation?: string | undefined;
    }[];
    confidenceScore: number;
}>;
export const ComparisonResultSchema: zod_1.ZodObject<{
    scenarios: zod_1.ZodArray<zod_1.ZodObject<{
        id: zod_1.ZodOptional<zod_1.ZodString>;
        name: zod_1.ZodString;
        description: zod_1.ZodOptional<zod_1.ZodString>;
        type: zod_1.ZodEnum<["project", "resource", "capacity", "mixed"]>;
        status: zod_1.ZodDefault<zod_1.ZodEnum<["draft", "active", "archived", "applied"]>>;
        baselineDate: zod_1.ZodDate;
        startDate: zod_1.ZodDate;
        endDate: zod_1.ZodDate;
        parameters: zod_1.ZodObject<{
            projectChanges: zod_1.ZodOptional<zod_1.ZodArray<zod_1.ZodObject<{
                projectId: zod_1.ZodString;
                action: zod_1.ZodEnum<["add", "remove", "modify"]>;
                changes: zod_1.ZodOptional<zod_1.ZodRecord<zod_1.ZodString, zod_1.ZodAny>>;
            }, "strip", zod_1.ZodTypeAny, {
                action: "add" | "remove" | "modify";
                projectId: string;
                changes?: Record<string, any> | undefined;
            }, {
                action: "add" | "remove" | "modify";
                projectId: string;
                changes?: Record<string, any> | undefined;
            }>, "many">>;
            resourceChanges: zod_1.ZodOptional<zod_1.ZodArray<zod_1.ZodObject<{
                employeeId: zod_1.ZodString;
                action: zod_1.ZodEnum<["add", "remove", "reassign", "adjust_capacity"]>;
                details: zod_1.ZodOptional<zod_1.ZodRecord<zod_1.ZodString, zod_1.ZodAny>>;
            }, "strip", zod_1.ZodTypeAny, {
                action: "add" | "remove" | "reassign" | "adjust_capacity";
                employeeId: string;
                details?: Record<string, any> | undefined;
            }, {
                action: "add" | "remove" | "reassign" | "adjust_capacity";
                employeeId: string;
                details?: Record<string, any> | undefined;
            }>, "many">>;
            capacityAdjustments: zod_1.ZodOptional<zod_1.ZodArray<zod_1.ZodObject<{
                departmentId: zod_1.ZodOptional<zod_1.ZodString>;
                teamId: zod_1.ZodOptional<zod_1.ZodString>;
                adjustment: zod_1.ZodNumber;
                startDate: zod_1.ZodDate;
                endDate: zod_1.ZodDate;
            }, "strip", zod_1.ZodTypeAny, {
                startDate: Date;
                endDate: Date;
                adjustment: number;
                departmentId?: string | undefined;
                teamId?: string | undefined;
            }, {
                startDate: Date;
                endDate: Date;
                adjustment: number;
                departmentId?: string | undefined;
                teamId?: string | undefined;
            }>, "many">>;
            constraints: zod_1.ZodOptional<zod_1.ZodObject<{
                maxBudget: zod_1.ZodOptional<zod_1.ZodNumber>;
                minResourceUtilization: zod_1.ZodOptional<zod_1.ZodNumber>;
                maxResourceUtilization: zod_1.ZodOptional<zod_1.ZodNumber>;
                requiredSkills: zod_1.ZodOptional<zod_1.ZodArray<zod_1.ZodString, "many">>;
                blackoutDates: zod_1.ZodOptional<zod_1.ZodArray<zod_1.ZodDate, "many">>;
            }, "strip", zod_1.ZodTypeAny, {
                requiredSkills?: string[] | undefined;
                maxBudget?: number | undefined;
                minResourceUtilization?: number | undefined;
                maxResourceUtilization?: number | undefined;
                blackoutDates?: Date[] | undefined;
            }, {
                requiredSkills?: string[] | undefined;
                maxBudget?: number | undefined;
                minResourceUtilization?: number | undefined;
                maxResourceUtilization?: number | undefined;
                blackoutDates?: Date[] | undefined;
            }>>;
        }, "strip", zod_1.ZodTypeAny, {
            projectChanges?: {
                action: "add" | "remove" | "modify";
                projectId: string;
                changes?: Record<string, any> | undefined;
            }[] | undefined;
            resourceChanges?: {
                action: "add" | "remove" | "reassign" | "adjust_capacity";
                employeeId: string;
                details?: Record<string, any> | undefined;
            }[] | undefined;
            capacityAdjustments?: {
                startDate: Date;
                endDate: Date;
                adjustment: number;
                departmentId?: string | undefined;
                teamId?: string | undefined;
            }[] | undefined;
            constraints?: {
                requiredSkills?: string[] | undefined;
                maxBudget?: number | undefined;
                minResourceUtilization?: number | undefined;
                maxResourceUtilization?: number | undefined;
                blackoutDates?: Date[] | undefined;
            } | undefined;
        }, {
            projectChanges?: {
                action: "add" | "remove" | "modify";
                projectId: string;
                changes?: Record<string, any> | undefined;
            }[] | undefined;
            resourceChanges?: {
                action: "add" | "remove" | "reassign" | "adjust_capacity";
                employeeId: string;
                details?: Record<string, any> | undefined;
            }[] | undefined;
            capacityAdjustments?: {
                startDate: Date;
                endDate: Date;
                adjustment: number;
                departmentId?: string | undefined;
                teamId?: string | undefined;
            }[] | undefined;
            constraints?: {
                requiredSkills?: string[] | undefined;
                maxBudget?: number | undefined;
                minResourceUtilization?: number | undefined;
                maxResourceUtilization?: number | undefined;
                blackoutDates?: Date[] | undefined;
            } | undefined;
        }>;
        assumptions: zod_1.ZodOptional<zod_1.ZodArray<zod_1.ZodObject<{
            description: zod_1.ZodString;
            confidence: zod_1.ZodNumber;
            impact: zod_1.ZodEnum<["low", "medium", "high", "critical"]>;
        }, "strip", zod_1.ZodTypeAny, {
            description: string;
            confidence: number;
            impact: "low" | "medium" | "high" | "critical";
        }, {
            description: string;
            confidence: number;
            impact: "low" | "medium" | "high" | "critical";
        }>, "many">>;
        createdBy: zod_1.ZodString;
        approvedBy: zod_1.ZodOptional<zod_1.ZodString>;
        metadata: zod_1.ZodOptional<zod_1.ZodRecord<zod_1.ZodString, zod_1.ZodAny>>;
        createdAt: zod_1.ZodOptional<zod_1.ZodDate>;
        updatedAt: zod_1.ZodOptional<zod_1.ZodDate>;
    }, "strip", zod_1.ZodTypeAny, {
        name: string;
        startDate: Date;
        endDate: Date;
        type: "capacity" | "project" | "resource" | "mixed";
        status: "active" | "draft" | "archived" | "applied";
        baselineDate: Date;
        parameters: {
            projectChanges?: {
                action: "add" | "remove" | "modify";
                projectId: string;
                changes?: Record<string, any> | undefined;
            }[] | undefined;
            resourceChanges?: {
                action: "add" | "remove" | "reassign" | "adjust_capacity";
                employeeId: string;
                details?: Record<string, any> | undefined;
            }[] | undefined;
            capacityAdjustments?: {
                startDate: Date;
                endDate: Date;
                adjustment: number;
                departmentId?: string | undefined;
                teamId?: string | undefined;
            }[] | undefined;
            constraints?: {
                requiredSkills?: string[] | undefined;
                maxBudget?: number | undefined;
                minResourceUtilization?: number | undefined;
                maxResourceUtilization?: number | undefined;
                blackoutDates?: Date[] | undefined;
            } | undefined;
        };
        createdBy: string;
        description?: string | undefined;
        metadata?: Record<string, any> | undefined;
        id?: string | undefined;
        createdAt?: Date | undefined;
        updatedAt?: Date | undefined;
        approvedBy?: string | undefined;
        assumptions?: {
            description: string;
            confidence: number;
            impact: "low" | "medium" | "high" | "critical";
        }[] | undefined;
    }, {
        name: string;
        startDate: Date;
        endDate: Date;
        type: "capacity" | "project" | "resource" | "mixed";
        baselineDate: Date;
        parameters: {
            projectChanges?: {
                action: "add" | "remove" | "modify";
                projectId: string;
                changes?: Record<string, any> | undefined;
            }[] | undefined;
            resourceChanges?: {
                action: "add" | "remove" | "reassign" | "adjust_capacity";
                employeeId: string;
                details?: Record<string, any> | undefined;
            }[] | undefined;
            capacityAdjustments?: {
                startDate: Date;
                endDate: Date;
                adjustment: number;
                departmentId?: string | undefined;
                teamId?: string | undefined;
            }[] | undefined;
            constraints?: {
                requiredSkills?: string[] | undefined;
                maxBudget?: number | undefined;
                minResourceUtilization?: number | undefined;
                maxResourceUtilization?: number | undefined;
                blackoutDates?: Date[] | undefined;
            } | undefined;
        };
        createdBy: string;
        description?: string | undefined;
        metadata?: Record<string, any> | undefined;
        id?: string | undefined;
        createdAt?: Date | undefined;
        updatedAt?: Date | undefined;
        status?: "active" | "draft" | "archived" | "applied" | undefined;
        approvedBy?: string | undefined;
        assumptions?: {
            description: string;
            confidence: number;
            impact: "low" | "medium" | "high" | "critical";
        }[] | undefined;
    }>, "many">;
    metrics: zod_1.ZodArray<zod_1.ZodObject<{
        name: zod_1.ZodString;
        values: zod_1.ZodRecord<zod_1.ZodString, zod_1.ZodNumber>;
    }, "strip", zod_1.ZodTypeAny, {
        values: Record<string, number>;
        name: string;
    }, {
        values: Record<string, number>;
        name: string;
    }>, "many">;
    winner: zod_1.ZodOptional<zod_1.ZodObject<{
        scenarioId: zod_1.ZodString;
        score: zod_1.ZodNumber;
        reasons: zod_1.ZodArray<zod_1.ZodString, "many">;
    }, "strip", zod_1.ZodTypeAny, {
        score: number;
        scenarioId: string;
        reasons: string[];
    }, {
        score: number;
        scenarioId: string;
        reasons: string[];
    }>>;
    tradeoffs: zod_1.ZodArray<zod_1.ZodObject<{
        scenarioId: zod_1.ZodString;
        pros: zod_1.ZodArray<zod_1.ZodString, "many">;
        cons: zod_1.ZodArray<zod_1.ZodString, "many">;
    }, "strip", zod_1.ZodTypeAny, {
        scenarioId: string;
        pros: string[];
        cons: string[];
    }, {
        scenarioId: string;
        pros: string[];
        cons: string[];
    }>, "many">;
}, "strip", zod_1.ZodTypeAny, {
    metrics: {
        values: Record<string, number>;
        name: string;
    }[];
    scenarios: {
        name: string;
        startDate: Date;
        endDate: Date;
        type: "capacity" | "project" | "resource" | "mixed";
        status: "active" | "draft" | "archived" | "applied";
        baselineDate: Date;
        parameters: {
            projectChanges?: {
                action: "add" | "remove" | "modify";
                projectId: string;
                changes?: Record<string, any> | undefined;
            }[] | undefined;
            resourceChanges?: {
                action: "add" | "remove" | "reassign" | "adjust_capacity";
                employeeId: string;
                details?: Record<string, any> | undefined;
            }[] | undefined;
            capacityAdjustments?: {
                startDate: Date;
                endDate: Date;
                adjustment: number;
                departmentId?: string | undefined;
                teamId?: string | undefined;
            }[] | undefined;
            constraints?: {
                requiredSkills?: string[] | undefined;
                maxBudget?: number | undefined;
                minResourceUtilization?: number | undefined;
                maxResourceUtilization?: number | undefined;
                blackoutDates?: Date[] | undefined;
            } | undefined;
        };
        createdBy: string;
        description?: string | undefined;
        metadata?: Record<string, any> | undefined;
        id?: string | undefined;
        createdAt?: Date | undefined;
        updatedAt?: Date | undefined;
        approvedBy?: string | undefined;
        assumptions?: {
            description: string;
            confidence: number;
            impact: "low" | "medium" | "high" | "critical";
        }[] | undefined;
    }[];
    tradeoffs: {
        scenarioId: string;
        pros: string[];
        cons: string[];
    }[];
    winner?: {
        score: number;
        scenarioId: string;
        reasons: string[];
    } | undefined;
}, {
    metrics: {
        values: Record<string, number>;
        name: string;
    }[];
    scenarios: {
        name: string;
        startDate: Date;
        endDate: Date;
        type: "capacity" | "project" | "resource" | "mixed";
        baselineDate: Date;
        parameters: {
            projectChanges?: {
                action: "add" | "remove" | "modify";
                projectId: string;
                changes?: Record<string, any> | undefined;
            }[] | undefined;
            resourceChanges?: {
                action: "add" | "remove" | "reassign" | "adjust_capacity";
                employeeId: string;
                details?: Record<string, any> | undefined;
            }[] | undefined;
            capacityAdjustments?: {
                startDate: Date;
                endDate: Date;
                adjustment: number;
                departmentId?: string | undefined;
                teamId?: string | undefined;
            }[] | undefined;
            constraints?: {
                requiredSkills?: string[] | undefined;
                maxBudget?: number | undefined;
                minResourceUtilization?: number | undefined;
                maxResourceUtilization?: number | undefined;
                blackoutDates?: Date[] | undefined;
            } | undefined;
        };
        createdBy: string;
        description?: string | undefined;
        metadata?: Record<string, any> | undefined;
        id?: string | undefined;
        createdAt?: Date | undefined;
        updatedAt?: Date | undefined;
        status?: "active" | "draft" | "archived" | "applied" | undefined;
        approvedBy?: string | undefined;
        assumptions?: {
            description: string;
            confidence: number;
            impact: "low" | "medium" | "high" | "critical";
        }[] | undefined;
    }[];
    tradeoffs: {
        scenarioId: string;
        pros: string[];
        cons: string[];
    }[];
    winner?: {
        score: number;
        scenarioId: string;
        reasons: string[];
    } | undefined;
}>;
import zod_1 = require("zod");
export class ScenarioPlanner {
    constructor(db: any, cacheService: any, wsService: any, availabilityService: any, analyticsService: any);
    db: any;
    cacheService: any;
    wsService: any;
    availabilityService: any;
    analyticsService: any;
    createScenario(scenario: any): Promise<{
        id: any;
        name: any;
        description: any;
        type: any;
        status: any;
        baselineDate: any;
        startDate: any;
        endDate: any;
        parameters: any;
        assumptions: any;
        createdBy: any;
        approvedBy: any;
        metadata: any;
        createdAt: any;
        updatedAt: any;
    }>;
    getScenarioById(id: any): Promise<any>;
    updateScenario(id: any, updates: any): Promise<{
        id: any;
        name: any;
        description: any;
        type: any;
        status: any;
        baselineDate: any;
        startDate: any;
        endDate: any;
        parameters: any;
        assumptions: any;
        createdBy: any;
        approvedBy: any;
        metadata: any;
        createdAt: any;
        updatedAt: any;
    }>;
    deleteScenario(id: any): Promise<void>;
    listScenarios(filters: any): Promise<any>;
    analyzeImpact(scenarioId: any, client: any): Promise<{
        scenarioId: any;
        timestamp: Date;
        baseline: {
            totalCapacity: number;
            allocatedCapacity: number;
            utilizationRate: number;
            projectCount: number;
            resourceCount: number;
            totalCost: number;
        };
        projected: any;
        impacts: ({
            type: string;
            severity: string;
            description: string;
            affectedEntities: never[];
            metrics: {
                baselineUtilization: any;
                projectedUtilization: any;
                difference: number;
                baselineCapacity?: undefined;
                projectedCapacity?: undefined;
                baselineCost?: undefined;
                projectedCost?: undefined;
                overallocationPercentage?: undefined;
                underutilizationPercentage?: undefined;
            };
        } | {
            type: string;
            severity: string;
            description: string;
            affectedEntities: never[];
            metrics: {
                baselineCapacity: any;
                projectedCapacity: any;
                difference: number;
                baselineUtilization?: undefined;
                projectedUtilization?: undefined;
                baselineCost?: undefined;
                projectedCost?: undefined;
                overallocationPercentage?: undefined;
                underutilizationPercentage?: undefined;
            };
        } | {
            type: string;
            severity: string;
            description: string;
            affectedEntities: never[];
            metrics: {
                baselineCost: any;
                projectedCost: any;
                difference: number;
                baselineUtilization?: undefined;
                projectedUtilization?: undefined;
                baselineCapacity?: undefined;
                projectedCapacity?: undefined;
                overallocationPercentage?: undefined;
                underutilizationPercentage?: undefined;
            };
        } | {
            type: string;
            severity: string;
            description: string;
            affectedEntities: never[];
            metrics: {
                overallocationPercentage: number;
                baselineUtilization?: undefined;
                projectedUtilization?: undefined;
                difference?: undefined;
                baselineCapacity?: undefined;
                projectedCapacity?: undefined;
                baselineCost?: undefined;
                projectedCost?: undefined;
                underutilizationPercentage?: undefined;
            };
        } | {
            type: string;
            severity: string;
            description: string;
            affectedEntities: never[];
            metrics: {
                underutilizationPercentage: number;
                baselineUtilization?: undefined;
                projectedUtilization?: undefined;
                difference?: undefined;
                baselineCapacity?: undefined;
                projectedCapacity?: undefined;
                baselineCost?: undefined;
                projectedCost?: undefined;
                overallocationPercentage?: undefined;
            };
        })[];
        recommendations: {
            priority: string;
            action: string;
            expectedOutcome: string;
            effort: string;
            risk: string;
        }[];
        risks: {
            description: string;
            probability: number;
            impact: string;
            mitigation: string;
        }[];
        confidenceScore: number;
    }>;
    calculateBaselineMetrics(baselineDate: any, startDate: any, endDate: any, client: any): Promise<{
        totalCapacity: number;
        allocatedCapacity: number;
        utilizationRate: number;
        projectCount: number;
        resourceCount: number;
        totalCost: number;
    }>;
    calculateProjectedMetrics(scenario: any, baseline: any, client: any): Promise<any>;
    identifyImpacts(baseline: any, projected: any, scenario: any): Promise<({
        type: string;
        severity: string;
        description: string;
        affectedEntities: never[];
        metrics: {
            baselineUtilization: any;
            projectedUtilization: any;
            difference: number;
            baselineCapacity?: undefined;
            projectedCapacity?: undefined;
            baselineCost?: undefined;
            projectedCost?: undefined;
            overallocationPercentage?: undefined;
            underutilizationPercentage?: undefined;
        };
    } | {
        type: string;
        severity: string;
        description: string;
        affectedEntities: never[];
        metrics: {
            baselineCapacity: any;
            projectedCapacity: any;
            difference: number;
            baselineUtilization?: undefined;
            projectedUtilization?: undefined;
            baselineCost?: undefined;
            projectedCost?: undefined;
            overallocationPercentage?: undefined;
            underutilizationPercentage?: undefined;
        };
    } | {
        type: string;
        severity: string;
        description: string;
        affectedEntities: never[];
        metrics: {
            baselineCost: any;
            projectedCost: any;
            difference: number;
            baselineUtilization?: undefined;
            projectedUtilization?: undefined;
            baselineCapacity?: undefined;
            projectedCapacity?: undefined;
            overallocationPercentage?: undefined;
            underutilizationPercentage?: undefined;
        };
    } | {
        type: string;
        severity: string;
        description: string;
        affectedEntities: never[];
        metrics: {
            overallocationPercentage: number;
            baselineUtilization?: undefined;
            projectedUtilization?: undefined;
            difference?: undefined;
            baselineCapacity?: undefined;
            projectedCapacity?: undefined;
            baselineCost?: undefined;
            projectedCost?: undefined;
            underutilizationPercentage?: undefined;
        };
    } | {
        type: string;
        severity: string;
        description: string;
        affectedEntities: never[];
        metrics: {
            underutilizationPercentage: number;
            baselineUtilization?: undefined;
            projectedUtilization?: undefined;
            difference?: undefined;
            baselineCapacity?: undefined;
            projectedCapacity?: undefined;
            baselineCost?: undefined;
            projectedCost?: undefined;
            overallocationPercentage?: undefined;
        };
    })[]>;
    generateRecommendations(impacts: any, scenario: any): Promise<{
        priority: string;
        action: string;
        expectedOutcome: string;
        effort: string;
        risk: string;
    }[]>;
    identifyRisks(scenario: any, impacts: any): Promise<{
        description: string;
        probability: number;
        impact: string;
        mitigation: string;
    }[]>;
    calculateConfidenceScore(scenario: any, impacts: any): number;
    compareScenarios(scenarioIds: any): Promise<{
        scenarios: any[];
        metrics: {
            name: string;
            values: any;
        }[];
        winner: {
            scenarioId: any;
            score: number;
            reasons: string[];
        } | undefined;
        tradeoffs: {
            scenarioId: any;
            pros: string[];
            cons: string[];
        }[];
    }>;
    generateWinnerReasons(scenario: any, impact: any): string[];
    identifyPros(scenario: any, impact: any): string[];
    identifyCons(scenario: any, impact: any): string[];
    applyScenario(scenarioId: any, applyDate: any): Promise<void>;
    applyProjectChange(change: any, effectiveDate: any, client: any): Promise<void>;
    applyResourceChange(change: any, effectiveDate: any, client: any): Promise<void>;
    applyCapacityAdjustment(adjustment: any, client: any): Promise<void>;
    runWhatIfAnalysis(params: any): Promise<{
        feasible: boolean;
        violations: string[];
        suggestions: string[];
        metrics: {
            utilization: any;
            cost: any;
            capacity: any;
            confidence: number;
        };
    }>;
    formatScenario(row: any): {
        id: any;
        name: any;
        description: any;
        type: any;
        status: any;
        baselineDate: any;
        startDate: any;
        endDate: any;
        parameters: any;
        assumptions: any;
        createdBy: any;
        approvedBy: any;
        metadata: any;
        createdAt: any;
        updatedAt: any;
    };
    cloneScenario(scenarioId: any, newName: any): Promise<{
        id: any;
        name: any;
        description: any;
        type: any;
        status: any;
        baselineDate: any;
        startDate: any;
        endDate: any;
        parameters: any;
        assumptions: any;
        createdBy: any;
        approvedBy: any;
        metadata: any;
        createdAt: any;
        updatedAt: any;
    }>;
    getScenarioHistory(scenarioId: any): Promise<any>;
}
//# sourceMappingURL=scenario-planner.service.d.ts.map