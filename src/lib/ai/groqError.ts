export type GroqFailureKind =
  | "rate_limited"
  | "truncated"
  | "unparseable"
  | "provider"
  | "config";

export class GroqCallError extends Error {
  status?: number;
  feature: string;
  kind: GroqFailureKind;
  cause?: unknown;

  constructor(
    message: string,
    opts: { status?: number; feature?: string; kind?: GroqFailureKind; cause?: unknown } = {}
  ) {
    super(message);
    this.name = "GroqCallError";
    this.status = opts.status;
    this.feature = opts.feature ?? "unspecified";
    this.kind = opts.kind ?? "provider";
    this.cause = opts.cause;
  }
}
