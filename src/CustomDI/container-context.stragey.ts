import { Container } from "@sv-inject/CustomDI/Container.ts";
import { ApplicationConfig, Tokenizable } from "@sv-inject/CustomDI/AppInjector.ts";

export interface ContainerContextStrategy {
    provideContainer: (config?: ApplicationConfig) => Container;
}

export const defaultContainerContextStrategy: () => ContainerContextStrategy = () => ( { provideContainer: (config) => new Container(config) } );

/** experimental utility for session context. Do not use in production until declared non stable
 * @param sessionId
 * @param sessionPolicy
 * @constructor
 */
export const SessionBasedContextStrategy: (sessionId: string, sessionPolicy: {
    ttl: number,
    strategy: "stale-access" | "since-created"
}) => ContainerContextStrategy = (sessionId: string, sessionPolicy: {
    ttl: number,
    strategy: "stale-access" | "since-created"
}) => {
    return {
        provideContainer: (config) => {
            if (!globalThis.svInjectRefs.sessionMap) {
                globalThis.svInjectRefs.sessionMap = new Map<string, Container>();
            }

            const sessionMap = globalThis.svInjectRefs.sessionMap;

            queueMicrotask(() => {
                for (const [key, value] of sessionMap) {
                    if (Date.now() > (value.get("@@sessionTTL") as number)) {
                        sessionMap.delete(key);
                    }
                }
            })

            if (sessionMap.has(sessionId)) {
                const container = sessionMap.get(sessionId) as Container;
                if ("stale-access" === sessionPolicy.strategy) {
                    container.register("@@sessionTTL", Date.now() + sessionPolicy.ttl * 1000);
                }
                if (config) {
                    config.forEach(c => {
                        container.eject(c.token as Tokenizable, true)
                    })
                    container.loadConfig(config, true);
                }

                return container;
            }

            const container = new Container(config);

            container.register("@@sessionID", sessionId);
            container.register("@@sessionPolicy", sessionPolicy);
            container.register("@@sessionTTL", Date.now() + sessionPolicy.ttl * 1000);

            sessionMap.set(sessionId, container);
            return container;
        }
    }
}
