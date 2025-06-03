import { SV_ENV } from "./SV_ENV.ts";
import { Container } from "./Container.ts";
import Logger from "../logger/logger.ts";
import { CONTAINER_KEY, SSR_Storage } from "./ssr-di.utils.ts";

export type Tokenizable<T = any> = {
  prototype?: { constructor: { name: string } };
  id?: string;
  _? : T
};

// in order to know which parameters of the constructor (index) should be injected (identified by key)
interface Injection {
  index: number;
  key: string;
}

export const injectableConstructors = new Map<string, { new (): any }>();

// add to class which has constructor paramteters marked with @inject()
export function Service() {
  return function injectionTarget<T extends { new (...args: any[]): {} }>(constructor: T): T | void {
    Logger.log("Make service Injectable: ", constructor.name);
    // replacing the original constructor with a new one that provides the injections from the Container
    injectableConstructors.set(
      constructor.name,
      class extends constructor {
        static _service_prop = constructor.name;
        static name = constructor.name;

        constructor(...args: any[]) {
          Logger.debug(`Service ${constructor.name} initialized`);
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

// mark constructor parameters which should be injected
// this stores the information about the properties which should be injected
export function inject(params?: {
  key?: string;
  def?: { prototype: { constructor: Function } };
  token?: Tokenizable;
}): (target: Object, propertyKey: string | symbol | undefined, parameterIndex: number) => void {
  const key = params?.key;
  const clazz = params?.def;
  const token = params?.token;
  return function (target: Object, _propertyKey: string | symbol | undefined, parameterIndex: number) {
    let classKey = key;
    classKey = classKey ? classKey : clazz?.prototype.constructor.name;
    if (token) {
      classKey = token.id;
    }
    if (!classKey) {
      throw new Error("Property is not defined, please provide a key or check constructor values ");
    }
    const injection: Injection = { index: parameterIndex, key: classKey };
    const existingInjections: Injection[] = (target as any).injections || [];
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

function activator<T>(type: { new (): T }): T {
  // @ts-ignore
  const Container = initContainer();
  if (!Container) {
    throw new Error("Container is not defined");
  }
  const name =
    // @ts-ignore
    type["_service_prop"] || (type.prototype.constructor.name as string);
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

export type ApplicationConfig = { token: Tokenizable; provide: any }[];

export function initContainer(): Container {
  if(import.meta.env.SSR){
    const container = SSR_Storage.ref.getStore().get(CONTAINER_KEY);
    if(!container) {
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

export function svInject<T>(token: new (...args: any[]) => T): T {
  const container = initContainer();
  return container.getByClass(token);
}

export function svInjectOptional<T>(token: Tokenizable<T>){
  const container = initContainer();
  try{
    return  container.getByToken(token)
  }catch (err) {
    return undefined
  }
}
