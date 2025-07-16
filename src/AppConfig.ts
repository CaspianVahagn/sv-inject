import { type ApplicationConfig } from "./CustomDI/AppInjector.ts";

/**
 * Default application configuration
 * @returns ApplicationConfig array with default providers
 */
export function appConfig(): ApplicationConfig {
  return configRef.config;
}

const configRef: {config: ApplicationConfig} = {config: []};

/**
 * Set global application configuration.
 * ON SSR this is used to set the global configuration for the server.
 * It will not be requestScoped
 * @param config
 */
export function setGlobalAppConfig(config: ApplicationConfig) {
  configRef.config = config;
}