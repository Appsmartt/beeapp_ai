import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = path.join(packageRoot, 'src');
const clients = [
    'calendar.ts',
    'mail.ts',
    'integrations.ts',
    'commercial.ts',
    'storage.ts',
    'notes.ts',
    'statuses.ts',
    'chat.ts',
    'assistant.ts',
];
const ignoredSegments = new Set([
    'buildQuery',
    'toQueryString',
    'encodeURIComponent',
]);

function read(filePath: string): string {
    return fs.readFileSync(filePath, 'utf8');
}

function walk(directory: string): string[] {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) return walk(fullPath);
        return entry.name.endsWith('.ts') ? [fullPath] : [];
    });
}

function routesIn(source: string): string[] {
    const found = new Set<string>();
    const pattern = /\/(?:calendar|mail|integrations|commercial|storage|notes|statuses|chat|assistant)\/(?:[A-Za-z0-9_./-]|\$\{[^}]*\})*/g;
    let match = pattern.exec(source);

    while (match) {
        found.add(match[0].split('?')[0]);
        match = pattern.exec(source);
    }

    return [...found];
}

const gateway = walk(path.join(sourceRoot, 'gateway'))
    .concat(path.join(sourceRoot, 'supabaseGateway.ts'))
    .map(read)
    .join('\n');
const missing: string[] = [];

for (const client of clients) {
    for (const route of routesIn(read(path.join(sourceRoot, client)))) {
        const dynamic = route.includes('${');
        const segments = route
            .split('/')
            .map((segment) => segment.replace(/\$\{[^}]*\}/g, '').trim())
            .filter((segment) => segment && !ignoredSegments.has(segment) && !segment.includes('.'));

        if (!dynamic && gateway.includes(route)) continue;

        const absent = segments.filter((segment) => !gateway.includes(`'${segment}'`) && !gateway.includes(`"${segment}"`) && !gateway.includes(`/${segment}`));
        if (absent.length) {
            missing.push(`${client}: ${route} -> ${absent.join(', ')}`);
        }
    }
}

if (missing.length) {
    console.error(missing.join('\n'));
    process.exit(1);
}

console.log('Todas las rutas revisadas tienen una rama en el gateway.');
