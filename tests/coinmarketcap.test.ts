import axios, { AxiosInstance } from 'axios';
import { cmcClient } from '../src/services/coinmarketcap';
import { ExternalApiError, ServiceUnavailableError } from '../src/utils/errors';

jest.mock('axios', () => {
    const actual = jest.requireActual('axios');
    return {
        __esModule: true,
        default: {
            ...actual.default,
            create: jest.fn(),
        },
    };
});

const mockCreate = axios.create as jest.Mock;
const mockGet = jest.fn();

beforeEach(() => {
    jest.clearAllMocks();
    mockCreate.mockReturnValue({ get: mockGet } as unknown as AxiosInstance);
});

describe('cmcClient.fetchQuotes', () => {
    it('returns empty array for empty input without calling axios', async () => {
        const result = await cmcClient.fetchQuotes([]);
        expect(result).toEqual([]);
        expect(mockCreate).not.toHaveBeenCalled();
    });

    it('returns parsed quotes from a successful response', async () => {
        mockGet.mockResolvedValue({
            data: {
                status: { error_code: 0 },
                data: {
                    BTC: { symbol: 'BTC', quote: { USD: { price: 50000 } } },
                    ETH: { symbol: 'ETH', quote: { USD: { price: 3000 } } },
                },
            },
        });

        const result = await cmcClient.fetchQuotes(['BTC', 'ETH']);
        expect(result).toEqual([
            { symbol: 'BTC', price: 50000, currency: 'USD' },
            { symbol: 'ETH', price: 3000, currency: 'USD' },
        ]);
    });

    it('deduplicates and uppercases symbols before the request', async () => {
        mockGet.mockResolvedValue({
            data: {
                status: { error_code: 0 },
                data: { BTC: { symbol: 'BTC', quote: { USD: { price: 50000 } } } },
            },
        });

        await cmcClient.fetchQuotes(['btc', 'BTC', 'btc']);

        expect(mockGet).toHaveBeenCalledWith(
            '/v1/cryptocurrency/quotes/latest',
            expect.objectContaining({
                params: expect.objectContaining({ symbol: 'BTC' }),
            }),
        );
    });

    it('throws ExternalApiError when CMC reports error_code in body', async () => {
        mockGet.mockResolvedValue({
            data: {
                status: { error_code: 1001, error_message: 'Invalid API key' },
            },
        });

        await expect(cmcClient.fetchQuotes(['BTC'])).rejects.toBeInstanceOf(ExternalApiError);
    });

    it('throws ExternalApiError on HTTP error response', async () => {
        mockGet.mockRejectedValue({
            isAxiosError: true,
            message: 'Request failed with status code 500',
            response: {
                status: 500,
                data: { status: { error_message: 'Server error' } },
            },
        });

        await expect(cmcClient.fetchQuotes(['BTC'])).rejects.toBeInstanceOf(ExternalApiError);
    });

    it('throws ServiceUnavailableError on timeout', async () => {
        mockGet.mockRejectedValue({
            isAxiosError: true,
            code: 'ECONNABORTED',
            message: 'timeout of 5000ms exceeded',
        });

        await expect(cmcClient.fetchQuotes(['BTC'])).rejects.toBeInstanceOf(ServiceUnavailableError);
    });

    it('throws ServiceUnavailableError on network error', async () => {
        mockGet.mockRejectedValue({
            isAxiosError: true,
            code: 'ENOTFOUND',
            message: 'getaddrinfo ENOTFOUND',
        });

        await expect(cmcClient.fetchQuotes(['BTC'])).rejects.toBeInstanceOf(ServiceUnavailableError);
    });

    it('throws ExternalApiError when body.data is missing', async () => {
        mockGet.mockResolvedValue({
            data: { status: { error_code: 0 } },
        });

        await expect(cmcClient.fetchQuotes(['BTC'])).rejects.toBeInstanceOf(ExternalApiError);
    });

    it('skips entries without a valid price', async () => {
        mockGet.mockResolvedValue({
            data: {
                status: { error_code: 0 },
                data: {
                    BTC: { symbol: 'BTC', quote: { USD: { price: 50000 } } },
                    XYZ: { symbol: 'XYZ', quote: { USD: {} } },
                    ABC: { symbol: 'ABC' },
                },
            },
        });

        const result = await cmcClient.fetchQuotes(['BTC', 'XYZ', 'ABC']);
        expect(result).toEqual([{ symbol: 'BTC', price: 50000, currency: 'USD' }]);
    });
});