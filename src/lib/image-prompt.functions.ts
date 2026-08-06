import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Translates and enriches an image request into an English prompt. */
export const translateImagePrompt = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ prompt: z.string().trim().min(1).max(600) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { buildEnglishImagePrompt } = await import("./image-prompt.server");
    return { prompt: await buildEnglishImagePrompt(data.prompt) };
  });
