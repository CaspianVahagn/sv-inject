# sv-inject

A lightweight, TypeScript-based dependency injection system designed primarily for Astro applications, with first-class SSR (Server-Side Rendering) support.

`sv-inject` provides a **framework-agnostic**, minimalistic DI system built on modern TypeScript features such as decorators and metadata. It supports **request-scoped service containers** to ensure safe and isolated service instances in concurrent server environments.

---

## 📑 Table of Contents

- [🚀 Features](#-features)
- [📦 Installation](#-installation)
- [🔰 Getting Started](#-getting-started)
  - [TypeScript Configuration](#-typescript-configuration)
  - [Creating Injectable Services](#creating-injectable-classes-)
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
- [❓ Why Request-Scoped Containers Matter](#-why-request-scoped-containers-matter)

---

## 🚀 Features

- ✅ Decorator-based service registration (`@Injectable()`) and dependency injection (`svInject()`)
- 📦 Request-scoped containers for safe SSR execution
- ⚙️ Lifecycle hooks (`postConstruct`)
- 🔌 Integrations for Astro, Next.js, and other Vite-based SSR frameworks
- 🛠 Framework-agnostic: use in any modern TypeScript SSR app
- 📦 No dependencies (besides vite based build tools)
- 🪶 Minimalistic: 2kb gzipped 6.1 kb minified

## Inspiration

This library is heavily inspired by Angulars DI system.
It is designed to be framework-agnostic, so that it can be used in any modern SSR app.
But originally conceptualized for AstroJS + Svelte to have a lightweight DI system, shared accross components and Islands. 

**important:** since this framework should be minimal, no automatic resolution of "module/component scope" will be implemented.
If you fear "global state pollution", you have to add containers to the root injection context, yourself.

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

### Creating Injectable Classes 

For Informative purposes, multiple ways of defining Injectables are shown here.
All of them are equivalent, but with different names to have an "Archetype." 

```typescript
@Store() // for stores
@Injectable() // non specific
@Service() // services
@Controller() // controllers
@Util() // utilities
```

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


Or as explicit constructor injection:

```typescript
import { Service } from 'sv-inject';

// Define a service with dependencies
@Service()
class AuthService {

    constructor(
        private userService = svInject(UserService)
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
    return makeInjectionContext(async () => {
      const response = await next();
      // You can also modify the response if needed
      return response
    }, ssrConfig)
});
```

### SSR Detection

By default this library uses `import.meta.env.SSR` to detect SSR contexts. 
If this is not available in your framework you have to use something like this before first container initialisation:

```typescript
import { setSSRDetection } from 'sv-inject';

setSSRDetection(() => typeof window === "undefined");

```

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

### Configuration Methods

#### `setGlobalAppConfig(config: ApplicationConfig)`

Sets the global application configuration for the application. 
In SSR mode, this is used to set the global configuration for the server, but it will not be request-scoped.

Setting the global config must happen in a suitable place of the app, before any container is initialized.
Suitable places should be: index.ts or similar. 


```typescript
import { createToken } from "./sv-inject";

const API_URL_TOKEN = createToken<string>("API_URL")

setGlobalAppConfig([
  {
    token: API_URL_TOKEN,
    provide: 'https://api.example.com'
  }
]);
```

### Providers and Factories

sv-inject supports registering values and factories via the Provider type and the container API.

Provider type shape:

```ts
export type Provider<T = any> = {
  token: Tokenizable<T>;
  provide?: T;         // directly provide an instance/value (singleton within the container)
  factory?: () => T;   // provide a factory that is executed on every injection
}
```

You can use providers in your ApplicationConfig (global or request-scoped via `makeInjectionContext`):

```ts
import { createToken, type ApplicationConfig } from 'sv-inject';

// Example abstract contract, this abstract class is now used as a key for the injection context
@Service()
export abstract class Logger {
  abstract log(msg: string): void;
}

// Concrete implementation
class ConsoleLogger extends Logger {
  log(msg: string) { console.log(msg); }
}

// Concrete implementation 2
class RemoteLogger extends Logger {
    log(msg: string) { RemoteLogService.sendLog(msg); }
}


// Configure using a factory so that a specific implementation is injected for an abstract key
const config: ApplicationConfig = [
  {
    token: Logger,          // abstract token or abstract class can be used as the key
    factory: () => {
        if(isDevMode()){
            return new ConsoleLogger();
        }
        return new RemoteLogger();
    },
  },
];
```

Registering factories programmatically with a token:

```ts
import { createToken, initContainer } from 'sv-inject';
const RemoteLogger = createToken<Logger>("LOGGER");
// At startup or within SSR request configuration
const container = initContainer();
container.registerFactory(LOGGER_TOKEN, () => new ConsoleLogger());
```

Important notes about factories:
- Factories are re-executed on every injection or container.get(...) call for that token/key.
- If you need a singleton-like behavior, either:
  - Use provide with a pre-built instance, or
  - Memoize inside your factory:
  - memo/cache clean up should be taken with care as this is a source of memory leaks

```ts
const memoLoggerFactory = (() => {
  let cached: Logger | undefined;
  return () => {
      if(isDevMode()){
          return chached ??= new ConsoleLogger();
      }
      return cached ??= new RemoteLogger();
  };
})();

initContainer().registerFactory(LOGGER_TOKEN, memoLoggerFactory);
```

### SSR Utilities

#### `makeInjectionContext<T>(callback: () => Promise<T>, config?: ApplicationConfig): Promise<T>`

Creates an injection context utilizing [async local storage](https://nodejs.org/api/async_context.html#class-asynclocalstorage) and an application container. This method is mandatory for SSR request context aware injection containers.

```typescript
await makeInjectionContext(async () => {
  // Your SSR code here
  return response;
}, config);
```



## 🔑 Token-Based Injection

`sv-inject` supports **token-based dependency injection**, allowing you to inject services, values, or request-specific objects (like cookies or headers) without relying solely on class constructors.

### Defining Tokens

A token can be created with a unique `id`:

```ts
import { createToken } from "sv-inject";
const REQUEST_TOKEN = createToken("REQUEST");
```

> 🟡 **Important:** All tokens must be **unique and non-empty**. Failing to do so may result in collisions or unexpected injection behavior.

### ✅ Application-Scoped Token Usage

It is **strongly advised** to define all tokens within your `ApplicationConfig`:

```ts
import { createToken, setGlobalAppConfig } from "sv-inject";

const REQUEST_TOKEN = createToken("REQUEST");

const config: ApplicationConfig = [
  {
    token: REQUEST_TOKEN,
    provide: request
  },
];

setGlobalAppConfig(config)
```

For the global AppConfig (or initial tokens/services etc):

- For Global and CSR with `setGlobalAppConfig(config)` in index of your application.
  > ⚠️ ON SSR: Important everything in this config will NOT be request scoped
  > All configs that are request scoped on SSR have to be considered "optional" in client-side code.
 
- For SSR with `makeInjectionContext(asyncfun, ssrConfig)`.
- The GlobalAppConfig and the passed SSR Config are merged together and applied in order. 

These Providers are bound to the **request lifecycle**, ensuring safe and isolated access per user.

### 🧩 Optional (e.g. exclusive SSR) Tokens

Tokens that **only exist during SSR** should be marked as **optional** using:

```ts
import { createToken, svInjectOptional } from "sv-inject";;

const SSR_ONLY_TOKEN = createToken<MyType>("SSR_ONLY_TOKEN");

const value = svInjectOptional(SSR_ONLY_TOKEN);
```

This avoids runtime errors when rendering in non-SSR or static contexts.

## ⚙️ Advanced Usage

### Debugging

If you need to debug your DI, you can enable debug logging by:

```typescript
import { SvDebugLogger } from "sv-inject";

SvDebugLogger.default.enable();
```

### ⚠️ Lifecycle Awareness

In a case where you need to perform a Injection exactly in the same time as a Provider is created, e.g. At "AppConfiguration" level, 
or somewhere Post app Initialization, you can use the `postConstruct` lifecycle hook, to inject the service after the provider is created,
Or use `svInject` on demand at method/function level, to avoid null/undefined injections. 

This should be avoided in most cases, as it makes testing and debugging more difficult.


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

If a service or state needs to be recreated on each injection: Use a factory. 
If as instance needs to be created later than app initialization and injected dynamically, register it manually using:

```ts
initContainer().registerProvider(token, instance);
```

For example:

```ts
import { createToken } from "sv-inject";

const LOCALE_TOKEN = createToken<string>("LOCALE");

initContainer().registerProvider(LOCALE_TOKEN, 'en-US');
```


### 🔄 Injection Order

* Injection order is resolved automatically by the DI container.
* This ensures **predictable and safe injection flow**, even across complex service graphs.

### Circular dependency 
* Circular dependencies are not resolved automatically.
* If you need to inject a circular dependency:
 - don't 
 - delegate the injection either into `postConstruct` or the method that needs it.
 - or use a factory with custom constructor logic

No warranty is given for circular dependency resolution.



## ❓ Why Request-Scoped Containers Matter

- In SSR environments, services may hold user-specific or request-specific state.
- Without isolation, shared service instances can leak data between users — a serious security issue.
- sv-inject creates a unique container per request, so services are safely scoped and reset for each incoming call.
- You can also inject request-specific tokens (like REQUEST, COOKIES, SESSION, etc.) into your services.