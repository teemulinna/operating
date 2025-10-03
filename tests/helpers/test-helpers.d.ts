export declare const VIEWPORTS: {
    mobile: {
        width: number;
        height: number;
    };
    tablet: {
        width: number;
        height: number;
    };
    desktop: {
        width: number;
        height: number;
    };
    wide: {
        width: number;
        height: number;
    };
};
export declare class TestHelpers {
    static waitForElement(page: any, selector: string, timeout?: number): Promise<any>;
    static fillFormField(page: any, selector: string, value: string): Promise<void>;
    static verifyLoading(page: any, isLoading: boolean): Promise<void>;
}
//# sourceMappingURL=test-helpers.d.ts.map