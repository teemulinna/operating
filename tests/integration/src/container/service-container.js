"use strict";
/**
 * Dependency Injection Container for Employee Management System
 * Manages service lifecycles and dependencies
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveService = exports.registerService = exports.container = exports.ServiceContainer = void 0;
exports.Injectable = Injectable;
exports.Inject = Inject;
class ServiceContainer {
    constructor() {
        this.services = new Map();
    }
    /**
     * Get the singleton container instance
     */
    static getInstance() {
        if (!ServiceContainer.instance) {
            ServiceContainer.instance = new ServiceContainer();
        }
        return ServiceContainer.instance;
    }
    /**
     * Reset container (for testing)
     */
    static resetInstance() {
        ServiceContainer.instance = null;
    }
    /**
     * Register a service as a singleton
     */
    registerSingleton(name, factory) {
        this.services.set(name, {
            factory,
            singleton: true
        });
    }
    /**
     * Register a service as transient (new instance each time)
     */
    registerTransient(name, factory) {
        this.services.set(name, {
            factory,
            singleton: false
        });
    }
    /**
     * Register a service class as singleton
     */
    registerSingletonClass(name, constructor) {
        this.registerSingleton(name, () => new constructor());
    }
    /**
     * Register a service class as transient
     */
    registerTransientClass(name, constructor) {
        this.registerTransient(name, () => new constructor());
    }
    /**
     * Register a service instance directly
     */
    registerInstance(name, instance) {
        this.services.set(name, {
            factory: () => instance,
            singleton: true,
            instance
        });
    }
    /**
     * Resolve a service by name
     */
    resolve(name) {
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
    hasService(name) {
        return this.services.has(name);
    }
    /**
     * Get all registered service names
     */
    getServiceNames() {
        return Array.from(this.services.keys());
    }
    /**
     * Clear all services (for testing)
     */
    clear() {
        this.services.clear();
    }
    /**
     * Get service definition (for debugging)
     */
    getServiceDefinition(name) {
        return this.services.get(name);
    }
}
exports.ServiceContainer = ServiceContainer;
ServiceContainer.instance = null;
/**
 * Global container instance for easy access
 */
exports.container = ServiceContainer.getInstance();
/**
 * Service registration helper functions
 */
exports.registerService = {
    singleton: (name, factory) => exports.container.registerSingleton(name, factory),
    transient: (name, factory) => exports.container.registerTransient(name, factory),
    singletonClass: (name, constructor) => exports.container.registerSingletonClass(name, constructor),
    transientClass: (name, constructor) => exports.container.registerTransientClass(name, constructor),
    instance: (name, instance) => exports.container.registerInstance(name, instance),
};
/**
 * Service resolution helper function
 */
const resolveService = (name) => exports.container.resolve(name);
exports.resolveService = resolveService;
/**
 * Decorator for automatic dependency injection (optional advanced feature)
 */
function Injectable(serviceName) {
    return function (constructor) {
        const name = serviceName || constructor.name;
        exports.container.registerSingletonClass(name, constructor);
        return constructor;
    };
}
/**
 * Decorator for injecting dependencies (optional advanced feature)
 */
function Inject(serviceName) {
    return function (target, propertyKey) {
        // This would require reflect-metadata for full implementation
        // For now, we'll use manual injection in constructors
        const getter = () => exports.container.resolve(serviceName);
        Object.defineProperty(target, propertyKey, {
            get: getter,
            enumerable: true,
            configurable: true
        });
    };
}
