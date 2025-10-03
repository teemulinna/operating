export const __esModule: boolean;
export const container: any;
export namespace registerService {
    function singleton(name: any, factory: any): any;
    function transient(name: any, factory: any): any;
    function singletonClass(name: any, constructor: any): any;
    function transientClass(name: any, constructor: any): any;
    function instance(name: any, instance: any): any;
}
export function Injectable(serviceName: any): (constructor: any) => any;
export function Inject(serviceName: any): (target: any, propertyKey: any) => void;
export class ServiceContainer {
    static getInstance(): any;
    static resetInstance(): void;
    services: Map<any, any>;
    registerSingleton(name: any, factory: any): void;
    registerTransient(name: any, factory: any): void;
    registerSingletonClass(name: any, constructor: any): void;
    registerTransientClass(name: any, constructor: any): void;
    registerInstance(name: any, instance: any): void;
    resolve(name: any): any;
    hasService(name: any): boolean;
    getServiceNames(): any[];
    clear(): void;
    getServiceDefinition(name: any): any;
}
export namespace ServiceContainer {
    let instance_1: any;
    export { instance_1 as instance };
}
export function resolveService(name: any): any;
//# sourceMappingURL=service-container.d.ts.map