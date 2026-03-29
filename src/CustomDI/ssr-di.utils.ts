import { Container } from "./Container.ts";

let optOutDefaultContainer = false;

globalThis.svInjectEnv = import.meta.env;

let ref = {
    getStore: () => {
        if (optOutDefaultContainer) return new Map<string, Container>();
        if (globalThis.svInjectRefs.SSR_Storage.getStore) return globalThis.svInjectRefs.SSR_Storage.getStore();
        return new Map<string, Container>([[CONTAINER_KEY, new Container()]])
    }
}

export const SSR_Storage = { ref };
export const CONTAINER_KEY = "@@sv_ssr_container";

export function setOptOutDefaultContainer(flag: boolean) {
    if (flag) optOutDefaultContainer = true;
}