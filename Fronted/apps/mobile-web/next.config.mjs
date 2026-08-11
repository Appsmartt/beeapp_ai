import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);

dotenv.config({
    path: path.resolve(currentDirectory, '../../.env'),
});

/** @type {import('next').NextConfig} */
const nextConfig = {
    transpilePackages: [
        '@beeapp/api-client',
        '@beeapp/design-system',
        '@beeapp/shared-types',
    ],
    env: {
        NEXT_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
    },
};

export default nextConfig;