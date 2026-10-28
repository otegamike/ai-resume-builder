export class InputExtractionError extends Error {
  status: number;

  constructor(message: string, status: number, options: { cause?: unknown } = {}) {
    super(message, options);
    this.name = "InputExtractionError";
    this.status = status;
  }
}
