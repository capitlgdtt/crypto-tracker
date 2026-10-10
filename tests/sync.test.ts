import { syncService } from '../src/services/syncService';
import { cmcClient } from '../src/services/coinmarketcap';
import { cryptoRepository } from '../src/modules/cryptocurrencies/repository';
import { priceRepository } from '../src/modules/prices/repository';
import { ServiceUnavailableError } from '../src/utils/errors';
import { setupTestApp, teardownTestApp } from './helpers/testApp';
import { seedCrypto } from './helpers/seed';

jest.mock('../src/services/coinmarketcap', () => ({
    cmcClient: { fetchQuotes: jest.fn() },
}));

const mockFetchQuotes = cmcClient.fetchQuotes as jest.Mock;

describe('syncService.syncOnce', () => {
    beforeEach(() => {
        setupTestApp();
        jest.clearAllMocks();
    });

    afterEach(() => {
        teardownTestApp();
    });

    it('returns zero result without calling CMC when nothing is tracked', async () => {
        const result = await syncService.syncOnce();
        expect(result).toEqual({ total: 0, updated: 0, skipped: 0, errors: [] });
        expect(mockFetchQuotes).not.toHaveBeenCalled();
    });

    it('saves price records and updates lastUpdatedAt', async () => {
        const btc = seedCrypto('BTC', 'Bitcoin');
        const eth = seedCrypto('ETH', 'Ethereum');

        mockFetchQuotes.mockResolvedValue([
            { symbol: 'BTC', price: 50000, currency: 'USD' },
            { symbol: 'ETH', price: 3000, currency: 'USD' },
        ]);

        const result = await syncService.syncOnce();
        expect(result).toEqual({ total: 2, updated: 2, skipped: 0, errors: [] });

        const btcHistory = priceRepository.findByCryptocurrencyId(btc.id, {
            limit: 10,
            offset: 0,
        });
        expect(btcHistory).toHaveLength(1);
        expect(btcHistory[0].price).toBe(50000);

        const ethHistory = priceRepository.findByCryptocurrencyId(eth.id, {
            limit: 10,
            offset: 0,
        });
        expect(ethHistory).toHaveLength(1);
        expect(ethHistory[0].price).toBe(3000);

        const btcReloaded = cryptoRepository.findById(btc.id);
        expect(btcReloaded?.lastUpdatedAt).toEqual(expect.any(String));
    });

    it('skips symbols not returned by CMC and records the error', async () => {
        seedCrypto('BTC', 'Bitcoin');
        seedCrypto('ETH', 'Ethereum');

        mockFetchQuotes.mockResolvedValue([
            { symbol: 'BTC', price: 50000, currency: 'USD' },
        ]);

        const result = await syncService.syncOnce();
        expect(result.total).toBe(2);
        expect(result.updated).toBe(1);
        expect(result.skipped).toBe(1);
        expect(result.errors[0]).toContain('ETH');
    });

    it('propagates external API errors to the caller', async () => {
        seedCrypto('BTC', 'Bitcoin');
        mockFetchQuotes.mockRejectedValue(new ServiceUnavailableError('CMC down'));

        await expect(syncService.syncOnce()).rejects.toBeInstanceOf(ServiceUnavailableError);
    });

    it('passes all tracked symbols to the CMC client', async () => {
        seedCrypto('BTC', 'Bitcoin');
        seedCrypto('ETH', 'Ethereum');
        mockFetchQuotes.mockResolvedValue([]);

        await syncService.syncOnce();

        expect(mockFetchQuotes).toHaveBeenCalledWith(
            expect.arrayContaining(['BTC', 'ETH']),
        );
    });
});