/**
 * Dependency Injection Container for Employee Management System
 * Manages service lifecycles and dependencies
 */

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

export class ServiceContainer {
  private services: Map<string, ServiceDefinition> = new Map();
  private static instance: ServiceContainer | null = null;

  private constructor() {}

  /**
   * Get the singleton container instance
   */
  public static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }

  /**
   * Reset container (for testing)
   */
  public static resetInstance(): void {
    ServiceContainer.instance = null;
  }

  /**
   * Register a service as a singleton
   */
  public registerSingleton<T>(name: string, factory: ServiceFactory<T>): void {
    this.services.set(name, {
      factory,
      singleton: true
    });
  }

  /**
   * Register a service as transient (new instance each time)
   */
  public registerTransient<T>(name: string, factory: ServiceFactory<T>): void {
    this.services.set(name, {
      factory,
      singleton: false
    });
  }

  /**
   * Register a service class as singleton
   */
  public registerSingletonClass<T>(name: string, constructor: ServiceConstructor<T>): void {
    this.registerSingleton(name, () => new constructor());
  }

  /**
   * Register a service class as transient
   */
  public registerTransientClass<T>(name: string, constructor: ServiceConstructor<T>): void {
    this.registerTransient(name, () => new constructor());
  }

  /**
   * Register a service instance directly
   */
  public registerInstance<T>(name: string, instance: T): void {
    this.services.set(name, {
      factory: () => instance,
      singleton: true,
      instance
    });
  }

  /**
   * Resolve a service by name
   */
  public resolve<T>(name: string): T {
    const serviceDefinition = this.services.get(name);
    
    if (!serviceDefinition) {
      throw new Error(`Service '${name}' not registered`);
    }

    // Return cached instance for singletons
    if (serviceDefinition.singleton && serviceDefinition.instance) {
      return serviceDefinition.instance;
    }

    // Create new instance
    const instance = serviceDefinition.factory();

    // Cache singleton instances
    if (serviceDefinition.singleton) {
      serviceDefinition.instance = instance;
    }

    return instance;
  }

  /**
   * Check if a service is registered
   */
  public hasService(name: string): boolean {
    return this.services.has(name);
  }

  /**
   * Get all registered service names
   */
  public getServiceNames(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * Clear all services (for testing)
   */
  public clear(): void {
    this.services.clear();
  }

  /**
   * Get service definition (for debugging)
   */
  public getServiceDefinition(name: string): ServiceDefinition | undefined {
    return this.services.get(name);
  }
}

/**
 * Global container instance for easy access
 */
export const container = ServiceContainer.getInstance();

/**
 * Service registration helper functions
 */
export const registerService = {
  singleton: <T>(name: string, factory: ServiceFactory<T>) => 
    container.registerSingleton(name, factory),
  
  transient: <T>(name: string, factory: ServiceFactory<T>) => 
    container.registerTransient(name, factory),
  
  singletonClass: <T>(name: string, constructor: ServiceConstructor<T>) => 
    container.registerSingletonClass(name, constructor),
  
  transientClass: <T>(name: string, constructor: ServiceConstructor<T>) => 
    container.registerTransientClass(name, constructor),
  
  instance: <T>(name: string, instance: T) => 
    container.registerInstance(name, instance),
};

/**
 * Service resolution helper function
 */
export const resolveService = <T>(name: string): T => container.resolve<T>(name);

/**
 * Decorator for automatic dependency injection (optional advanced feature)
 */
export function Injectable(serviceName?: string) {
  return function <T extends ServiceConstructor>(constructor: T) {
    const name = serviceName || constructor.name;
    container.registerSingletonClass(name, constructor);
    return constructor;
  };
}

/**
 * Decorator for injecting dependencies (optional advanced feature)
 */
export function Inject(serviceName: string) {
  return function (target: any, propertyKey: string | symbol) {
    // This would require reflect-metadata for full implementation
    // For now, we'll use manual injection in constructors
    const getter = () => container.resolve(serviceName);
    Object.defineProperty(target, propertyKey, {
      get: getter,
      enumerable: true,
      configurable: true
    });
  };
}