export const __esModule: boolean;
export const CostType: {};
export const RateType: {};
export const BillingType: {};
export class ResourceCostModel {
    static initialize(pool: any): void;
    static create(input: any): Promise<{
        id: any;
        employeeId: any;
        baseRate: number;
        costType: any;
        rateType: any;
        billingType: any;
        currency: any;
        costCenterCode: any;
        costCenterName: any;
        effectiveDate: any;
        endDate: any;
        isActive: any;
        createdAt: any;
        updatedAt: any;
        createdBy: any;
        updatedBy: any;
    }>;
    static findByEmployeeId(employeeId: any, effectiveDate: any): Promise<any>;
    static getCurrentRateForEmployee(employeeId: any): Promise<any>;
    static update(id: any, updates: any): Promise<{
        id: any;
        employeeId: any;
        baseRate: number;
        costType: any;
        rateType: any;
        billingType: any;
        currency: any;
        costCenterCode: any;
        costCenterName: any;
        effectiveDate: any;
        endDate: any;
        isActive: any;
        createdAt: any;
        updatedAt: any;
        createdBy: any;
        updatedBy: any;
    }>;
    static getTotalCompensationRate(resourceCost: any): number;
    static getProfitMargin(resourceCost: any): number;
    static mapRow(row: any): {
        id: any;
        employeeId: any;
        baseRate: number;
        costType: any;
        rateType: any;
        billingType: any;
        currency: any;
        costCenterCode: any;
        costCenterName: any;
        effectiveDate: any;
        endDate: any;
        isActive: any;
        createdAt: any;
        updatedAt: any;
        createdBy: any;
        updatedBy: any;
    };
}
export namespace ResourceCostModel {
    let pool: any;
    let db: any;
}
//# sourceMappingURL=ResourceCost.d.ts.map