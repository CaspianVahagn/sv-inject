/// <reference types="node" />
interface ImportMetaEnv {
    SSR: boolean | undefined;
    NODE_ENV: 'development' | 'production' | 'test';
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}