import baseConfig from './playwright.config';
import { defineConfig } from '@playwright/test';

export default defineConfig({
    ...baseConfig,
    use: {
        ...baseConfig.use,
        baseURL: process.env.BASE_URL || 'https://hq.saimor.world',
    },
});
