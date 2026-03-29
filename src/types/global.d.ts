import { Container } from "@sv-inject/CustomDI/Container.ts";

export {};

declare global {
    var svInjectEnv: ImportMetaEnv;
    var svInjectRefs: {
        SSR_Storage: { getStore: () => Map<string, Container> },
        useDefaultContainer: boolean,
    };
    var svInjectableConstructors: Map<string, any>;
}