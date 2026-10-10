export interface PriceRecord {
    id: number;
    cryptocurrencyId: number;
    price: number;
    currency: string;
    createdAt: string;
}

export interface CreatePriceRecordInput {
    cryptocurrencyId: number;
    price: number;
    currency: string;
    createdAt?: string;
}

export interface PriceHistoryQuery {
    from?: string;
    to?: string;
    limit: number;
    offset: number;
}