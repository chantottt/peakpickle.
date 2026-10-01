export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function assert(condition: unknown, message: string, status = 400): asserts condition {
  if (!condition) throw new HttpError(status, message);
}
