import { type ApplicationConfig, injectableConstructors, type Tokenizable } from "./AppInjector.ts";
import { appConfig } from "../AppConfig.ts";
import Logger from "../logger/logger.ts";

export class Container {
  // holding instances of injectable classes by key
  private registry: Map<string, any> = new Map();
  private isInitialized = false;

  constructor(mergeWith?: ApplicationConfig) {
    if(mergeWith) {
      this.loadConfig([...mergeWith, ...appConfig()]);
    }else {
      this.loadConfig(appConfig());
    }
  }

  public postConstruct(): void {
    this.registry.forEach(([_ ,value]) => {
        if(value.postConstruct){
          value.postConstruct();
        }
    });
    this.isInitialized = true;
  }

  registerProvider(key: Tokenizable, providedInstance: any) {
    if (key.id) {
      this.register(key.id, providedInstance);
      return;
    }

    if (key.prototype?.constructor?.name) {
      this.register(key.prototype.constructor.name, providedInstance);
    } else {
      throw new Error("Cannot register nameless constructors");
    }
  }

  register(key: string, instance: any) {
    if (this.registry.has(key)) {
      return;
    }
    this.registry.set(key, instance);
    if(this.isInitialized && instance.postConstruct){
      instance.postConstruct();
    }
    Logger.log(`Added ${key} to the registry.`);
  }

  getByToken<T>(token: Tokenizable<T>): T {
    if (token.id) {
      return this.get<T>(token.id);
    } else if (token.prototype?.constructor?.name) {
      return this.get<T>(token.prototype?.constructor?.name);
    } else {
      throw new Error("No token id provided");
    }
  }

  getByTokenOptional<T>(token: Tokenizable): T | undefined {
    try {
      return this.getByToken<T>(token);
    } catch {
      return undefined;
    }
  }

  getByClass<T>(token: new (...args: any[]) => T): T {
    if (token.prototype?.constructor?.name) {
      if (!this.has(token.prototype?.constructor?.name)) {
        const clazz = injectableConstructors.get(token.prototype?.constructor?.name);
        if (clazz) {
          this.registerProvider(token as Tokenizable, new clazz());
        } else {
          throw new Error("No constructor exists for: " + token.prototype?.constructor?.name);
        }
      }
      return this.get<T>(token.prototype?.constructor?.name);
    }
    throw new Error("No token id provided");
  }

  get<T>(key: string): T {
    if (!this.registry.has(key)) {
      const clazz = injectableConstructors.get(key);
      if (clazz) {
        this.register(key, new clazz());
      } else {
        throw new Error("No constructor exists for: " + key);
      }
    }

    return this.registry.get(key);
  }

  has(key: string): boolean {
    return this.registry.has(key);
  }

  loadConfig(config: ApplicationConfig) {
    try {
      for (const element of config) {
        this.registerProvider(element.token, element.provide);
      }
    } catch (e) {
      Logger.err(e);
    }
    Logger.info("APP INITIALIZED");
  }
}
