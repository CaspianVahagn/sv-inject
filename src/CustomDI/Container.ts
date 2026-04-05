import { type ApplicationConfig, Class, injectableConstructors, type Tokenizable } from "./AppInjector.ts";
import { appConfig } from "../AppConfig.ts";
import Logger from "../logger/svDebugLogger.ts";
import SvDebugLogger from "../logger/svDebugLogger.ts";

type FactoryEntry<T = any> = { _factory_: () => T };

export class Container {
    // holding instances of injectable classes by key
    private registry: Map<string, any> = new Map();
    private factoryRegistry: Map<string, any> = new Map();
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
            this.register(key.prototype._service_prop || key.prototype?.constructor?.name, providedInstance);
        } else {
            throw new Error("Cannot register untokenizable" + JSON.stringify(key));
        }
    }

    registerFactory(key: Tokenizable, factory: () => any) {
        // @ts-ignore
        const identifier: string | undefined = key.id || key.prototype?._service_prop;
        if(!identifier) {
            throw new Error("Cannot register untokenizable" + JSON.stringify(key));
        }

        if (this.factoryRegistry.has(identifier)) {
            console.warn("InjectionContainer - cannot register duplicate key: " + key)
            return;
        }
        this.factoryRegistry.set(identifier, { _factory_: factory } as FactoryEntry);
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

    getByClass<T>(token: Class<T>): T {
        if (token.prototype?.constructor?.name) {
            if (!this.has(token.prototype?._service_prop)) {
                const clazz = injectableConstructors().get(token.prototype?._service_prop);
                if (clazz && !clazz._service_lazy) {
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
        if(this.factoryRegistry.has(key)){
            const factory: FactoryEntry<T> = this.factoryRegistry.get(key);
            return factory._factory_() as T;
        }

        if (!this.registry.has(key)) {
            const clazz = injectableConstructors().get(key);
            if (clazz && !clazz._service_lazy) {
                this.register(key, new clazz());
            } else {
                throw new Error("No constructor exists for: " + key);
            }
        }

        return this.registry.get(key) as T;
    }

    has(key: string): boolean {
        return this.registry.has(key);
    }

    loadConfig(config: ApplicationConfig, overwrite = false) {
        if (this.isInitialized && !overwrite) {
            console.trace("reinitialize container, all duplicate providers will be ignored")
        }
        try {
            for (const element of config) {
                if(element.provide)
                    this.registerProvider(element.token as Tokenizable, element.provide);
                if(element.factory)
                    this.registerFactory(element.token as Tokenizable, element.factory);
            }
        } catch (e) {
            Logger.err(e);
        }
        Logger.info("APP INITIALIZED");
    }

    eject(token: Tokenizable, force = false) {
        if(token.id) return this.removeAndCallCleanup(token.id);
        if(token.prototype && token.prototype._service_prop) {
            if(token.prototype._service_lazy) return this.removeAndCallCleanup(token.prototype._service_prop)
            if(force) return this.removeAndCallCleanup(token.prototype._service_prop)
            console.error(`ejection of non lazy Injectable [${token.prototype._service_prop}] from the context, will lead to unexpected behaviour. If you know what you are doing, call eject(token, true)`);
        }
        console.error(token, "Can't eject. Is not registered in the injection context")
    }

    private removeAndCallCleanup(key: string){
        const instance = this.registry.get(key);
        instance.onEject && instance.onEject();
        SvDebugLogger.info("Ejected", key, instance.constructor.name, "from the container")
        return this.registry.delete(key);
    }

    public CLEAN_ALL(){
        for(const [_,value] of this.registry.entries()){
            value.onEject && value.onEject();
        }
    }
}
