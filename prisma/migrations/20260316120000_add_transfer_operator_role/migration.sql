-- Add transfer operator role for transfer module access.
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'TRANSFER_OPERATOR';
