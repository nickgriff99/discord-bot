export function createLogger(name) {
  return {
    info: (message, data = '') => console.log(`[${name}] INFO: ${message}`, data),
    warn: (message, data = '') => console.warn(`[${name}] WARN: ${message}`, data),
    error: (message, data = '') => console.error(`[${name}] ERROR: ${message}`, data),
    debug: (message, data = '') => console.log(`[${name}] DEBUG: ${message}`, data)
  };
}

export function createAsyncDebouncer(fn, delay = 300) {
  let timeoutId;
  
  return async function(...args) {
    clearTimeout(timeoutId);
    
    return new Promise((resolve, reject) => {
      timeoutId = setTimeout(async () => {
        try {
          const result = await fn.apply(this, args);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, delay);
    });
  };
}

export function createValidator(schema) {
  return function validate(data) {
    const errors = [];
    
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
        
        if (rules.min && value < rules.min) {
          errors.push(`${key} must be at least ${rules.min}`);
        }
        
        if (rules.max && value > rules.max) {
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
  string: { type: 'string' },
  number: { type: 'number' },
  boolean: { type: 'boolean' },
  volume: { type: 'number', min: 0, max: 100 }
};

export function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  return input.replace(/[<>]/g, '').trim();
}
