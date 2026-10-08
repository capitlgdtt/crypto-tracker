export class AppError extends Error {
    public readonly statusCode: number;
    public readonly code: string;
    public readonly details?: unknown;

    constructor(statusCode: number, code: string, message: string, details?: unknown) {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        Error.captureStackTrace(this, this.constructor);
    }
}

export class BadRequestError extends AppError {
    constructor(message = 'Bad request', details?: unknown) {
        super(400, 'BAD_REQUEST', message, details);
    }
}

export class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized') {
        super(401, 'UNAUTHORIZED', message);
    }
}

export class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
        super(404, 'NOT_FOUND', message);
    }
}

export class ConflictError extends AppError {
    constructor(message = 'Conflict', details?: unknown) {
        super(409, 'CONFLICT', message, details);
    }
}

export class ExternalApiError extends AppError {
    constructor(message = 'External API error', details?: unknown) {
        super(502, 'EXTERNAL_API_ERROR', message, details);
    }
}

export class ServiceUnavailableError extends AppError {
    constructor(message = 'Service unavailable') {
        super(503, 'SERVICE_UNAVAILABLE', message);
    }
}