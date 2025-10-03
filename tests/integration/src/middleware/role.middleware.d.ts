export const __esModule: boolean;
export function roleGuard(allowedRoles: any): (req: any, res: any, next: any) => any;
export function permissionGuard(requiredPermissions: any): (req: any, res: any, next: any) => any;
export function roleOrPermissionGuard(allowedRoles: any, requiredPermissions: any): (req: any, res: any, next: any) => any;
export function ownershipGuard(resourceIdParam?: string): (req: any, res: any, next: any) => any;
export function departmentGuard(): (req: any, res: any, next: any) => Promise<any>;
//# sourceMappingURL=role.middleware.d.ts.map