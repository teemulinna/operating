"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveService = exports.registerService = exports.container = exports.ServiceContainer = void 0;
exports.Injectable = Injectable;
exports.Inject = Inject;
class ServiceContainer {
    constructor() {
        this.services = new Map();
    }
    static getInstance() {
        if (!ServiceContainer.instance) {
            ServiceContainer.instance = new ServiceContainer();
        }
        return ServiceContainer.instance;
    }
    static resetInstance() {
        ServiceContainer.instance = null;
    }
    registerSingleton(name, factory) {
        this.services.set(name, {
            factory,
            singleton: true
        });
    }
    registerTransient(name, factory) {
        this.services.set(name, {
            factory,
            singleton: false
        });
    }
    registerSingletonClass(name, constructor) {
        this.registerSingleton(name, () => new constructor());
    }
    registerTransientClass(name, constructor) {
        this.registerTransient(name, () => new constructor());
    }
    registerInstance(name, instance) {
        this.services.set(name, {
            factory: () => instance,
            singleton: true,
            instance
        });
    }
    resolve(name) {
        const serviceDefinition = this.services.get(name);
        if (!serviceDefinition) {
            throw new Error(`Service '${name}' not registered`);
        }
        if (serviceDefinition.singleton && serviceDefinition.instance) {
            return serviceDefinition.instance;
        }
        const instance = serviceDefinition.factory();
        if (serviceDefinition.singleton) {
            serviceDefinition.instance = instance;
        }
        return instance;
    }
    hasService(name) {
        return this.services.has(name);
    }
    getServiceNames() {
        return Array.from(this.services.keys());
    }
    clear() {
        this.services.clear();
    }
    getServiceDefinition(name) {
        return this.services.get(name);
    }
}
exports.ServiceContainer = ServiceContainer;
ServiceContainer.instance = null;
exports.container = ServiceContainer.getInstance();
exports.registerService = {
    singleton: (name, factory) => exports.container.registerSingleton(name, factory),
    transient: (name, factory) => exports.container.registerTransient(name, factory),
    singletonClass: (name, constructor) => exports.container.registerSingletonClass(name, constructor),
    transientClass: (name, constructor) => exports.container.registerTransientClass(name, constructor),
    instance: (name, instance) => exports.container.registerInstance(name, instance),
};
const resolveService = (name) => exports.container.resolve(name);
exports.resolveService = resolveService;
function Injectable(serviceName) {
    return function (constructor) {
        const name = serviceName || constructor.name;
        exports.container.registerSingletonClass(name, constructor);
        return constructor;
    };
}
function Inject(serviceName) {
    return function (target, propertyKey) {
        const getter = () => exports.container.resolve(serviceName);
        Object.defineProperty(target, propertyKey, {
            get: getter,
            enumerable: true,
            configurable: true
        });
    };
}
//# sourceMappingURL=service-container.js.map