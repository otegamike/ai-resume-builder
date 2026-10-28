export class ApiClientError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
  }
}

export function apiStatusMessage(status: number): string {
  if (status === 401) return "Please sign in again to continue.";
  if (status === 402) {
    return "You don't have enough credits for this action. Upgrade your plan or wait for your monthly reset.";
  }
  if (status === 403) return "You don't have permission to do that.";
  if (status === 404) return "We couldn't find what you were looking for.";
  if (status === 408) return "That request took too long. Please try again.";
  if (status === 409) return "That action is already in progress. Please try again in a moment.";
  if (status === 413) return "That file is too large. Please choose a smaller file.";
  if (status === 422) return "We couldn't read that input. Please check it and try again.";
  if (status === 429) return "Too many requests right now. Please wait a moment and try again.";
  if (status >= 500) return "Something went wrong on our side. Please try again.";
  return "That request didn't go through. Please try again.";
}

function extractErrorMessage(body: unknown): { message?: string; code?: string } {
  if (!body || typeof body !== "object") return {};
  const record = body as { error?: unknown; message?: unknown; code?: unknown };
  const message =
    typeof record.error === "string"
      ? record.error
      : typeof record.message === "string"
        ? record.message
        : undefined;
  const code = typeof record.code === "string" ? record.code : undefined;
  return { message, code };
}

export async function readApiError(response: Response): Promise<ApiClientError> {
  let parsed: { message?: string; code?: string } = {};
  try {
    parsed = extractErrorMessage(await response.clone().json());
  } catch {
    parsed = {};
  }

  const message = parsed.message?.trim() || apiStatusMessage(response.status);
  return new ApiClientError(message, response.status, parsed.code);
}

export async function assertApiResponse(response: Response): Promise<Response> {
  if (!response.ok) {
    throw await readApiError(response);
  }
  return response;
}
