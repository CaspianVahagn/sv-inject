import { SSR_Storage, CONTAINER_KEY, Container, type ApplicationConfig } from './index.js';
import { AsyncLocalStorage } from 'node:async_hooks';

// Re-export everything from index
export * from './index.js';

/**
 * Creates an injection context utilizing async local storage and an application container.
 * this method is mandatory for SSR request context aware injection containers
 *
 * @param {() => Promise<T>} callback The function to be executed within the injection context.
 * @param {ApplicationConfig} [config] Optional application configuration used to initialize the container.
 * @return {Promise<T>} A promise that resolves with the result of the executed callback, or rejects with an error if the callback fails.
 */
export async function makeInjectionContext<T>(callback: () => Promise<T>, config?: ApplicationConfig): Promise<T> {
    const storage = new AsyncLocalStorage();
    // @ts-ignore
    SSR_Storage.ref = storage; // SAME reference as in index.js

    return new Promise(async (resolve, reject) => {
        await storage.run(new Map(), async () => {
            const container = new Container(config); // SAME Container class
            // @ts-ignore
            storage.getStore()?.set(CONTAINER_KEY, container); // SAME key
            container.postConstruct();

            try {
                return resolve(await callback());
            } catch (e) {
                reject(e);
            }
        });
    });
}
