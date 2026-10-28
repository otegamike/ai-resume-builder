import { handleApiError, type ApiErrorMeta } from "./handleApiError";

export function withApiHandler<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response> | Response,
  meta: ApiErrorMeta
): (...args: Args) => Promise<Response> {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleApiError(error, meta);
    }
  };
}
