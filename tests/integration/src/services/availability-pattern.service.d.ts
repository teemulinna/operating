export const __esModule: boolean;
export const PatternType: zod_1.ZodEnum<["weekly", "biweekly", "monthly", "custom"]>;
export const ExceptionType: zod_1.ZodEnum<["holiday", "leave", "training", "other"]>;
export const DayOfWeek: zod_1.ZodEnum<["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]>;
export const AvailabilityPatternSchema: zod_1.ZodObject<{
    id: zod_1.ZodOptional<zod_1.ZodString>;
    employeeId: zod_1.ZodString;
    patternType: zod_1.ZodEnum<["weekly", "biweekly", "monthly", "custom"]>;
    configuration: zod_1.ZodObject<{
        weeklyHours: zod_1.ZodOptional<zod_1.ZodNumber>;
        dailyHours: zod_1.ZodOptional<zod_1.ZodNumber>;
        workDays: zod_1.ZodOptional<zod_1.ZodArray<zod_1.ZodEnum<["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]>, "many">>;
        customSchedule: zod_1.ZodOptional<zod_1.ZodRecord<zod_1.ZodEnum<["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]>, zod_1.ZodObject<{
            startTime: zod_1.ZodString;
            endTime: zod_1.ZodString;
            breakMinutes: zod_1.ZodOptional<zod_1.ZodNumber>;
        }, "strip", zod_1.ZodTypeAny, {
            startTime: string;
            endTime: string;
            breakMinutes?: number | undefined;
        }, {
            startTime: string;
            endTime: string;
            breakMinutes?: number | undefined;
        }>>>;
        biweeklySchedule: zod_1.ZodOptional<zod_1.ZodObject<{
            weekA: zod_1.ZodRecord<zod_1.ZodEnum<["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]>, zod_1.ZodNumber>;
            weekB: zod_1.ZodRecord<zod_1.ZodEnum<["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]>, zod_1.ZodNumber>;
        }, "strip", zod_1.ZodTypeAny, {
            weekA: Partial<Record<"monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday", number>>;
            weekB: Partial<Record<"monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday", number>>;
        }, {
            weekA: Partial<Record<"monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday", number>>;
            weekB: Partial<Record<"monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday", number>>;
        }>>;
        timeZone: zod_1.ZodOptional<zod_1.ZodString>;
    }, "strip", zod_1.ZodTypeAny, {
        weeklyHours?: number | undefined;
        dailyHours?: number | undefined;
        workDays?: ("monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday")[] | undefined;
        customSchedule?: Partial<Record<"monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday", {
            startTime: string;
            endTime: string;
            breakMinutes?: number | undefined;
        }>> | undefined;
        biweeklySchedule?: {
            weekA: Partial<Record<"monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday", number>>;
            weekB: Partial<Record<"monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday", number>>;
        } | undefined;
        timeZone?: string | undefined;
    }, {
        weeklyHours?: number | undefined;
        dailyHours?: number | undefined;
        workDays?: ("monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday")[] | undefined;
        customSchedule?: Partial<Record<"monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday", {
            startTime: string;
            endTime: string;
            breakMinutes?: number | undefined;
        }>> | undefined;
        biweeklySchedule?: {
            weekA: Partial<Record<"monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday", number>>;
            weekB: Partial<Record<"monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday", number>>;
        } | undefined;
        timeZone?: string | undefined;
    }>;
    effectiveFrom: zod_1.ZodUnion<[zod_1.ZodDate, zod_1.ZodString]>;
    effectiveTo: zod_1.ZodOptional<zod_1.ZodUnion<[zod_1.ZodDate, zod_1.ZodString]>>;
    isActive: zod_1.ZodDefault<zod_1.ZodBoolean>;
    notes: zod_1.ZodOptional<zod_1.ZodString>;
}, "strip", zod_1.ZodTypeAny, {
    isActive: boolean;
    employeeId: string;
    patternType: "custom" | "weekly" | "biweekly" | "monthly";
    configuration: {
        weeklyHours?: number | undefined;
        dailyHours?: number | undefined;
        workDays?: ("monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday")[] | undefined;
        customSchedule?: Partial<Record<"monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday", {
            startTime: string;
            endTime: string;
            breakMinutes?: number | undefined;
        }>> | undefined;
        biweeklySchedule?: {
            weekA: Partial<Record<"monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday", number>>;
            weekB: Partial<Record<"monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday", number>>;
        } | undefined;
        timeZone?: string | undefined;
    };
    effectiveFrom: string | Date;
    id?: string | undefined;
    notes?: string | undefined;
    effectiveTo?: string | Date | undefined;
}, {
    employeeId: string;
    patternType: "custom" | "weekly" | "biweekly" | "monthly";
    configuration: {
        weeklyHours?: number | undefined;
        dailyHours?: number | undefined;
        workDays?: ("monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday")[] | undefined;
        customSchedule?: Partial<Record<"monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday", {
            startTime: string;
            endTime: string;
            breakMinutes?: number | undefined;
        }>> | undefined;
        biweeklySchedule?: {
            weekA: Partial<Record<"monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday", number>>;
            weekB: Partial<Record<"monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday", number>>;
        } | undefined;
        timeZone?: string | undefined;
    };
    effectiveFrom: string | Date;
    isActive?: boolean | undefined;
    id?: string | undefined;
    notes?: string | undefined;
    effectiveTo?: string | Date | undefined;
}>;
export const AvailabilityExceptionSchema: zod_1.ZodObject<{
    id: zod_1.ZodOptional<zod_1.ZodString>;
    employeeId: zod_1.ZodString;
    exceptionDate: zod_1.ZodUnion<[zod_1.ZodDate, zod_1.ZodString]>;
    exceptionEndDate: zod_1.ZodOptional<zod_1.ZodUnion<[zod_1.ZodDate, zod_1.ZodString]>>;
    exceptionType: zod_1.ZodEnum<["holiday", "leave", "training", "other"]>;
    hoursAvailable: zod_1.ZodNumber;
    reason: zod_1.ZodString;
    isApproved: zod_1.ZodDefault<zod_1.ZodBoolean>;
    approvedBy: zod_1.ZodOptional<zod_1.ZodString>;
    approvedAt: zod_1.ZodOptional<zod_1.ZodUnion<[zod_1.ZodDate, zod_1.ZodString]>>;
    createdAt: zod_1.ZodOptional<zod_1.ZodUnion<[zod_1.ZodDate, zod_1.ZodString]>>;
}, "strip", zod_1.ZodTypeAny, {
    employeeId: string;
    reason: string;
    exceptionDate: string | Date;
    exceptionType: "holiday" | "leave" | "training" | "other";
    hoursAvailable: number;
    isApproved: boolean;
    id?: string | undefined;
    createdAt?: string | Date | undefined;
    exceptionEndDate?: string | Date | undefined;
    approvedBy?: string | undefined;
    approvedAt?: string | Date | undefined;
}, {
    employeeId: string;
    reason: string;
    exceptionDate: string | Date;
    exceptionType: "holiday" | "leave" | "training" | "other";
    hoursAvailable: number;
    id?: string | undefined;
    createdAt?: string | Date | undefined;
    exceptionEndDate?: string | Date | undefined;
    isApproved?: boolean | undefined;
    approvedBy?: string | undefined;
    approvedAt?: string | Date | undefined;
}>;
export const HolidaySchema: zod_1.ZodObject<{
    id: zod_1.ZodOptional<zod_1.ZodString>;
    holidayDate: zod_1.ZodUnion<[zod_1.ZodDate, zod_1.ZodString]>;
    name: zod_1.ZodString;
    country: zod_1.ZodOptional<zod_1.ZodString>;
    region: zod_1.ZodOptional<zod_1.ZodString>;
    isCompanyWide: zod_1.ZodDefault<zod_1.ZodBoolean>;
    isActive: zod_1.ZodDefault<zod_1.ZodBoolean>;
}, "strip", zod_1.ZodTypeAny, {
    isActive: boolean;
    name: string;
    holidayDate: string | Date;
    isCompanyWide: boolean;
    id?: string | undefined;
    country?: string | undefined;
    region?: string | undefined;
}, {
    name: string;
    holidayDate: string | Date;
    isActive?: boolean | undefined;
    id?: string | undefined;
    country?: string | undefined;
    region?: string | undefined;
    isCompanyWide?: boolean | undefined;
}>;
export const EffectiveAvailabilitySchema: zod_1.ZodObject<{
    employeeId: zod_1.ZodString;
    date: zod_1.ZodDate;
    baseHours: zod_1.ZodNumber;
    adjustedHours: zod_1.ZodNumber;
    isHoliday: zod_1.ZodBoolean;
    isException: zod_1.ZodBoolean;
    exceptionReason: zod_1.ZodOptional<zod_1.ZodString>;
    patternId: zod_1.ZodOptional<zod_1.ZodString>;
}, "strip", zod_1.ZodTypeAny, {
    employeeId: string;
    date: Date;
    baseHours: number;
    adjustedHours: number;
    isHoliday: boolean;
    isException: boolean;
    exceptionReason?: string | undefined;
    patternId?: string | undefined;
}, {
    employeeId: string;
    date: Date;
    baseHours: number;
    adjustedHours: number;
    isHoliday: boolean;
    isException: boolean;
    exceptionReason?: string | undefined;
    patternId?: string | undefined;
}>;
import zod_1 = require("zod");
export class AvailabilityPatternService {
    constructor(db: any, cacheService: any, websocketService: any);
    db: any;
    cache: any;
    ws: any;
    createPattern(pattern: any): Promise<{
        id: any;
        employeeId: any;
        patternType: any;
        configuration: any;
        effectiveFrom: any;
        effectiveTo: any;
        isActive: any;
        notes: any;
    }>;
    updatePattern(patternId: any, updates: any): Promise<{
        id: any;
        employeeId: any;
        patternType: any;
        configuration: any;
        effectiveFrom: any;
        effectiveTo: any;
        isActive: any;
        notes: any;
    }>;
    getEmployeePatterns(employeeId: any, activeOnly?: boolean): Promise<any>;
    createException(exception: any): Promise<{
        id: any;
        employeeId: any;
        exceptionDate: any;
        exceptionEndDate: any;
        exceptionType: any;
        hoursAvailable: number;
        reason: any;
        isApproved: any;
        approvedBy: any;
        approvedAt: any;
        createdAt: any;
    }>;
    approveException(exceptionId: any, approvedBy: any): Promise<{
        id: any;
        employeeId: any;
        exceptionDate: any;
        exceptionEndDate: any;
        exceptionType: any;
        hoursAvailable: number;
        reason: any;
        isApproved: any;
        approvedBy: any;
        approvedAt: any;
        createdAt: any;
    }>;
    getEmployeeExceptions(employeeId: any, startDate: any, endDate: any, approvedOnly?: boolean): Promise<any>;
    getHolidays(startDate: any, endDate: any, country: any, region: any): Promise<any>;
    createHoliday(holiday: any): Promise<{
        id: any;
        holidayDate: any;
        name: any;
        country: any;
        region: any;
        isCompanyWide: any;
        isActive: any;
    }>;
    getEffectiveAvailability(employeeId: any, date: any): Promise<any>;
    getAvailabilityRange(employeeId: any, startDate: any, endDate: any): Promise<any[]>;
    bulkUpdatePatterns(updates: any): Promise<void>;
    getPatternById(patternId: any): Promise<{
        id: any;
        employeeId: any;
        patternType: any;
        configuration: any;
        effectiveFrom: any;
        effectiveTo: any;
        isActive: any;
        notes: any;
    } | null>;
    deletePattern(patternId: any): Promise<void>;
    getExceptions(employeeId: any, startDate: any, endDate: any): Promise<any>;
    updateException(exceptionId: any, updates: any): Promise<{
        id: any;
        employeeId: any;
        exceptionDate: any;
        exceptionEndDate: any;
        exceptionType: any;
        hoursAvailable: number;
        reason: any;
        isApproved: any;
        approvedBy: any;
        approvedAt: any;
        createdAt: any;
    }>;
    deleteException(exceptionId: any): Promise<void>;
    updateHoliday(holidayId: any, updates: any): Promise<{
        id: any;
        holidayDate: any;
        name: any;
        country: any;
        region: any;
        isCompanyWide: any;
        isActive: any;
    }>;
    deleteHoliday(holidayId: any): Promise<void>;
    triggerCapacityRecalculation(client: any, employeeId: any, startDate: any, endDate: any): Promise<void>;
    triggerGlobalCapacityRecalculation(date: any): Promise<void>;
    calculateDailyHours(pattern: any, date: any): any;
    clearEmployeeCache(employeeId: any): Promise<void>;
    formatPattern(row: any): {
        id: any;
        employeeId: any;
        patternType: any;
        configuration: any;
        effectiveFrom: any;
        effectiveTo: any;
        isActive: any;
        notes: any;
    };
    formatException(row: any): {
        id: any;
        employeeId: any;
        exceptionDate: any;
        exceptionEndDate: any;
        exceptionType: any;
        hoursAvailable: number;
        reason: any;
        isApproved: any;
        approvedBy: any;
        approvedAt: any;
        createdAt: any;
    };
    formatHoliday(row: any): {
        id: any;
        holidayDate: any;
        name: any;
        country: any;
        region: any;
        isCompanyWide: any;
        isActive: any;
    };
}
//# sourceMappingURL=availability-pattern.service.d.ts.map