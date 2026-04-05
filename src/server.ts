import { CONTAINER_KEY, Container, type ApplicationConfig } from './index.js';
import { AsyncLocalStorage } from 'node:async_hooks';
import { setSSRStorage } from "@sv-inject/CustomDI/ssr-di.utils.ts";
import {
    ContainerContextStrategy,
    defaultContainerContextStrategy
} from "@sv-inject/CustomDI/container-context.stragey.ts";

// Re-export everything from index
export * from './index.js';
export * from "./CustomDI/container-context.stragey.ts";

const _storage = new AsyncLocalStorage<Map<string, Container>>();
setSSRStorage(_storage);

/**
 * Creates an injection context utilizing async local storage and an application container.
 * this method is mandatory for SSR request context aware injection containers
 *
 * @param {() => Promise<T>} callback The function to be executed within the injection context.
 * @param {ApplicationConfig} [config] Optional application configuration used to initialize the container.
 * @param {ContainerContextStrategy} [contextStrategy] Optional context strategy to use for the injection context on ssr.
 * @return {Promise<T>} A promise that resolves with the result of the executed callback, or rejects with an error if the callback fails.
 */
export async function makeInjectionContext<T>(callback: () => Promise<T>, config?: ApplicationConfig, contextStrategy?: ContainerContextStrategy): Promise<T> {
    const storage = _storage;

    return new Promise(async (resolve, reject) => {
        await storage.run(new Map(), async () => {
            if(!contextStrategy) {
                contextStrategy = defaultContainerContextStrategy();
            }

            const container: Container = contextStrategy.provideContainer(config || []);
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
