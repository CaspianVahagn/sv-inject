// Main entry point for the sv-inject library

// Export core DI components
export {
  Service,
  inject,
  initContainer,
  svInject,
  svInjectOptional,
  fromAppContext,
  type Tokenizable,
  type ApplicationConfig
} from './CustomDI/AppInjector.ts';

export { Container } from './CustomDI/Container.ts';
export { SV_ENV } from './CustomDI/SV_ENV.ts';
export { type PostConstructable } from './CustomDI/life-cycle.types.ts';
export { SSR_Storage, CONTAINER_KEY } from './CustomDI/ssr-di.utils.ts';

// Export app configuration
export { appConfig } from './AppConfig.ts';