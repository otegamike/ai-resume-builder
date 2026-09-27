import "server-only";

import { logAiUsage } from "@/lib/logAiUsage";
import type { AiRequestContext } from "./context";
import {
  GENERATION_MODEL,
  VISION_MODEL,
  WRITER_SYSTEM_INSTRUCTION,
  GroqCallError,
  getGroqErrorStatus,
  groq,
  isRetriableGroqError,
  sleep,
} from "./client";

export async function callGroq(
  prompt: string,
  options: {
    model?: string;
    systemInstruction?: string;
    temperature?: number;
    maxTokens?: number;
    feature?: string;
    ctx: AiRequestContext;
  }
): Promise<{ content: string; truncated: boolean }> {
  const {
    model = GENERATION_MODEL,
    systemInstruction = WRITER_SYSTEM_INSTRUCTION,
    temperature = 0.3,
    maxTokens = 1024,
    feature = "unspecified",
    ctx,
  } = options;

  const maxRetries = 2;
  const backoffs = [500, 1000];

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const start = Date.now();
    try {
      const completion = await groq.chat.completions.create({
        model,
        temperature,
        max_completion_tokens: maxTokens,
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: prompt },
        ],
      });
      const latencyMs = Date.now() - start;

      const choice = completion.choices[0];
      const truncated = choice?.finish_reason === "length";
      if (truncated) console.warn("Groq response truncated by max_completion_tokens");

      logAiUsage({
        feature,
        model,
        promptTokens: completion.usage?.prompt_tokens ?? 0,
        completionTokens: completion.usage?.completion_tokens ?? 0,
        totalTokens: completion.usage?.total_tokens ?? 0,
        queueTimeMs: completion.usage?.queue_time ? Math.round(completion.usage.queue_time * 1000) : undefined,
        latencyMs,
        truncated,
        finishReason: choice?.finish_reason ?? "unknown",
        error: false,
        userId: ctx.userId,
        userEmail: ctx.userEmail,
      });

      return { content: choice?.message?.content?.trim() || "", truncated };
    } catch (err: unknown) {
      const latencyMs = Date.now() - start;
      const retriable = isRetriableGroqError(err);
      const status = getGroqErrorStatus(err);
      const message = err instanceof Error ? err.message : String(err);

      if (retriable && attempt < maxRetries) {
        console.warn(`Groq call failed (attempt ${attempt + 1}/${maxRetries + 1}) for ${feature}: ${message} — retrying...`);
        await sleep(backoffs[attempt] ?? 1000);
        continue;
      }

      logAiUsage({
        feature,
        model,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        latencyMs,
        truncated: false,
        finishReason: "error",
        error: true,
        errorMessage: message.slice(0, 500),
        userId: ctx.userId,
        userEmail: ctx.userEmail,
      });

      console.error(`Groq ${feature} failed after ${attempt + 1} attempt(s):`, {
        status,
        message,
        userId: ctx.userId,
        userEmail: ctx.userEmail,
      });

      throw new GroqCallError(message || "Groq API call failed", {
        status,
        feature,
        kind: status === 429 ? "rate_limited" : "provider",
        cause: err,
      });
    }
  }

  throw new GroqCallError("Groq API call failed after retries", { feature });
}

export async function callGroqVision(
  prompt: string,
  dataUrl: string,
  feature: string,
  ctx: AiRequestContext
): Promise<string> {
  const maxRetries = 2;
  const backoffs = [500, 1000];

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const start = Date.now();
    try {
      const completion = await groq.chat.completions.create({
        model: VISION_MODEL,
        temperature: 0.1,
        max_completion_tokens: 4096,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
      });
      const latencyMs = Date.now() - start;

      const choice = completion.choices[0];

      logAiUsage({
        feature,
        model: VISION_MODEL,
        promptTokens: completion.usage?.prompt_tokens ?? 0,
        completionTokens: completion.usage?.completion_tokens ?? 0,
        totalTokens: completion.usage?.total_tokens ?? 0,
        queueTimeMs: completion.usage?.queue_time ? Math.round(completion.usage.queue_time * 1000) : undefined,
        latencyMs,
        truncated: choice?.finish_reason === "length",
        finishReason: choice?.finish_reason ?? "unknown",
        error: false,
        userId: ctx.userId,
        userEmail: ctx.userEmail,
      });

      return choice?.message?.content?.trim() || "";
    } catch (err: unknown) {
      const latencyMs = Date.now() - start;
      const retriable = isRetriableGroqError(err);
      const status = getGroqErrorStatus(err);
      const message = err instanceof Error ? err.message : String(err);

      if (retriable && attempt < maxRetries) {
        console.warn(`Groq vision call failed (attempt ${attempt + 1}/${maxRetries + 1}) for ${feature}: ${message} — retrying...`);
        await sleep(backoffs[attempt] ?? 1000);
        continue;
      }

      logAiUsage({
        feature,
        model: VISION_MODEL,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        latencyMs,
        truncated: false,
        finishReason: "error",
        error: true,
        errorMessage: message.slice(0, 500),
        userId: ctx.userId,
        userEmail: ctx.userEmail,
      });

      console.error(`Groq vision ${feature} failed after ${attempt + 1} attempt(s):`, {
        status,
        message,
        userId: ctx.userId,
        userEmail: ctx.userEmail,
      });

      throw new GroqCallError(message || "Groq vision API call failed", {
        status,
        feature,
        kind: status === 429 ? "rate_limited" : "provider",
        cause: err,
      });
    }
  }

  throw new GroqCallError("Groq vision API call failed after retries", { feature });
}

export async function callGroqJson<T>(
  prompt: string,
  options: {
    model?: string;
    systemInstruction?: string;
    temperature?: number;
    maxTokens?: number;
    feature: string;
    parse: (raw: string) => T;
    retryMaxTokens?: number;
    retryModel?: string;
    ctx: AiRequestContext;
  }
): Promise<{ parsed: T; raw: string }> {
  const { parse, retryMaxTokens = 8000, retryModel, ctx, ...groqOptions } = options;

  const first = await callGroq(prompt, { ...groqOptions, ctx });
  let raw = first.content;
  const truncated = first.truncated;

  try {
    const parsed = parse(raw);
    return { parsed, raw };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    if (truncated) {
      console.warn(`First ${groqOptions.feature} response truncated, retrying with larger budget...`);
      ({ content: raw } = await callGroq(prompt, {
        ...groqOptions,
        ctx,
        model: retryModel ?? groqOptions.model,
        temperature: 0,
        maxTokens: retryMaxTokens,
      }));
    } else {
      console.warn(`First ${groqOptions.feature} parse failed (${message}), retrying with stern nudge...`);
      ({ content: raw } = await callGroq(
        `Your previous response was not valid JSON. Return ONLY the raw JSON object, no markdown, no explanation.\n\n${prompt}`,
        {
          ...groqOptions,
          ctx,
          temperature: 0,
        }
      ));
    }

    try {
      const parsed = parse(raw);
      return { parsed, raw };
    } catch (retryErr) {
      const retryMessage = retryErr instanceof Error ? retryErr.message : String(retryErr);
      logAiUsage({
        feature: groqOptions.feature,
        model: (retryModel ?? groqOptions.model) ?? GENERATION_MODEL,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        latencyMs: 0,
        truncated: false,
        finishReason: "parse_error",
        error: true,
        errorMessage: `JSON parse failed after retry: ${retryMessage} — raw: ${raw.slice(0, 200)}`.slice(0, 500),
        userId: ctx.userId,
        userEmail: ctx.userEmail,
      });
      console.error(`Groq ${groqOptions.feature} returned unparseable JSON after retry:`, {
        truncated,
        userId: ctx.userId,
        userEmail: ctx.userEmail,
        rawPreview: raw.slice(0, 300),
      });
      throw new GroqCallError(`AI returned unparseable JSON after retry for ${groqOptions.feature}: ${retryMessage}`, {
        feature: groqOptions.feature,
        kind: truncated ? "truncated" : "unparseable",
        cause: retryErr,
      });
    }
  }
}
