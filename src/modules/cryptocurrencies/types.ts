export interface Cryptocurrency {
    id: number;
    symbol: string;
    name: string;
    lastUpdatedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreateCryptocurrencyInput {
    symbol: string;
    name: string;
}

export interface UpdateCryptocurrencyInput {
    symbol?: string;
    name?: string;
}