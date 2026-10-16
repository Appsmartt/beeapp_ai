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
    distDir: process.env.NODE_ENV === 'development' ? '.next' : '.next-build',
    transpilePackages: [
        '@beeapp/api-client',
        '@beeapp/design-system',
        '@beeapp/shared-types',
    ],
    allowedDevOrigins: [
        'localhost',
        '127.0.0.1',
    ],
    env: {
        NEXT_PUBLIC_SUPABASE_URL: (
            process.env.NEXT_PUBLIC_SUPABASE_URL
            || process.env.EXPO_PUBLIC_SUPABASE_URL
        ),
        NEXT_PUBLIC_SUPABASE_ANON_KEY: (
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
            || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
        ),
    },
};

export default nextConfig;
