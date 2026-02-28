import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './src/test/setup.ts',
        include: ['src/**/*.{test,spec}.{ts,tsx}'],
        exclude: ['src/test/rules/**', 'node_modules/**'],
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    define: {
        '__APP_VERSION__': JSON.stringify('0.0.0'),
        '__BUILD_TIME__': JSON.stringify(new Date().toISOString()),
    },
});
