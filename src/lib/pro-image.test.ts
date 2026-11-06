import { describe, it, expect, afterEach } from "bun:test";
import { defaultImageModel, getImageKey, setImageKey, proImageBody, proImageSchema } from "./pro-image";
import { APP_CONTEXT_POLICY } from "./app-context";
import { buildPollinationsUrl } from "./pollinations";

afterEach(() => setImageKey(""));
describe("image selection rules", () => {
  it("uses the free model without a key", () => expect(defaultImageModel("")).toBe("flux"));
  it("switches to the real professional provider with a key", () => expect(defaultImageModel("test-placeholder")).toBe("openai-pro"));
  it("clears the session key", () => { setImageKey("test-placeholder"); setImageKey(""); expect(getImageKey()).toBe(""); });
  it("requests high quality from the genuine OpenAI model", () => expect(proImageBody("a tree")).toEqual({model: "gpt-image-1", prompt: "a tree", quality: "high", size: "1024x1024", n: 1}));
  it("rejects a missing key", () => expect(proImageSchema.safeParse({prompt: "a tree", apiKey: ""}).success).toBe(false));
  it("keeps styles isolated between calls", () => { buildPollinationsUrl("a tree", 1, "flux-anime"); const plain = buildPollinationsUrl("a tree", 1, "flux"); expect(decodeURIComponent(plain)).not.toContain("anime style"); expect(new URL(plain).searchParams.get("model")).toBe("flux"); });
});
describe("assistant product knowledge policy", () => {
  it("does not announce features in greetings", () => expect(APP_CONTEXT_POLICY.announceOnGreeting).toBe(false));
  it("does not announce features in ordinary conversation", () => expect(APP_CONTEXT_POLICY.announceInOrdinaryConversation).toBe(false));
  it("allows help on explicit app questions", () => expect(APP_CONTEXT_POLICY.explainOnExplicitAppQuestion).toBe(true));
});