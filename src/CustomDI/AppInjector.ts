import { SV_ENV } from "./SV_ENV.ts";
import { Container } from "./Container.ts";
import Logger from "../logger/svDebugLogger.ts";
import { CONTAINER_KEY, SSR_Storage } from "./ssr-di.utils.ts";

export type Class<T = any> = new (...args: any[]) => T;
export type Tokenizable<T = any> = {
    prototype?: new (...args: any[]) => T;
    id?: string;
    _?: T
};

export type Provider<T = any> =  {
    token: Tokenizable<T> | Class<T>;
    provide?: T;
    factory?: () => T;
}

export type ApplicationConfig = Provider[];

// in order to know which parameters of the constructor (index) should be injected (identified by key)
interface Injection {
    index: number;
    key: string;
}

/**
 * Set the function to detect SSR.
 * by default it is set to import.meta.env.SSR
 * @param isSSRfn
 */
export function setSSRDetection(isSSRfn: () => boolean) {
    SV_ENV.platform.SSR = isSSRfn();
}

export const injectableConstructors = new Map<string, { new(): any }>();

/**
 * Creates a token object with the specified identifier.
 *
 * @param {string} id - The unique identifier for the token.
 * @return {Tokenizable<T>} The created token object with the provided identifier.
 */
export function createToken<T>(id: string): Tokenizable<T> {
    return { id };
}

// add to class which has constructor paramteters marked with @inject()
export function Service() {
    return function injectionTarget<T extends { new(...args: any[]): {} }>(constructor: T): T | void {
        const proto = constructor.prototype;
        const id = injectableConstructors.size.toString();
        proto._service_prop = `${constructor.name}_${id}`;
        Logger.log("Make service Injectable: ", constructor.name);
        // replacing the original constructor with a new one that provides the injections from the Container
        injectableConstructors.set(
            proto._service_prop,
            class extends constructor {
                static _service_prop = proto._service_prop;
                static name = constructor.name;

                constructor(...args: any[]) {
                    Logger.debug(`Service ${proto._service_prop} initialized`);
                    // get injections from class; previously created by @inject()
                    const injections = ( ( constructor as any ).injections || [] ) as Injection[];
                    // get the instances to inject from the Container
                    // this implementation does not support args which should not be injected
                    const injectedArgs: any[] = injections
                        .sort((a, b) => a.index - b.index)
                        .map(({ key }) => {
                            return initContainer().get(key);
                        });
                    // call original constructor with injected arguments
                    super(...injectedArgs, ...args);
                }
            },
        );
    };
}

// @Deprecated
// mark constructor parameters which should be injected
// this stores the information about the properties which should be injected
export function inject(params?: {
    key?: string;
    def?: new(...args: any[]) => any;
    token?: Tokenizable;
}): (target: Object, propertyKey: string | symbol | undefined, parameterIndex: number) => void {
    const key = params?.key;
    const clazz = params?.def;
    const token = params?.token;
    return function (target: Object, _propertyKey: string | symbol | undefined, parameterIndex: number) {
        let classKey = key;
        classKey = classKey ? classKey : clazz?.prototype._service_prop;
        if (token) {
            classKey = token.id;
        }
        if (!classKey) {
            throw new Error("Property is not defined, please provide a key or check constructor values ");
        }
        const injection: Injection = { index: parameterIndex, key: classKey };
        const existingInjections: Injection[] = ( target as any ).injections || [];
        // create property 'injections' holding all constructor parameters, which should be injected
        if (existingInjections.length > 0) {
            existingInjections.push(injection);
            return;
        }

        Object.defineProperty(target, "injections", {
            enumerable: false,
            configurable: true,
            writable: false,
            value: [injection],
        });
    };
}

export function fromAppContext<T>(clazz: { prototype: any }): T {
    // @ts-ignore
    return activator(clazz);
}

function activator<T>(type: { new(): T }): T {
    // @ts-ignore
    const Container = initContainer();
    if (!Container) {
        throw new Error("Container is not defined");
    }
    const name =
        // @ts-ignore
        type["_service_prop"] || ( type.prototype.constructor.name as string );
    if (!name) {
        throw new Error("No name provided");
    }
    if (Container.has(name)) {
        return Container.get(name);
    }
    const instance = new type();
    Container.register(name, instance);
    return instance;
}

export function initContainer(): Container {
    if (import.meta.env.SSR) {
        const container = SSR_Storage.ref.getStore()?.get(CONTAINER_KEY);
        if (!container) {
            if (import.meta.env.MODE === "development") {
                console.warn(
                    "Container is not defined, but SSR is enabled. This is may happen on hot reload changes in development mode.",
                )
                console.warn("Create new provisional Env container");
                return new Container();
            }

            if (import.meta.env.MODE === "test") {
                if (!SV_ENV.testContainer) {
                    Logger.log("Create new test Env container");
                    SV_ENV.testContainer = new Container();
                    SV_ENV.testContainer?.postConstruct();
                }
                return SV_ENV.testContainer;
            }

            throw new Error("Container is not defined");
        }
        return container;
    }
    if (!SV_ENV.container) {
        Logger.log("Create new Basic Env container");
        SV_ENV.container = new Container();
        SV_ENV.container?.postConstruct();
    }
    return SV_ENV.container!;
}

export function teardownTestContainer() {
    if (SV_ENV.testContainer) {
        SV_ENV.testContainer = undefined;
    }
}

export function svInject<T>(token: Tokenizable<T> | Class<T>): T {
    const container: Container = initContainer();
    if(token.prototype === undefined) return container.getByToken(token as Tokenizable);
    return container.getByClass(token as Class<T>);
}

export function svInjectOptional<T>(token: Tokenizable<T>) {
    const container: Container = initContainer();
    try {
        return container.getByToken(token)
    } catch (err) {
        return undefined
    }
}
