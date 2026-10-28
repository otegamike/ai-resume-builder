export interface AppErrorOptions {
  status?: number;
  code?: string;
  userMessage?: string;
  expected?: boolean;
  cause?: unknown;
}

export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly userMessage: string;
  readonly expected: boolean;
  override readonly cause?: unknown;

  constructor(message: string, options: AppErrorOptions = {}) {
    super(message);
    this.name = "AppError";
    this.status = options.status ?? 500;
    this.code = options.code ?? "APP_ERROR";
    this.expected = options.expected ?? this.status < 500;
    this.userMessage =
      options.userMessage ??
      (this.status < 500 ? message : "Something went wrong on our side. Please try again.");
    this.cause = options.cause;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
