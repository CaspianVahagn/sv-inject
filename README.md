# @sv-inject

A lightweight, TypeScript-based dependency injection system designed for Astro applications with SSR support.

## Installation

```bash
npm install @sv-inject/core
```

## Features

- Service registration and injection
- Constructor parameter injection
- Request-scoped containers for SSR
- Lifecycle hooks for initialization
- Astro-specific integrations

## Usage

### Creating an Injectable Service

```typescript
import { Service, inject } from '@sv-inject/core';

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
import { svInject } from '@sv-inject/core';
import { AuthService } from './services/auth.service';

// In a component
const authService = svInject(AuthService);
authService.authenticate(credentials);
```

### Creating a Request-Scoped Context (SSR)

```typescript
import { makeInjectionContext, type ApplicationConfig } from '@sv-inject/core';

// In an Astro middleware
export const MyMiddleware = defineMiddleware(async (context, next) => {
  return new Promise<Response>(async (resolve, reject) => {
    // Define request-specific configuration
    const ssrConfig: ApplicationConfig = [
      {
        token: { id: 'REQUEST' },
        provide: context.request,
      },
      {
        token: { id: 'COOKIES' },
        provide: context.cookies,
      }
    ];

    // Create a unique container for this request
    makeInjectionContext(async () => {
      const response = await next();
      resolve(response);
    }, ssrConfig).catch(reject);
  });
});
```

## API Reference

See the [full documentation](https://github.com/yourusername/sv-inject) for a complete API reference.

## License

ISC