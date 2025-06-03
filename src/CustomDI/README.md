# CustomDI - Dependency Injection System

A lightweight, TypeScript-based dependency injection system designed for Astro applications with SSR support.

## Overview

This dependency injection (DI) system provides a way to manage dependencies between components in your application. It supports:

- Service registration and injection
- Constructor parameter injection
- Request-scoped containers for SSR
- Lifecycle hooks for initialization
- Astro-specific integrations

## Key Components

### Container (`Container.ts`)

The core container that manages the registry of injectable services. It handles:
- Service registration and retrieval
- Dependency resolution
- Configuration loading
- Lifecycle management

### Decorators and Utilities (`AppInjector.ts`)

Provides decorators and utility functions for dependency injection:
- `@Service()` - Marks a class as injectable
- `@inject()` - Marks constructor parameters for injection
- `initContainer()` - Initializes or retrieves the current container
- `svInject()` - Utility for Svelte component injection
- `fromAppContext()` - Retrieves a service from the application context

### SSR Context (`content.context.ts`)

Provides utilities for server-side rendering:
- `makeInjectionContext()` - Creates a PromiseLevel unique specific container for SSR requests, ensuring each request has its own isolated dependency container. This is crucial for maintaining request-specific state and dependencies in server-side rendering.

### Environment (`ENV.ts`)

Global environment object that stores:
- Platform environment variables
- Reference to the global container
- Host configuration

### SSR Utilities (`ssr-di.utils.ts`)

Utilities for SSR-specific dependency injection:
- `SSR_Storage` - AsyncLocalStorage for maintaining per-request state
- `CONTAINER_KEY` - Key for storing the container in AsyncLocalStorage

### Lifecycle Hooks (`life-cycle.types.ts`)

Interfaces for lifecycle management:
- `PostConstructable` - Interface for initialization after construction

### Astro Features (`astroFeatures/`)

Astro-specific integrations:
- `makeProviders()` - Creates providers with Astro-specific functionality

## Usage Examples

### Creating an Injectable Service

```typescript
import { Service, inject } from '@app-core/CustomDI/AppInjector.ts';

// Define a service
@Service()
class UserService {
  constructor() {
    // Service initialization
  }

  getUser(id: string) {
    // Implementation
  }

  // Optional lifecycle hook
  postConstruct() {
    // Initialization after construction
  }
}

// Define a service with dependencies
@Service()
class AuthService {
  constructor(
    @inject() private userService: UserService
  ) {
    // Service initialization
  }

  authenticate(credentials: any) {
    // Use injected userService
    const user = this.userService.getUser(credentials.userId);
    // Implementation
  }
}
```

### Using Services in Components

```typescript
import { svInject } from '@app-core/CustomDI/AppInjector.ts';
import { AuthService } from './services/auth.service.ts';

// In a Svelte component
const authService = svInject(AuthService);
authService.authenticate(credentials);
```

### Creating a Request-Scoped Context (SSR)

The `makeInjectionContext()` function is crucial for SSR (Server-Side Rendering) as it creates a unique container for each request, ensuring proper isolation of request-specific state. This is particularly important in Astro's middleware system.

Here's an example based on the transfer-state middleware:

```typescript
import { type ApplicationConfig } from '@app-core/CustomDI/AppInjector.ts';
import { makeInjectionContext } from '@app-core/CustomDI/content.context.ts';
import { COOKIES, REQUEST } from '../core/tokens.ts';

// In an Astro middleware
export const MyMiddleware = defineMiddleware(async (context, next) => {
  return new Promise<Response>(async (resolve, reject) => {
    // Define request-specific configuration
    const ssrConfig: ApplicationConfig = [
      {
        token: REQUEST,
        provide: context.request,
      },
      {
        token: COOKIES,
        provide: context.cookies,
      }
    ];

    // Create a unique container for this request and execute the rendering process
    makeInjectionContext(async () => {
      // The code inside this callback has access to a request-scoped container
      // All services injected here will be unique to this request
      const response = await next();

      // Process the response
      resolve(response);
    }, ssrConfig).catch(reject);
  });
});
```

This pattern ensures that each SSR request has its own isolated dependency container, preventing state leakage between concurrent requests.

### Providing Custom Dependencies

```typescript
import { makeInjectionContext } from '@app-core/CustomDI/content.context.ts';

// Custom configuration
const config = [
  { 
    token: { id: 'ApiClient' }, 
    provide: new ApiClient('https://api.example.com') 
  },
  { 
    token: { id: 'Config' }, 
    provide: { apiKey: 'your-api-key' } 
  }
];

// Use custom configuration
makeInjectionContext(async () => {
  // Your code here
}, config);
```

### Using with Astro

```typescript
import { makeProviders } from '@app-core/CustomDI/astroFeatures/make.provider.ts';
import { initContainer } from '@app-core/CustomDI/AppInjector.ts';

// In an Astro component
const providers = makeProviders(Astro, {
  // Additional providers
  someService: new SomeService()
});

// Initialize container with Astro cookies
const container = initContainer(providers.astroCookies);
```

## API Reference

### Decorators

#### `@Service()`
Marks a class as injectable, making it available for dependency injection.

#### `@inject(options?)`
Marks a constructor parameter for injection.

Options:
- `key`: String identifier for the dependency
- `def`: Class reference for the dependency
- `token`: Token object with an id property

### Functions

#### `initContainer(): Container`
Initializes (once if not already initialized) and  retrieves the current container.

#### `svInject<T>(token: new (...args: any[]) => T): T`
Retrieves a service instance for use in Svelte components.

#### `svInjectOptional<T>(token: Tokenizable<T>): T | undefined`
Retrieves an optional service/token based class instance.

#### `fromAppContext<T>(clazz: { prototype: any }): T`
Retrieves a service from the application context.

#### `makeInjectionContext<T>(callback: () => Promise<T>, config?: ApplicationConfig): Promise<T>`
Creates a PromiseLevel unique specific container for SSR requests. This function is essential for server-side rendering as it:

1. Creates an isolated dependency container for each request using AsyncLocalStorage
2. Ensures that each SSR request has its own state, preventing cross-request contamination
3. Properly initializes the container with request-specific configuration
4. Wraps the rendering process in a promise-based context that maintains isolation

This is particularly important in middleware like the transfer-state middleware, where it wraps the promise that renders the SSR page, ensuring that each concurrent request maintains its own dependency context.

## Best Practices

1. Use `@Service()` for all injectable classes
2. Implement `postConstruct()` for initialization logic
3. Use `makeInjectionContext()` for SSR request handling
4. Prefer constructor injection over property injection
5. Use tokens with explicit IDs for non-class dependencies
