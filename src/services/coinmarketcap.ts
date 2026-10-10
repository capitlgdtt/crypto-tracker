import axios, { AxiosError, AxiosInstance } from 'axios';
import { config } from '../config';
import { ExternalApiError, ServiceUnavailableError } from '../utils/errors';

export interface Quote {
    symbol: string;
    price: number;
    currency: string;
}

interface CmcQuoteUsd {
    price?: number;
}

interface CmcQuoteEntry {
    symbol?: string;
    quote?: Record<string, CmcQuoteUsd>;
}

interface CmcQuotesResponse {
    data?: Record<string, CmcQuoteEntry>;
    status?: {
        error_code?: number;
        error_message?: string | null;
    };
}

function getClient(): AxiosInstance {
    return axios.create({
        baseURL: config.cmc.baseUrl,
        timeout: config.cmc.timeoutMs,
        headers: {
            'X-CMC_PRO_API_KEY': config.cmc.apiKey,
            Accept: 'application/json',
        },
    });
}

function translateAxiosError(err: AxiosError): Error {
    if (err.response) {
        const status = err.response.status;
        const message =
            (err.response.data as { status?: { error_message?: string } } | undefined)
                ?.status?.error_message ?? `CoinMarketCap responded with status ${status}`;
        return new ExternalApiError(message, { status });
    }

    if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
        return new ServiceUnavailableError('CoinMarketCap request timed out');
    }

    return new ServiceUnavailableError(
        `CoinMarketCap request failed: ${err.message}`,
    );
}

async function requestQuotes(symbols: string[]): Promise<CmcQuotesResponse> {
    try {
        const response = await getClient().get<CmcQuotesResponse>(
            '/v1/cryptocurrency/quotes/latest',
            {
                params: {
                    symbol: symbols.join(','),
                    convert: config.defaultCurrency,
                },
            },
        );
        return response.data;
    } catch (err) {
        if (axios.isAxiosError(err)) {
            throw translateAxiosError(err);
        }
        throw new ServiceUnavailableError('Unexpected error while calling CoinMarketCap');
    }
}

function parseQuotes(body: CmcQuotesResponse): Quote[] {
    if (body.status && body.status.error_code && body.status.error_code !== 0) {
        throw new ExternalApiError(
            body.status.error_message ?? 'CoinMarketCap returned an error',
            { errorCode: body.status.error_code },
        );
    }

    if (!body.data) {
        throw new ExternalApiError('CoinMarketCap returned an empty response');
    }

    const result: Quote[] = [];
    for (const [key, entry] of Object.entries(body.data)) {
        const quote = entry.quote?.[config.defaultCurrency];
        const price = quote?.price;
        if (typeof price !== 'number' || !Number.isFinite(price)) {
            continue;
        }
        result.push({
            symbol: (entry.symbol ?? key).toUpperCase(),
            price,
            currency: config.defaultCurrency,
        });
    }

    return result;
}

export const cmcClient = {
    async fetchQuotes(symbols: string[]): Promise<Quote[]> {
        if (symbols.length === 0) return [];

        const unique = Array.from(new Set(symbols.map((s) => s.toUpperCase())));
        const body = await requestQuotes(unique);
        return parseQuotes(body);
    },
};