import { Container } from "./Container.ts";

globalThis.svInjectEnv = import.meta.env;

if(!globalThis.svInjectRefs) {
    globalThis.svInjectRefs = {};
}

const defaultRef = {
    getStore: () => {
        if (globalThis.svInjectRefs.useDefaultContainer === false) return new Map<string, Container>();
        if (globalThis.svInjectRefs.SSR_Storage?.getStore) return globalThis.svInjectRefs.SSR_Storage.getStore();
        return new Map<string, Container>([[CONTAINER_KEY, new Container()]])
    }
}

export const CONTAINER_KEY = "@@sv_ssr_container";

export function getSSRStorage() {
    return globalThis.svInjectRefs.SSR_Storage || defaultRef;
}

export function setSSRStorage(storage: { getStore: () => Map<string, Container> | undefined }) {
    globalThis.svInjectRefs.SSR_Storage = storage;
}

export function setOptOutDefaultContainer(flag: boolean) {
    globalThis.svInjectRefs.useDefaultContainer = !flag;
}