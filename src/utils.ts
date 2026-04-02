type ValidatorRules = {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean';
  min?: number;
  max?: number;
};

type ValidatorSchema = Record<string, ValidatorRules>;

export function createLogger(name: string) {
  return {
    info: (message: string, data: unknown = '') => console.log(`[${name}] INFO: ${message}`, data),
    warn: (message: string, data: unknown = '') => console.warn(`[${name}] WARN: ${message}`, data),
    error: (message: string, data: unknown = '') => console.error(`[${name}] ERROR: ${message}`, data),
    debug: (message: string, data: unknown = '') => console.log(`[${name}] DEBUG: ${message}`, data)
  };
}

export function createAsyncDebouncer<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  delay = 300
) {
  let timeoutId: ReturnType<typeof setTimeout>;

  return async function (this: unknown, ...args: Parameters<T>) {
    clearTimeout(timeoutId);

    return new Promise<ReturnType<T>>((resolve, reject) => {
      timeoutId = setTimeout(async () => {
        try {
          const result = await fn.apply(this, args);
          resolve(result as ReturnType<T>);
        } catch (error) {
          reject(error);
        }
      }, delay);
    });
  };
}

export function createValidator(schema: ValidatorSchema) {
  return function validate(data: Record<string, unknown>) {
    const errors: string[] = [];

    for (const [key, rules] of Object.entries(schema)) {
      const value = data[key];

      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`${key} is required`);
        continue;
      }

      if (value !== undefined && value !== null) {
        if (rules.type && typeof value !== rules.type) {
          errors.push(`${key} must be of type ${rules.type}`);
        }

        if (rules.min !== undefined && typeof value === 'number' && value < rules.min) {
          errors.push(`${key} must be at least ${rules.min}`);
        }

        if (rules.max !== undefined && typeof value === 'number' && value > rules.max) {
          errors.push(`${key} must be at most ${rules.max}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      data
    };
  };
}

export const ValidationRules = {
  required: { required: true },
  string: { type: 'string' as const },
  number: { type: 'number' as const },
  boolean: { type: 'boolean' as const },
  volume: { type: 'number' as const, min: 0, max: 100 }
};

export function sanitizeInput(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input.replace(/[<>]/g, '').trim();
}
