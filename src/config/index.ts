import path from 'path';

function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value || value.trim() === '') {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}

function optionalEnv(name: string, fallback: string): string {
    const value = process.env[name];
    return value && value.trim() !== '' ? value : fallback;
}

function numberEnv(name: string, fallback: number): number {
    const raw = process.env[name];
    if (!raw || raw.trim() === '') return fallback;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error(`Environment variable ${name} must be a positive number`);
    }
    return parsed;
}

function resolveDbPath(raw: string): string {
    if (raw === ':memory:') return raw;
    return path.resolve(process.cwd(), raw);
}

export const config = {
    port: numberEnv('PORT', 3000),
    nodeEnv: optionalEnv('NODE_ENV', 'development'),
    apiKey: requireEnv('API_KEY'),
    cmc: {
        apiKey: requireEnv('CMC_API_KEY'),
        baseUrl: optionalEnv('CMC_BASE_URL', 'https://pro-api.coinmarketcap.com'),
        timeoutMs: numberEnv('CMC_TIMEOUT_MS', 10000),
    },
    defaultCurrency: optionalEnv('DEFAULT_CURRENCY', 'USD'),
    syncIntervalMs: numberEnv('SYNC_INTERVAL_MS', 60000),
    dbPath: resolveDbPath(optionalEnv('DB_PATH', './data/crypto.sqlite')),
} as const;

export type AppConfig = typeof config;