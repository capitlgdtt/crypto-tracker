import { NotFoundError } from '../../utils/errors';
import { cryptoRepository } from './repository';
import {
    CreateCryptocurrencyInput,
    Cryptocurrency,
    UpdateCryptocurrencyInput,
} from './types';

export const cryptoService = {
    list(): Cryptocurrency[] {
        return cryptoRepository.findAll();
    },

    getById(id: number): Cryptocurrency {
        const found = cryptoRepository.findById(id);
        if (!found) {
            throw new NotFoundError(`Cryptocurrency with id ${id} not found`);
        }
        return found;
    },

    create(input: CreateCryptocurrencyInput): Cryptocurrency {
        return cryptoRepository.create(input);
    },

    update(id: number, patch: UpdateCryptocurrencyInput): Cryptocurrency {
        const updated = cryptoRepository.update(id, patch);
        if (!updated) {
            throw new NotFoundError(`Cryptocurrency with id ${id} not found`);
        }
        return updated;
    },

    delete(id: number): void {
        const deleted = cryptoRepository.delete(id);
        if (!deleted) {
            throw new NotFoundError(`Cryptocurrency with id ${id} not found`);
        }
    },
};