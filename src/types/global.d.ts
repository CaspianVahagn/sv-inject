import { Container } from "../CustomDI/Container.ts";

export {};

declare global {
    var svInjectEnv: ImportMetaEnv;
    var svInjectRefs: {
        SSR_Storage?: { getStore: () => Map<string, Container> | undefined },
        useDefaultContainer?: boolean,
        container?: Container,
        testContainer?: Container,
        primaryStorage?: { getStore: () => Map<string, Container> | undefined },
    };
    var svInjectableConstructors: Map<string, any>;
}