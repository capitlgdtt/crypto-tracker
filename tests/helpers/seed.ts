import { cryptoRepository } from '../../src/modules/cryptocurrencies/repository';
import { priceRepository } from '../../src/modules/prices/repository';
import { Cryptocurrency } from '../../src/modules/cryptocurrencies/types';

export function seedCrypto(symbol: string, name: string): Cryptocurrency {
    return cryptoRepository.create({ symbol, name });
}

export function seedPrice(
    cryptoId: number,
    price: number,
    createdAt?: string,
): void {
    priceRepository.insert({
        cryptocurrencyId: cryptoId,
        price,
        currency: 'USD',
        createdAt,
    });
}