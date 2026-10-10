import { cryptoService } from '../cryptocurrencies/service';
import { Cryptocurrency } from '../cryptocurrencies/types';
import { priceRepository } from './repository';
import { PriceHistoryQuery, PriceRecord } from './types';

export interface PriceHistoryResult {
    items: PriceRecord[];
    total: number;
    limit: number;
    offset: number;
}

export interface LatestPrice {
    cryptocurrencyId: number;
    symbol: string;
    name: string;
    price: number;
    currency: string;
    createdAt: string;
}

export const priceService = {
    history(cryptoId: number, query: PriceHistoryQuery): PriceHistoryResult {
        cryptoService.getById(cryptoId);

        const items = priceRepository.findByCryptocurrencyId(cryptoId, query);
        const total = priceRepository.countByCryptocurrencyId(
            cryptoId,
            query.from,
            query.to,
        );

        return { items, total, limit: query.limit, offset: query.offset };
    },

    latestForSymbols(symbols?: string[]): LatestPrice[] {
        const allCrypto = cryptoService.list();
        const bySymbol = new Map<string, Cryptocurrency>();
        for (const c of allCrypto) {
            bySymbol.set(c.symbol.toUpperCase(), c);
        }

        const filter = symbols
            ? new Set(symbols.map((s) => s.toUpperCase()))
            : null;

        const targetIds = new Set<number>();
        if (filter) {
            for (const symbol of filter) {
                const found = bySymbol.get(symbol);
                if (found) targetIds.add(found.id);
            }
        }

        const latest = priceRepository.findLatestForAll();
        const result: LatestPrice[] = [];

        for (const record of latest) {
            const crypto = allCrypto.find((c) => c.id === record.cryptocurrencyId);
            if (!crypto) continue;
            if (filter && !targetIds.has(crypto.id)) continue;

            result.push({
                cryptocurrencyId: crypto.id,
                symbol: crypto.symbol,
                name: crypto.name,
                price: record.price,
                currency: record.currency,
                createdAt: record.createdAt,
            });
        }

        return result;
    },
};