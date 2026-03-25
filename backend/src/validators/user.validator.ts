import { UserRole } from '../entities/User';

export interface CreateUserInput {
  username: string;
  password: string;
  fullName?: string | null;
  role?: UserRole;
}

export interface UpdateUserInput {
  fullName?: string | null;
  role?: UserRole;
  isActive?: boolean;
}

export interface ValidationError {
  field: string;
  message: string;
}

const VALID_ROLES: UserRole[] = ['admin', 'leader', 'manager'];

export function validateCreateUser(body: unknown): { data: CreateUserInput; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  const input = body as Record<string, unknown>;

  if (!input['username'] || typeof input['username'] !== 'string' || input['username'].trim().length === 0) {
    errors.push({ field: 'username', message: 'Username is required' });
  } else if (input['username'].trim().length < 3) {
    errors.push({ field: 'username', message: 'Username must be at least 3 characters' });
  } else if (input['username'].trim().length > 255) {
    errors.push({ field: 'username', message: 'Username must not exceed 255 characters' });
  } else if (!/^[a-zA-Z0-9_.-]+$/.test(input['username'].trim())) {
    errors.push({ field: 'username', message: 'Username may only contain letters, numbers, underscores, dots, and hyphens' });
  }

  if (!input['password'] || typeof input['password'] !== 'string' || input['password'].length === 0) {
    errors.push({ field: 'password', message: 'Password is required' });
  } else if (input['password'].length < 8) {
    errors.push({ field: 'password', message: 'Password must be at least 8 characters' });
  }

  if (input['fullName'] !== undefined && input['fullName'] !== null) {
    if (typeof input['fullName'] !== 'string') {
      errors.push({ field: 'fullName', message: 'Full name must be a string' });
    } else if ((input['fullName'] as string).length > 255) {
      errors.push({ field: 'fullName', message: 'Full name must not exceed 255 characters' });
    }
  }

  if (input['role'] !== undefined) {
    if (!VALID_ROLES.includes(input['role'] as UserRole)) {
      errors.push({ field: 'role', message: `Role must be one of: ${VALID_ROLES.join(', ')}` });
    }
  }

  return {
    data: {
      username: typeof input['username'] === 'string' ? input['username'].trim() : '',
      password: typeof input['password'] === 'string' ? input['password'] : '',
      fullName: input['fullName'] !== undefined ? (input['fullName'] as string | null) : null,
      role: VALID_ROLES.includes(input['role'] as UserRole) ? (input['role'] as UserRole) : 'manager',
    },
    errors,
  };
}

export function validateUpdateUser(body: unknown): { data: UpdateUserInput; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  const input = body as Record<string, unknown>;

  if (input['fullName'] !== undefined && input['fullName'] !== null) {
    if (typeof input['fullName'] !== 'string') {
      errors.push({ field: 'fullName', message: 'Full name must be a string' });
    } else if ((input['fullName'] as string).length > 255) {
      errors.push({ field: 'fullName', message: 'Full name must not exceed 255 characters' });
    }
  }

  if (input['role'] !== undefined) {
    if (!VALID_ROLES.includes(input['role'] as UserRole)) {
      errors.push({ field: 'role', message: `Role must be one of: ${VALID_ROLES.join(', ')}` });
    }
  }

  if (input['isActive'] !== undefined && typeof input['isActive'] !== 'boolean') {
    errors.push({ field: 'isActive', message: 'isActive must be a boolean' });
  }

  const data: UpdateUserInput = {};
  if (input['fullName'] !== undefined) data.fullName = input['fullName'] as string | null;
  if (input['role'] !== undefined && VALID_ROLES.includes(input['role'] as UserRole)) data.role = input['role'] as UserRole;
  if (input['isActive'] !== undefined && typeof input['isActive'] === 'boolean') data.isActive = input['isActive'];

  return { data, errors };
}
