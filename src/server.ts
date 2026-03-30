import { CONTAINER_KEY, Container, type ApplicationConfig } from './index.js';
import { AsyncLocalStorage } from 'node:async_hooks';
import { setSSRStorage } from "@sv-inject/CustomDI/ssr-di.utils.ts";

// Re-export everything from index
export * from './index.js';

const _storage = new AsyncLocalStorage<Map<string, Container>>();
setSSRStorage(_storage);

/**
 * Creates an injection context utilizing async local storage and an application container.
 * this method is mandatory for SSR request context aware injection containers
 *
 * @param {() => Promise<T>} callback The function to be executed within the injection context.
 * @param {ApplicationConfig} [config] Optional application configuration used to initialize the container.
 * @return {Promise<T>} A promise that resolves with the result of the executed callback, or rejects with an error if the callback fails.
 */
export async function makeInjectionContext<T>(callback: () => Promise<T>, config?: ApplicationConfig): Promise<T> {
    const storage = _storage;

    return new Promise(async (resolve, reject) => {
        await storage.run(new Map(), async () => {
            const container: Container = new Container(config);
            storage.getStore()?.set(CONTAINER_KEY, container);
            container.postConstruct();
            try {
                return resolve(await callback());
            } catch (e) {
                reject(e);
            }
        });
    });
}
