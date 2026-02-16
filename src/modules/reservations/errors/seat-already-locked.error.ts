export class SeatAlreadyLockedError extends Error {
  constructor() {
    super('Seat already locked.');
    this.name = 'SeatAlreadyLockedError';
  }
}
