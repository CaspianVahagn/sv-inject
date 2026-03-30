import { Container, CONTAINER_KEY } from "../index.ts";
import { AsyncLocalStorage } from "node:async_hooks";
import type { ApplicationConfig } from "./AppInjector.ts";

export type EjectFn = () => void;


/** @Deprecated
 * Creates an injection context utilizing async local storage and an application container.
 * this method is mandatory for SSR request context aware injection containers
 *
 * @param {() => Promise<T>} callback The function to be executed within the injection context.
 * @param {ApplicationConfig} [config] Optional application configuration used to initialize the container.
 * @return {Promise<T>} A promise that resolves with the result of the executed callback, or rejects with an error if the callback fails.
 */
export async function makeInjectionContext<T>(callback: (ejectFn?: EjectFn) => Promise<T>, config: ApplicationConfig = []): Promise<T> {
    const storage = new AsyncLocalStorage<Map<any, any>>();
    // @ts-ignore
    SSR_Storage.ref = storage;
    return storage.run(new Map<string, any>(), async () => {
        const container = new Container(config);
        storage.getStore()?.set(CONTAINER_KEY, container);
        container.postConstruct();

        return callback(() => {
            container.CLEAN_ALL()
        })
    });
    // return new Promise<T>(async (resolve, reject) => {
    //   await storage.run(new Map<string, any>(), async () => {
    //     const container = new Container(config);
    //     storage.getStore()?.set(CONTAINER_KEY, container);
    //     container.postConstruct();
    //
    //     try {
    //       return resolve(await callback());
    //     } catch (e) {
    //       reject(e);
    //     }
    //   });
    // });
}
