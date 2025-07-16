import { defineConfig } from 'tsup';

export default defineConfig([{
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    treeshake: false,
    minify: false,
    outDir: 'dist',
    external: ['vite', 'node:async_hooks'],
    esbuildOptions(options) {
        options.conditions = ['import', 'module'];
    },

},
    // Server entry (server-only code)
    {
        entry: ['src/server.ts'],
        format: ['esm'],
        dts: true,
        outDir: 'dist',
        splitting: false,
        sourcemap: true,
        minify: false,
        platform: 'node', // Explicitly target Node.js
        external: [
            './index.js',  // Behandelt index.js als external dependency
            '../index.js',
            'node:async_hooks'
        ],
        esbuildOptions(options) {
            // Stellt sicher, dass index.js nicht gebundelt wird
            options.external = [...( options.external || [] ), './index.js'];
        }

    }

]);