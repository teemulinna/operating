export declare const mockPersons: {
    id: number;
    name: string;
    age: number;
    occupation: string;
    email: string;
    phone: string;
    address: string;
    department: string;
    skills: string[];
}[];
export declare const invalidPersonData: {
    missingName: {
        age: number;
        occupation: string;
        email: string;
    };
    invalidAge: {
        name: string;
        age: number;
        occupation: string;
        email: string;
    };
    invalidEmail: {
        name: string;
        age: number;
        occupation: string;
        email: string;
    };
    emptyFields: {
        name: string;
        age: string;
        occupation: string;
        email: string;
    };
};
export declare const testProjects: {
    id: number;
    name: string;
    description: string;
    startDate: string;
    endDate: string;
    status: string;
    budget: number;
    requiredSkills: string[];
}[];
export declare const testAllocations: {
    employeeId: number;
    projectId: number;
    role: string;
    allocation: number;
    startDate: string;
    endDate: string;
}[];
export declare const testSkills: {
    name: string;
    category: string;
    level: string;
}[];
export declare const testDepartments: {
    id: number;
    name: string;
    manager: string;
    budget: number;
}[];
export declare const validCSVData = "name,age,occupation,email,department\nJohn Doe,30,Software Engineer,john@example.com,Engineering\nJane Smith,28,Product Manager,jane@example.com,Product\nBob Johnson,35,UX Designer,bob@example.com,Design";
export declare const invalidCSVData = "name,age,occupation\nMissing Email,30,Developer\nInvalid Age,not-a-number,Designer,invalid@example.com\n,25,Empty Name,empty@example.com";
export declare const testSelectors: {
    navbar: string;
    sidebar: string;
    mainContent: string;
    addPersonBtn: string;
    personForm: string;
    nameInput: string;
    ageInput: string;
    occupationInput: string;
    emailInput: string;
    phoneInput: string;
    addressInput: string;
    savePersonBtn: string;
    cancelBtn: string;
    personList: string;
    personCard: string;
    editBtn: string;
    deleteBtn: string;
    successMessage: string;
    errorMessage: string;
    loadingSpinner: string;
    searchInput: string;
    departmentFilter: string;
    skillFilter: string;
    prevPageBtn: string;
    nextPageBtn: string;
    pageInfo: string;
};
export declare const performanceThresholds: {
    pageLoad: number;
    apiResponse: number;
    formSubmission: number;
    searchResponse: number;
    firstContentfulPaint: number;
    timeToInteractive: number;
};
declare const _default: {
    mockPersons: {
        id: number;
        name: string;
        age: number;
        occupation: string;
        email: string;
        phone: string;
        address: string;
        department: string;
        skills: string[];
    }[];
    invalidPersonData: {
        missingName: {
            age: number;
            occupation: string;
            email: string;
        };
        invalidAge: {
            name: string;
            age: number;
            occupation: string;
            email: string;
        };
        invalidEmail: {
            name: string;
            age: number;
            occupation: string;
            email: string;
        };
        emptyFields: {
            name: string;
            age: string;
            occupation: string;
            email: string;
        };
    };
    testProjects: {
        id: number;
        name: string;
        description: string;
        startDate: string;
        endDate: string;
        status: string;
        budget: number;
        requiredSkills: string[];
    }[];
    testAllocations: {
        employeeId: number;
        projectId: number;
        role: string;
        allocation: number;
        startDate: string;
        endDate: string;
    }[];
    testSkills: {
        name: string;
        category: string;
        level: string;
    }[];
    testDepartments: {
        id: number;
        name: string;
        manager: string;
        budget: number;
    }[];
    validCSVData: string;
    invalidCSVData: string;
    testSelectors: {
        navbar: string;
        sidebar: string;
        mainContent: string;
        addPersonBtn: string;
        personForm: string;
        nameInput: string;
        ageInput: string;
        occupationInput: string;
        emailInput: string;
        phoneInput: string;
        addressInput: string;
        savePersonBtn: string;
        cancelBtn: string;
        personList: string;
        personCard: string;
        editBtn: string;
        deleteBtn: string;
        successMessage: string;
        errorMessage: string;
        loadingSpinner: string;
        searchInput: string;
        departmentFilter: string;
        skillFilter: string;
        prevPageBtn: string;
        nextPageBtn: string;
        pageInfo: string;
    };
    performanceThresholds: {
        pageLoad: number;
        apiResponse: number;
        formSubmission: number;
        searchResponse: number;
        firstContentfulPaint: number;
        timeToInteractive: number;
    };
};
export default _default;
//# sourceMappingURL=test-data.d.ts.map