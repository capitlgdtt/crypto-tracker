import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import swaggerUi from 'swagger-ui-express';

type JsonObject = Record<string, unknown>;

const openapiPath = path.resolve(__dirname, 'openapi.yaml');

function loadSpec(): JsonObject {
    const content = fs.readFileSync(openapiPath, 'utf8');
    const parsed = yaml.load(content);
    if (typeof parsed !== 'object' || parsed === null) {
        throw new Error('Invalid OpenAPI specification');
    }
    return parsed as JsonObject;
}

export function createDocsRouter(): Router {
    const router = Router();
    const spec = loadSpec();

    router.get('/openapi.json', (_req, res) => {
        res.status(200).json(spec);
    });

    router.use('/api-docs', swaggerUi.serve, swaggerUi.setup(spec));

    return router;
}