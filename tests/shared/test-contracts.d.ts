export namespace database {
    let required: string[];
    namespace schemas {
        namespace user {
            let testFields: string[];
            let constraints: string[];
            let relationships: string[];
        }
        namespace project {
            let testFields_1: string[];
            export { testFields_1 as testFields };
            let constraints_1: string[];
            export { constraints_1 as constraints };
            let relationships_1: string[];
            export { relationships_1 as relationships };
        }
        namespace resource {
            let testFields_2: string[];
            export { testFields_2 as testFields };
            let constraints_2: string[];
            export { constraints_2 as constraints };
            let relationships_2: string[];
            export { relationships_2 as relationships };
        }
    }
    namespace performanceRequirements {
        let connectionTime: string;
        let queryTime: string;
        let bulkInsert: string;
    }
}
export namespace backend {
    let required_1: string[];
    export { required_1 as required };
    export namespace endpoints {
        let auth: {
            'POST /api/auth/login': {
                input: {
                    email: string;
                    password: string;
                };
                output: {
                    token: string;
                    user: string;
                };
                errors: number[];
            };
            'POST /api/auth/logout': {
                input: {
                    token: string;
                };
                output: {
                    success: string;
                };
                errors: number[];
            };
        };
        let users: {
            'GET /api/users': {
                input: {
                    page: string;
                    limit: string;
                };
                output: {
                    users: string;
                    total: string;
                    page: string;
                };
                errors: number[];
            };
            'POST /api/users': {
                input: {
                    name: string;
                    email: string;
                    role: string;
                };
                output: {
                    user: string;
                };
                errors: number[];
            };
        };
        let projects: {
            'GET /api/projects': {
                input: {
                    userId: string;
                };
                output: {
                    projects: string;
                };
                errors: number[];
            };
            'POST /api/projects': {
                input: {
                    name: string;
                    description: string;
                };
                output: {
                    project: string;
                };
                errors: number[];
            };
        };
        let resources: {
            'GET /api/resources': {
                input: {
                    projectId: string;
                };
                output: {
                    resources: string;
                };
                errors: number[];
            };
            'POST /api/resources': {
                input: {
                    name: string;
                    type: string;
                    projectId: string;
                };
                output: {
                    resource: string;
                };
                errors: number[];
            };
        };
    }
    export namespace performanceRequirements_1 {
        let responseTime: string;
        let concurrency: string;
        let errorRate: string;
    }
    export { performanceRequirements_1 as performanceRequirements };
}
export namespace frontend {
    let required_2: string[];
    export { required_2 as required };
    export namespace components {
        namespace AuthComponent {
            let props: string[];
            let states: string[];
            let events: string[];
        }
        namespace UserList {
            let props_1: string[];
            export { props_1 as props };
            let states_1: string[];
            export { states_1 as states };
            let events_1: string[];
            export { events_1 as events };
        }
        namespace ProjectForm {
            let props_2: string[];
            export { props_2 as props };
            let states_2: string[];
            export { states_2 as states };
            let events_2: string[];
            export { events_2 as events };
        }
        namespace ResourceGrid {
            let props_3: string[];
            export { props_3 as props };
            let states_3: string[];
            export { states_3 as states };
            let events_3: string[];
            export { events_3 as events };
        }
    }
    export namespace performanceRequirements_2 {
        let renderTime: string;
        let bundleSize: string;
        let firstContentfulPaint: string;
    }
    export { performanceRequirements_2 as performanceRequirements };
}
export namespace integration {
    let scenarios: {
        name: string;
        teams: string[];
        steps: string[];
    }[];
    namespace sharedTestData {
        let users_1: {
            id: number;
            name: string;
            email: string;
            role: string;
        }[];
        export { users_1 as users };
        let projects_1: {
            id: number;
            name: string;
            ownerId: number;
            status: string;
        }[];
        export { projects_1 as projects };
        let resources_1: {
            id: number;
            name: string;
            type: string;
            projectId: number;
            availability: string;
        }[];
        export { resources_1 as resources };
    }
}
export namespace qualityGates {
    namespace coverage {
        let minimum: number;
        let branches: number;
        let functions: number;
        let lines: number;
    }
    namespace performance {
        export namespace database_1 {
            let queryTime_1: number;
            export { queryTime_1 as queryTime };
            let connectionTime_1: number;
            export { connectionTime_1 as connectionTime };
        }
        export { database_1 as database };
        export namespace backend_1 {
            let responseTime_1: number;
            export { responseTime_1 as responseTime };
            let errorRate_1: number;
            export { errorRate_1 as errorRate };
        }
        export { backend_1 as backend };
        export namespace frontend_1 {
            let renderTime_1: number;
            export { renderTime_1 as renderTime };
            let bundleSize_1: number;
            export { bundleSize_1 as bundleSize };
        }
        export { frontend_1 as frontend };
    }
    namespace security {
        let authentication: string;
        let authorization: string;
        let inputValidation: string;
        let sqlInjection: string;
        let xss: string;
    }
}
//# sourceMappingURL=test-contracts.d.ts.map