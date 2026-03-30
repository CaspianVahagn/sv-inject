// Main entry point for the sv-inject library

// Export core DI components

export {
    Service,
    Injectable,
    Controller,
    Util,
    Store,
    initContainer,
    svInject,
    svInjectOptional,
    fromAppContext,
    svEject,
    provide,
    createToken,
    setSSRDetection,
    teardownTestContainer,
    type Tokenizable,
    type ApplicationConfig
} from './CustomDI/AppInjector.ts';

export { Container } from './CustomDI/Container.ts';
export { type PostConstructable, type Ejectable } from './CustomDI/life-cycle.types.ts';
export { getSSRStorage, CONTAINER_KEY, setOptOutDefaultContainer } from './CustomDI/ssr-di.utils.ts';

// Export app configuration
export { appConfig, setGlobalAppConfig } from './AppConfig.ts';
export * as SvDebugLogger from './logger/svDebugLogger.ts';