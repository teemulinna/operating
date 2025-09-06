interface ServiceConstructor<T = any> {
    new (...args: any[]): T;
}
interface ServiceFactory<T = any> {
    (): T;
}
type ServiceDefinition<T = any> = {
    factory: ServiceFactory<T>;
    singleton: boolean;
    instance?: T;
};
export declare class ServiceContainer {
    private services;
    private static instance;
    private constructor();
    static getInstance(): ServiceContainer;
    static resetInstance(): void;
    registerSingleton<T>(name: string, factory: ServiceFactory<T>): void;
    registerTransient<T>(name: string, factory: ServiceFactory<T>): void;
    registerSingletonClass<T>(name: string, constructor: ServiceConstructor<T>): void;
    registerTransientClass<T>(name: string, constructor: ServiceConstructor<T>): void;
    registerInstance<T>(name: string, instance: T): void;
    resolve<T>(name: string): T;
    hasService(name: string): boolean;
    getServiceNames(): string[];
    clear(): void;
    getServiceDefinition(name: string): ServiceDefinition | undefined;
}
export declare const container: ServiceContainer;
export declare const registerService: {
    singleton: <T>(name: string, factory: ServiceFactory<T>) => void;
    transient: <T>(name: string, factory: ServiceFactory<T>) => void;
    singletonClass: <T>(name: string, constructor: ServiceConstructor<T>) => void;
    transientClass: <T>(name: string, constructor: ServiceConstructor<T>) => void;
    instance: <T>(name: string, instance: T) => void;
};
export declare const resolveService: <T>(name: string) => T;
export declare function Injectable(serviceName?: string): <T extends ServiceConstructor>(constructor: T) => T;
export declare function Inject(serviceName: string): (target: any, propertyKey: string | symbol) => void;
export {};
//# sourceMappingURL=service-container.d.ts.map