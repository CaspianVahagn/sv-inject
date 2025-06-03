import type {Container} from "./Container.ts";

export const SV_ENV: {platform: ImportMetaEnv, container?: Container} = {
    platform: import.meta.env as ImportMetaEnv,
}