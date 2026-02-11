import type { Request, Response, NextFunction } from 'express';

type BasicAuthOptions = {
  username: string;
  password: string;
  realm?: string;
};

const unauthorized = (res: Response, realm: string) => {
  res.setHeader('WWW-Authenticate', `Basic realm="${realm}", charset="UTF-8"`);
  res.status(401).json({
    success: false,
    error: 'Unauthorized',
    message: 'Authentication required',
  });
};

export const basicAuthMiddleware = (options: BasicAuthOptions) => {
  const realm = options.realm ?? 'Restricted';

  return (req: Request, res: Response, next: NextFunction): void => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Basic ')) {
      unauthorized(res, realm);
      return;
    }

    const encoded = header.slice('Basic '.length).trim();
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    const separatorIndex = decoded.indexOf(':');
    if (separatorIndex === -1) {
      unauthorized(res, realm);
      return;
    }

    const username = decoded.slice(0, separatorIndex);
    const password = decoded.slice(separatorIndex + 1);

    if (username !== options.username || password !== options.password) {
      unauthorized(res, realm);
      return;
    }

    next();
  };
};

