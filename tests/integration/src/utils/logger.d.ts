export const __esModule: boolean;
export namespace LogLevels {
    namespace ERROR {
        let name: string;
        let value: number;
        let color: string;
    }
    namespace WARN {
        let name_1: string;
        export { name_1 as name };
        let value_1: number;
        export { value_1 as value };
        let color_1: string;
        export { color_1 as color };
    }
    namespace INFO {
        let name_2: string;
        export { name_2 as name };
        let value_2: number;
        export { value_2 as value };
        let color_2: string;
        export { color_2 as color };
    }
    namespace DEBUG {
        let name_3: string;
        export { name_3 as name };
        let value_3: number;
        export { value_3 as value };
        let color_3: string;
        export { color_3 as color };
    }
}
export const logger: any;
export class Logger {
    static getInstance(): any;
    logLevel: any;
    shouldLog(level: any): boolean;
    formatMessage(level: any, message: any, ...args: any[]): string;
    error(message: any, ...args: any[]): void;
    warn(message: any, ...args: any[]): void;
    info(message: any, ...args: any[]): void;
    debug(message: any, ...args: any[]): void;
    setLogLevel(level: any): void;
    getLogLevel(): any;
    ml(message: any, ...args: any[]): void;
    perf(message: any, duration: any, ...args: any[]): void;
    child(prefix: any): ChildLogger;
}
export class ChildLogger {
    constructor(parent: any, prefix: any);
    parent: any;
    prefix: any;
    error(message: any, ...args: any[]): void;
    warn(message: any, ...args: any[]): void;
    info(message: any, ...args: any[]): void;
    debug(message: any, ...args: any[]): void;
    ml(message: any, ...args: any[]): void;
    perf(message: any, duration: any, ...args: any[]): void;
}
//# sourceMappingURL=logger.d.ts.map