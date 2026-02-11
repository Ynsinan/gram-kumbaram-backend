import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Gold Portfolio Tracker API',
      version: '1.0.0',
      description: 'Backend API for tracking physical gold investments (Buy & Sell)',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'https://api.gramkumbaram.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token',
        },
      },
      schemas: {
        GoldPrice: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Numeric identifier (1=gram, 2=ceyrek, 3=yarim, 4=cumhuriyet)',
              example: 1,
            },
            name: {
              type: 'string',
              description: 'Display name of the gold type',
              example: 'Gram Altın',
            },
            buyPrice: {
              type: 'number',
              description: 'Current buy price in TL',
              example: 7026.70,
            },
            sellPrice: {
              type: 'number',
              description: 'Current sell price in TL',
              example: 7086.94,
            },
          },
        },
        GoldTransaction: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Transaction ID',
            },
            userId: {
              type: 'string',
              format: 'uuid',
              description: 'User ID',
            },
            type: {
              type: 'string',
              enum: ['BUY', 'SELL'],
              description: 'Transaction type',
            },
            goldType: {
              type: 'string',
              enum: ['gram', 'ceyrek', 'yarim', 'cumhuriyet'],
              description: 'Type of gold',
            },
            quantity: {
              type: 'number',
              description: 'Quantity of gold',
            },
            pricePerUnit: {
              type: 'number',
              description: 'Price per unit at transaction time',
            },
            transactionDate: {
              type: 'string',
              format: 'date-time',
              description: 'Date of transaction',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Record creation timestamp',
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            email: {
              type: 'string',
              format: 'email',
            },
            name: {
              type: 'string',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'string',
              description: 'Error code',
            },
            message: {
              type: 'string',
              description: 'Error message',
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Authentication',
        description: 'Google OAuth authentication endpoints',
      },
      {
        name: 'Gold Prices',
        description: 'Live gold price data from altin.in',
      },
      {
        name: 'Transactions',
        description: 'Buy and Sell transaction management',
      },
      {
        name: 'Portfolio',
        description: 'Portfolio summary and profit/loss calculation',
      },
    ],
  },
  apis: ['./src/routes/*.ts', './dist/routes/*.js'],
};

export const swaggerSpec = swaggerJsdoc(options);
