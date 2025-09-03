# JavaScript & TypeScript Style Guide

## 1. Core Principles

This guide provides a comprehensive set of standards for writing clean, modern, and maintainable JavaScript and TypeScript code. We prioritize a TypeScript-first approach to leverage static typing for building robust, scalable applications.

- **Clarity over Conciseness**: Code should be easy to read and understand, even for developers new to the project.
- **Consistency is Key**: Adhering to a consistent style across the codebase makes it more predictable and easier to navigate.
- **Automate Formatting**: We rely on Prettier for all stylistic formatting. All rules in this guide should be enforceable by our linting setup.
- **Embrace Modern Features**: Use modern ECMAScript (ES2020+) and TypeScript features to write more expressive and safer code.

---

## 2. Tooling

Our development process is enforced by the following tools. Manual deviation from their output is not permitted.

- **[Prettier](https://prettier.io/)**: An opinionated code formatter that enforces a consistent style by parsing your code and re-printing it.
  - **Configuration**: A `.prettierrc` file should be present at the root of the project. Key settings typically include `semi: true`, `singleQuote: true`, `trailingComma: 'es5'`, and `printWidth: 80`.
- **[ESLint](https://eslint.org/)**: A pluggable and configurable linter tool for identifying and reporting on patterns in JavaScript.
  - **Configuration**: A `.eslintrc.js` (or similar) file should define rules, plugins (e.g., `@typescript-eslint/eslint-plugin`, `eslint-plugin-react`, `eslint-plugin-react-hooks`), and parsing options.
- **[TypeScript](https://www.typescriptlang.org/)**: A typed superset of JavaScript that compiles to plain JavaScript.
  - **Configuration**: A `tsconfig.json` file controls the compiler options. It should be configured with `strict: true` to enable all strict type-checking options.

---

## 3. Naming Conventions

Clear and consistent naming is critical for readability.

- **Variables and Functions**: Use `camelCase`.
  ```typescript
  const userProfile = {};
  function calculateTotal(items) {
    // ...
  }
  ```
- **Classes, Enums, Types, Interfaces**: Use `PascalCase`.
  ```typescript
  class UserManager {
    // ...
  }
  type UserProfile = {
    // ...
  };
  enum UserRole {
    Admin,
    Editor,
  }
  ```
- **Constants**: Use `UPPER_SNAKE_CASE` for true, hard-coded constants (e.g., global settings, action types).
  ```typescript
  const MAX_LOGIN_ATTEMPTS = 5;
  const API_BASE_URL = 'https://api.example.com';
  ```
- **Boolean Variables**: Prefix with `is`, `has`, or `should`.
  ```typescript
  const isLoggedIn = true;
  const hasPermission = false;
  ```
- **Private/Internal Properties**: In TypeScript, use the `private` keyword. In JavaScript, use the `#` prefix for private class fields.

---

## 4. TypeScript Best Practices

- **Prefer Type Inference**: Let TypeScript infer types whenever possible. Only add explicit types when the inferred type is incorrect or to improve clarity on function signatures and public APIs.
  ```typescript
  // Good: Type is inferred as number
  const year = 2025;

  // Good: Explicitly type function parameters and return values
  function greet(name: string): string {
    return `Hello, ${name}`;
  }
  ```
- **Use `interface` for Public APIs, `type` for Applications**:
  - Use `interface` when defining the "shape" of an object or class that is part of a public API (e.g., a library). They are extensible via declaration merging.
  - Use `type` for all other use cases, including defining props, state, or complex types within your application. Types are more flexible and can represent unions, intersections, and primitives.
- **Embrace Utility Types**: Use built-in utility types like `Partial<T>`, `Readonly<T>`, `Pick<T, K>`, and `Omit<T, K>` to create new types from existing ones without boilerplate.
- **Avoid `any`**: The `any` type defeats the purpose of TypeScript. If you need a flexible type, prefer `unknown` and perform type-checking before using the value.

---

## 5. React & JSX Style

- **Component Naming**: Use `PascalCase` for component file names and the component itself (e.g., `UserProfile.tsx`).
- **Functional Components with Hooks**: All new components must be functional components using React Hooks. Class components are considered legacy.
- **Component Structure**:
  1.  Imports
  2.  Component Definition (`const MyComponent = (...) => { ... }`)
  3.  State and Ref declarations (`useState`, `useRef`)
  4.  Effect hooks (`useEffect`, `useLayoutEffect`)
  5.  Other hooks and helper functions
  6.  Return statement (JSX)
  7.  `export default MyComponent`
- **Props**:
  - Use TypeScript `type` definitions for props.
  - Destructure props in the function signature.
  ```typescript
  type UserAvatarProps = {
    imageUrl: string;
    altText: string;
    size?: 'small' | 'large';
  };

  const UserAvatar = ({ imageUrl, altText, size = 'small' }: UserAvatarProps) => {
    // ...
  };
  ```
- **JSX Formatting**:
  - For multi-line JSX, wrap the entire expression in parentheses.
  - When props don't fit on one line, put one prop per line, indented.
  ```jsx
  <Button
    variant="primary"
    size="large"
    onClick={handleClick}
  >
    Submit
  </Button>
  ```
- **Hooks**:
  - Only call Hooks at the top level of your React function.
  - Adhere to the `eslint-plugin-react-hooks` rules (`rules-of-hooks` and `exhaustive-deps`).

---

## 6. Node.js Backend Style

- **Async/Await**: Use `async/await` for all asynchronous operations. Avoid raw Promises (`.then()`, `.catch()`) for flow control.
- **Error Handling**: Use `try...catch` blocks within async functions to handle errors gracefully. Create and use a centralized error handling middleware in Express/Fastify.
- **Environment Variables**: All configuration should be managed through environment variables. Use a library like `dotenv` for local development, and access variables via `process.env`. A `env.mjs` or `env.ts` file can be used to validate and export typed environment variables.
- **Modules**: Use ES Modules (`import`/`export`) syntax. Set `"type": "module"` in your `package.json`.

---

## 7. Imports and Exports

- **Ordering**: Group and order imports to improve readability.
  1.  React and other external library imports
  2.  Internal absolute imports (from other parts of the app)
  3.  Internal relative imports
  4.  Style imports
  ```typescript
  import React, { useState } from 'react';
  import { Button } from '@/components/ui/Button';
  import { api } from '@/lib/api';
  import { useCurrentUser } from '@/hooks/useCurrentUser';
  import { OtherComponent } from './OtherComponent';
  import './styles.css';
  ```
- **Default vs. Named Exports**:
  - Prefer named exports for most utilities and helpers to maintain clarity at the import site.
  - Use a single default export for components, pages, or main module files.

---

## 8. Testing

- **Framework**: Use Jest or Vitest for unit and integration tests. Use React Testing Library for component testing.
- **File Location**: Test files should be co-located with the source files they are testing, using the `.test.ts` or `.spec.ts` extension (e.g., `MyComponent.tsx` and `MyComponent.test.tsx`).
- **Test Structure**: Use the "Arrange, Act, Assert" pattern to structure your tests.
- **Coverage**: Aim for high test coverage, especially for critical business logic, but prioritize meaningful tests over hitting a specific percentage.