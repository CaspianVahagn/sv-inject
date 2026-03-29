import { SV_ENV } from "./SV_ENV.ts";
import { Container } from "./Container.ts";
import Logger from "../logger/svDebugLogger.ts";
import { CONTAINER_KEY, SSR_Storage } from "./ssr-di.utils.ts";

export type Class<T = any> = ( new (...args: any[]) => T ) & {
    _service_prop?: string,
    _service_tag?: string,
    _service_lazy?: boolean
};
export type Tokenizable<T = any> = {
    prototype?: Class<T>
    id?: string;
    _?: T
};

export type Provider<T = any> = {
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

globalThis.svInjectableConstructors = new Map<string, Class<any>>();

export const injectableConstructors = () => globalThis.svInjectableConstructors as Map<string, Class<any>>;

/**
 * Creates a token object with the specified identifier.
 *
 * @param {string} id - The unique identifier for the token.
 * @return {Tokenizable<T>} The created token object with the provided identifier.
 */
export function createToken<T>(id: string): Tokenizable<T> {
    return { id };
}

// add to create a Injectable archetype which has constructor parameters marked with @inject()
function MakeInjectable(tag: string = "injectable", lazy = false) {
    return function injectionTarget<T extends { new(...args: any[]): {} }>(constructor: T): T | void {
        const proto = constructor.prototype;
        const id = injectableConstructors().size.toString();
        proto._service_prop = `${tag}_${constructor.name}_${id}`;
        proto._service_tag = tag;
        proto._service_lazy = lazy;
        Logger.log("Make service Injectable:", constructor.name, "lazy:", lazy);
        // replacing the original constructor with a new one that provides the injections from the Container
        injectableConstructors().set(
            proto._service_prop,
            class extends constructor {
                static _service_prop = proto._service_prop;
                static _service_tag = proto._service_tag;
                static _service_lazy = proto._service_lazy;

                static name = constructor.name;

                constructor(...args: any[]) {
                    Logger.debug(`Service ${proto._service_prop} initialized`);
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
type InjectionBehaviour = "LAZY" | "EAGER";

export const Injectable = (lazy: InjectionBehaviour = "EAGER") => MakeInjectable("Injectable", lazy === "LAZY");
export const Controller = (lazy: InjectionBehaviour = "EAGER") => MakeInjectable("Controller", lazy === "LAZY");
export const Service = (lazy: InjectionBehaviour = "EAGER") => MakeInjectable("Service", lazy === "LAZY");
export const Store = (lazy: InjectionBehaviour = "EAGER") => MakeInjectable("Store", lazy === "LAZY");
export const Util = (lazy: InjectionBehaviour = "EAGER") => MakeInjectable("Util", lazy === "LAZY");

// @Deprecated
// mark constructor parameters which should be injected
// this stores the information about the properties which should be injected
// export function inject(params?: {
//     key?: string;
//     def?: new(...args: any[]) => any;
//     token?: Tokenizable;
// }): (target: Object, propertyKey: string | symbol | undefined, parameterIndex: number) => void {
//     const key = params?.key;
//     const clazz = params?.def;
//     const token = params?.token;
//     return function (target: Object, _propertyKey: string | symbol | undefined, parameterIndex: number) {
//         let classKey = key;
//         classKey = classKey ? classKey : clazz?.prototype._service_prop;
//         if (token) {
//             classKey = token.id;
//         }
//         if (!classKey) {
//             throw new Error("Property is not defined, please provide a key or check constructor values ");
//         }
//         const injection: Injection = { index: parameterIndex, key: classKey };
//         const existingInjections: Injection[] = ( target as any ).injections || [];
//         // create property 'injections' holding all constructor parameters, which should be injected
//         if (existingInjections.length > 0) {
//             existingInjections.push(injection);
//             return;
//         }
//
//         Object.defineProperty(target, "injections", {
//             enumerable: false,
//             configurable: true,
//             writable: false,
//             value: [injection],
//         });
//     };
// }

export function fromAppContext<T>(clazz: Class<T>): T {
    // @ts-ignore
    return activator(clazz);
}

function activator<T>(type: Class<T>): T {
    // @ts-ignore
    const Container = initContainer();
    if (!Container) {
        throw new Error("Container is not defined");
    }
    const name =
        type._service_prop || ( type.prototype.constructor.name as string );
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

export function ensureDevContainer() {
    if(import.meta.env.MODE === "development") {
        // @ts-ignore
        SSR_Storage.ref = globalThis.primaryStorage;
    }
}

export function initContainer(): Container {
    if (import.meta.env.SSR) {
        ensureDevContainer();
        const container = SSR_Storage.ref.getStore()?.get(CONTAINER_KEY);
        if (!container) {
            if (import.meta.env.MODE === "test") {
                if (!SV_ENV.testContainer) {
                    Logger.log("Create new test Env container");
                    SV_ENV.testContainer = new Container();
                    SV_ENV.testContainer?.postConstruct();
                }
                return SV_ENV.testContainer;
            }

            if (import.meta.env.MODE === "development") {
                console.warn(
                    "Container is not defined, but SSR is enabled. This is may happen on hot reload changes in development mode.",
                )
                console.warn("Create new provisional Env container");
                return new Container();
            } else {

                const store = SSR_Storage.ref.getStore();
                const ref = SSR_Storage.ref;
                console.warn("Container not in ssr context", store, ref);

                if(!store) throw new Error("SSR_Storage (AsyncLocalStorage) is not defined");
                console.trace("Create new Env container.");
                store.set(CONTAINER_KEY, new Container());
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
    if (token.prototype === undefined) return container.getByToken(token as Tokenizable);
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

/**
 *  EXPERIMENTAL: register a provider to the container
 *
 * @param provision
 */
export function provide<T>(provision: Tokenizable<T> | Provider | Class<T>) {
    const container: Container = initContainer();
    if (( provision as Provider ).token) {
        const element = provision as Provider;
        if (element.provide)
            container.registerProvider(element.token as Tokenizable, element.provide);
        if (element.factory)
            container.registerFactory(element.token as Tokenizable, element.factory);
        return
    }

    const propName = (provision as Class<T>).prototype?._service_prop;
    if (propName) {
        const clazz = injectableConstructors().get(propName);
        if (!clazz) throw new Error("No providable constructor exists for: " + propName);
        return container.register(propName, new clazz());
    }

    const token = provision as Tokenizable;
    if (token.prototype) {
        container.registerProvider(token, new token.prototype());
    }

}

/**
 *  EXPERIMENTAL: eject a provider from the container
 */
export function svEject<T>(token: Tokenizable | Class<T>, force = false) {
    const container: Container = initContainer();
    container.eject(token as Tokenizable, force);
}
