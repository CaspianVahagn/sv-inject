import type { Container } from "./Container.ts";

let ref = {getStore: () => new Map<string, Container>()}
export const SSR_Storage = {ref};
export const CONTAINER_KEY = "@@ssr_container";