# sv-inject

A lightweight, TypeScript-based dependency injection system designed primarily for Astro applications, with first-class SSR (Server-Side Rendering) support.

`sv-inject` provides a **framework-agnostic**, minimalistic DI system built on modern TypeScript features such as decorators and metadata. It supports **request-scoped service containers** to ensure safe and isolated service instances in concurrent server environments.

---

## 📑 Table of Contents

- [🚀 Features](#-features)
- [📦 Installation](#-installation)
- [🔰 Getting Started](#-getting-started)
  - [TypeScript Configuration](#️-typescript-configuration)
  - [Creating Injectable Services](#creating-injectable-services)
  - [Using Services in Components](#using-services-in-components)
- [🌐 SSR Support](#-ssr-support)
  - [Astro Example](#astro-example)
  - [NextJS Example](#nextjs-example)
- [📚 API Reference](#-api-reference)
  - [Core Decorators](#core-decorators)
  - [Injection Methods](#injection-methods)
  - [Container Management](#container-management)
  - [Configuration Methods](#configuration-methods)
  - [SSR Utilities](#ssr-utilities)
- [🔑 Token-Based Injection](#-token-based-injection)
  - [Defining Tokens](#defining-tokens)
  - [Application-Scoped Token Usage](#-application-scoped-token-usage)
  - [Optional SSR Tokens](#-optional-ssr-tokens)
- [⚙️ Advanced Usage](#️-advanced-usage)
  - [Lifecycle Awareness](#️-lifecycle-awareness)
  - [Singleton Scope and Manual Registration](#-singleton-scope-and-manual-registration)
  - [Injection Order & Circular Dependency Protection](#-injection-order--circular-dependency-protection)
- [❓ Why Request-Scoped Containers Matter](#-why-request-scoped-containers-matter)

---

## 🚀 Features

- ✅ Decorator-based service registration (`@Service()`) and dependency injection (`@inject()`)
- 🔁 Constructor parameter injection
- 📦 Request-scoped containers for safe SSR execution
- ⚙️ Lifecycle hooks (`postConstruct`)
- 🔌 Integrations for Astro, Next.js, and other Vite-based SSR frameworks
- 🛠 Framework-agnostic: use in any modern TypeScript SSR app

**important:** since this framework should be minimal, no "module scope" will be implemented.
If you fear "global state pollution", you have to add containers to the root injection context, yourself.

Multi token/instance etc is also not part of this projects scope.


---

## 📦 Installation

```bash
npm install sv-inject
```

## 🔰 Getting Started

### ⚙️ TypeScript Configuration

This library uses experimental decorators and metadata reflection. You must enable these options in your tsconfig.json:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

### Creating Injectable Services

```typescript
import { Service, inject } from 'sv-inject';

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
  private userService = svInject(UserService);
  
  constructor() {
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
import { svInject } from 'sv-inject';
import { AuthService } from './services/auth.service';

// In a component
const authService = svInject(AuthService);
authService.authenticate(credentials);
```

The `svInject()` function pulls the service instance from the current injection context (global or request-scoped).

## 🌐 SSR Support

In SSR (Server-Side Rendering), every HTTP request runs in a shared server environment. Without proper isolation, service instances can leak data between users. sv-inject solves this by providing request-scoped containers — each request gets its own dependency graph, preventing cross-request pollution.

These request containers are created with `makeInjectionContext()`, wrapping any async render or middleware logic.

For SSR capabilities in Astro, the application must be built in SSR mode (servermode), at least in standalone mode. The `makeInjectionContext` function is designed for Astro but works with any other Vite-based SSR app that has an app render cycle within a promise-based rendering system.

### Astro Example

```typescript
import { type ApplicationConfig } from 'sv-inject';
import { makeInjectionContext } from "sv-inject/server"



// In an Astro middleware
export const MyMiddleware = defineMiddleware(async (context, next) => {
  return new Promise<Response>(async (resolve, reject) => {
    // Define request-specific configuration
    const ssrConfig: ApplicationConfig = [
      {
        token: REQUEST_TOKEN,
        provide: context.request,
      },
      {
        token: COOKIES_TOKEN,
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

### SSR Detection

By default this library uses `import.meta.env.SSR` to detect SSR contexts. 
If this is not available in your framework you have to use:

`export function setSSRDetection(isSSRfn : () => boolean)`



### NextJS Example

```typescript
import { type ApplicationConfig, setSSRDetection } from 'sv-inject';
import { makeInjectionContext } from "sv-inject/server";
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

setSSRDetection(() => typeof window === "undefined");

// In a NextJS middleware
export async function middleware(request: NextRequest) {
  // Define request-specific configuration
  const ssrConfig: ApplicationConfig = [
    {
      token: { id: 'REQUEST' },
      provide: request,
    }
  ];

  // Create a unique container for this request and wrap the response
  return makeInjectionContext(async () => {
    // Process the request and get the response
    // You can perform any operations that need the injection context here
    const response = NextResponse.next();

    // You can also modify the response if needed
    response.headers.set('x-middleware-cache', 'no-cache');

    return response;
  }, ssrConfig);
}
```

## 📚 API Reference

### Core Decorators

#### `@Service()`

Marks a class as injectable, making it available for dependency injection.

```typescript
@Service()
class UserService {
  // Class implementation
}
```

#### `@inject(options?)`

Marks constructor parameters for injection.

```typescript
constructor(@inject() userService: UserService) {
  // Constructor implementation
}
```

Options:
- `key?: string` - Custom key for the injection
- `def?: { prototype: { constructor: Function } }` - Class definition
- `token?: Tokenizable` - Token for the injection

### Injection Methods

#### `svInject<T>(token: new (...args: any[]) => T): T`

Injects a service by class constructor, throws error if its not registered.

```typescript
const userService = svInject(UserService);
```

#### `svInjectOptional<T>(token: Tokenizable<T>): T | undefined`

Injects a service by token, returning undefined if not found.

```typescript
const request = svInjectOptional<Request>(REQUEST_TOKEN);
```

### Container Management

#### `initContainer(): Container`

Initializes or retrieves the DI container if it is already initialized.
A container will be initialized per request or on CSR on first render.

```typescript
const container = initContainer();
```

#### `Container`

The core container class for dependency injection.

Methods:
- `registerProvider(key: Tokenizable, providedInstance: any)`: Registers a provider with a token
- `register(key: string, instance: any)`: Registers an instance with a string key
- `getByToken<T>(token: Tokenizable<T>): T`: Gets an instance by token
- `getByTokenOptional<T>(token: Tokenizable): T | undefined`: Gets an instance by token, returning undefined if not found
- `getByClass<T>(token: new (...args: any[]) => T): T`: Gets an instance by class constructor
- `get<T>(key: string): T`: Gets an instance by string key
- `has(key: string): boolean`: Checks if an instance exists
- `loadConfig(config: ApplicationConfig)`: Loads configuration into the container
- `postConstruct()`: Calls postConstruct lifecycle hook on all registered instances

### Configuration Methods

#### `setGlobalAppConfig(config: ApplicationConfig)`

Sets the global application configuration for the application. 
In SSR mode, this is used to set the global configuration for the server, but it will not be request-scoped.

Setting the global config must happen in a suitable place of the app, before any container is initialized.
Suitable places should be: index.ts or similar. 


```typescript
import { createToken } from "./sv-inject";

const API_URL_TOKEN = createToken<string>("https://my.api.com")

setGlobalAppConfig([
  {
    token: { id: 'API_URL' },
    provide: 'https://api.example.com'
  }
]);
```

### SSR Utilities

#### `makeInjectionContext<T>(callback: () => Promise<T>, config?: ApplicationConfig): Promise<T>`

Creates an injection context utilizing async local storage and an application container. This method is mandatory for SSR request context aware injection containers.

```typescript
await makeInjectionContext(async () => {
  // Your SSR code here
  return response;
}, config);
```



## 🔑 Token-Based Injection

`sv-inject` supports **token-based dependency injection**, allowing you to inject services, values, or request-specific objects (like cookies or headers) without relying solely on class constructors.

### Defining Tokens

A token can be create with a unique `id`:

```ts
import { createToken } from "./sv-inject";
const REQUEST_TOKEN = createToken("REQUEST");
```

> 🟡 **Important:** All tokens must be **unique and non-empty**. Failing to do so may result in collisions or unexpected injection behavior.

### ✅ Application-Scoped Token Usage

It is **strongly advised** to define all tokens within your `ApplicationConfig`:

```ts
import { createToken } from "./sv-inject";

const REQUEST_TOKEN = createToken("REQUEST");

const config: ApplicationConfig = [
  {
    token: REQUEST_TOKEN,
    provide: request
  },
];
```

For the global AppConfig (or initial tokens/services etc):

- For Global and CSR with `setGlobalAppConfig(config)` in index of your application.
  > ⚠️ Important everything in this config will NOT be request scoped.
  > All configs that are request scoped on SSR must be used separately.
 
- For SSR with `makeInjectionContext(asyncfun, config)`.

These tokens are bound to the **request lifecycle**, ensuring safe and isolated access per user.

### 🧩 Optional SSR Tokens

Tokens that **only exist during SSR** should be marked as **optional** using:

```ts
import { createToken } from "./AppInjector";

const SSR_ONLY_TOKEN = createToken<MyType>("SSR_ONLY_TOKEN");

const value = svInjectOptional(SSR_ONLY_TOKEN);
```

This avoids runtime errors when rendering in non-SSR or static contexts.



## ⚙️ Advanced Usage

### ⚠️ Lifecycle Awareness

Do **not** access SSR-only tokens or runtime-injected tokens:

* In **global scope**
* In **constructor parameters**
* Outside the injection context

Instead, inject them dynamically or in the `postConstruct` lifecycle hook:

```ts
@Service()
class Example {
  private request: Request;

  postConstruct() {
    this.request = svInject({ id: 'REQUEST' });
  }
}
```



### 🔄 Singleton Scope and Manual Registration

All services in `sv-inject` are **singletons** by default within their container context.

If a service or state needs to be reused or injected dynamically, register it manually using:

```ts
initContainer().registerProvider(token, instance);
```

For example:

```ts
initContainer().registerProvider({ id: 'LOCALE' }, 'en-US');
```



### 🔄 Injection Order & Circular Dependency Protection

* Injection order is resolved automatically by the DI container.
* Circular dependencies are avoided through lazy resolution at decorator evaluation time.
* This ensures **predictable and safe injection flow**, even across complex service graphs.



## ❓ Why Request-Scoped Containers Matter

- In SSR environments, services may hold user-specific or request-specific state.
- Without isolation, shared service instances can leak data between users — a serious security issue.
- sv-inject creates a unique container per request, so services are safely scoped and reset for each incoming call.
- You can also inject request-specific tokens (like REQUEST, COOKIES, SESSION, etc.) into your services.