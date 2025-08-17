import { type ApplicationConfig, injectableConstructors, type Tokenizable } from "./AppInjector.ts";
import { appConfig } from "../AppConfig.ts";
import Logger from "../logger/svDebugLogger.ts";

type FactoryEntry<T = any> = { _factory_: () => T };

export class Container {
    // holding instances of injectable classes by key
    private registry: Map<string, any> = new Map();
    private isInitialized = false;

    constructor(mergeWith?: ApplicationConfig) {
        if (mergeWith) {
            this.loadConfig([...mergeWith, ...appConfig()]);
        } else {
            this.loadConfig(appConfig());
        }
    }

    public postConstruct(): void {
        for (let [_, value] of this.registry.entries()) {
            if (value.postConstruct) {
                value.postConstruct();
            }
        }
        this.isInitialized = true;
    }

    registerProvider(key: Tokenizable, providedInstance: any) {
        if (key.id) {
            this.register(key.id, providedInstance);
            return;
        }

        if (key.prototype?.constructor?.name) {
            // @ts-ignore
            this.register(key.prototype._service_prop, providedInstance);
        } else {
            throw new Error("Cannot register untokenizable" + JSON.stringify(key));
        }
    }

    registerFactory(key: string, factory: () => any) {
        if (this.registry.has(key)) {
            console.warn("InjectionContainer - cannot register duplicate key: " + key)
            return;
        }
        this.registry.set(key, { _factory_: factory } as FactoryEntry);
        Logger.log(`Added ${key} to the registry.`);
    }

    register(key: string, instance: any) {
        if (this.registry.has(key)) {
            console.warn("InjectionContainer - cannot register duplicate key: " + key)
            return;
        }
        this.registry.set(key, instance);
        if (this.isInitialized && instance.postConstruct) {
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
            if (!this.has(token.prototype?._service_prop)) {
                const clazz = injectableConstructors.get(token.prototype?._service_prop);
                if (clazz) {
                    this.registerProvider(token as Tokenizable, new clazz());
                } else {
                    throw new Error("No constructor exists for: " + token.prototype?._service_prop);
                }
            }
            return this.get<T>(token.prototype?._service_prop);
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
        const entry: FactoryEntry<T> = this.registry.get(key);

        if(entry["_factory_"]) {
            return entry._factory_() as T;
        }
        return entry as T;
    }

    has(key: string): boolean {
        return this.registry.has(key);
    }

    loadConfig(config: ApplicationConfig) {
        if (this.isInitialized) {
            console.trace("reinitialize container, all duplicate providers will be ignored")
        }
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
