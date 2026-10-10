import { cryptoRepository } from '../modules/cryptocurrencies/repository';
import { priceRepository } from '../modules/prices/repository';
import { cmcClient, Quote } from './coinmarketcap';

export interface SyncResult {
    total: number;
    updated: number;
    skipped: number;
    errors: string[];
}

export const syncService = {
    async syncOnce(): Promise<SyncResult> {
        const tracked = cryptoRepository.findAll();
        const result: SyncResult = {
            total: tracked.length,
            updated: 0,
            skipped: 0,
            errors: [],
        };

        if (tracked.length === 0) return result;

        const symbols = tracked.map((c) => c.symbol);
        const quotes = await cmcClient.fetchQuotes(symbols);

        const quotesBySymbol = new Map<string, Quote>();
        for (const quote of quotes) {
            quotesBySymbol.set(quote.symbol, quote);
        }

        const now = new Date().toISOString();

        for (const crypto of tracked) {
            const quote = quotesBySymbol.get(crypto.symbol);
            if (!quote) {
                result.skipped += 1;
                result.errors.push(`No quote returned for ${crypto.symbol}`);
                continue;
            }

            try {
                priceRepository.insert({
                    cryptocurrencyId: crypto.id,
                    price: quote.price,
                    currency: quote.currency,
                    createdAt: now,
                });
                cryptoRepository.updateLastUpdatedAt(crypto.id, now);
                result.updated += 1;
            } catch (err) {
                result.skipped += 1;
                result.errors.push(
                    `Failed to persist quote for ${crypto.symbol}: ${
                        err instanceof Error ? err.message : 'unknown error'
                    }`,
                );
            }
        }

        return result;
    },
};