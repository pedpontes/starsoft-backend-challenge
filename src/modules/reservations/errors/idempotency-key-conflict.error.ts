export class IdempotencyKeyConflictError extends Error {
  constructor() {
    super('Idempotency key already used.');
  }
}
