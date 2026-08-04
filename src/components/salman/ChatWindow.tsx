import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { ArrowUp, Copy, Mic, MicOff, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { BrandMark } from "./BrandMark";
import {
  GeneratedImage,
  ImageGenerationLoader,
  parseImageMessage,
} from "./GeneratedImage";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
  MessageActions,
  MessageAction,
} from "@/components/ai-elements/message";
import { Shimmer } from "@/components/ai-elements/shimmer";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputButton,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { supabase } from "@/integrations/supabase/client";
import { extractImagePrompt, isImageRequest } from "@/lib/image-intent";
import { cn } from "@/lib/utils";

const QUICK_PROMPTS = [
  { title: "ساعدني في كتابة كود", hint: "أنشئ دالة React لعرض قائمة مهام" },
  { title: "أنشئ صورة", hint: "أنشئ صورة لمدينة مستقبلية على ساحل البحر" },
  { title: "لخص هذا النص", hint: "لخّص المقال التالي في خمس نقاط" },
  { title: "أفكار لمشاريع جديدة", hint: "اقترح ٥ أفكار مشاريع تقنية مربحة" },
];

function messageText(message: UIMessage): string {
  return message.parts.map((part) => (part.type === "text" ? part.text : "")).join("");
}

export function ChatWindow({
  conversationId,
  initialMessages,
  onFirstMessage,
}: {
  conversationId: string;
  initialMessages: UIMessage[];
  onFirstMessage?: (() => void) | undefined;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const [imagePending, setImagePending] = useState(false);

  const queryClient = useQueryClient();

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: async ({ messages }) => {
          const { data } = await supabase.auth.getSession();
          return {
            headers: data.session?.access_token
              ? { Authorization: `Bearer ${data.session.access_token}` }
              : {},
            body: { messages, conversationId },
          };
        },
      }),
    [conversationId],
  );

  const { messages, setMessages, sendMessage, status, regenerate, error } = useChat({
    id: conversationId,
    messages: initialMessages,
    transport,
    onFinish: () => {
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (err) => {
      const message = err.message.includes("429")
        ? "تم تجاوز حد الاستخدام، حاول بعد قليل."
        : err.message.includes("402")
          ? "انتهى رصيد الذكاء الاصطناعي، يلزم ترقية الخطة."
          : "تعذّر الحصول على رد. حاول مرة أخرى.";
      toast.error(message);
    },
  });

  const isBusy = status === "submitted" || status === "streaming" || imagePending;
  const isEmpty = messages.length === 0;

  const focusInput = useCallback(() => {
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, []);

  useEffect(() => {
    focusInput();
  }, [conversationId, focusInput]);

  useEffect(() => {
    if (status === "ready") focusInput();
  }, [status, focusInput]);

  const runImageGeneration = useCallback(
    async ({ prompt, userText }: { prompt: string; userText?: string | undefined }) => {
      setImagePending(true);
      if (userText) {
        setMessages((current) => [
          ...current,
          {
            id: `local-user-${Date.now()}`,
            role: "user" as const,
            parts: [{ type: "text" as const, text: userText }],
          },
        ]);
      }
      try {
        const { data } = await supabase.auth.getSession();
        const response = await fetch("/api/generate-image", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(data.session?.access_token
              ? { Authorization: `Bearer ${data.session.access_token}` }
              : {}),
          },
          body: JSON.stringify({ prompt, conversationId, save: Boolean(userText) }),
        });
        const payload = (await response.json().catch(() => ({}))) as {
          url?: string;
          error?: string;
        };
        if (!response.ok || !payload.url) {
          throw new Error(payload.error ?? "تعذّر توليد الصورة، حاول مرة أخرى.");
        }
        setMessages((current) => [
          ...current,
          {
            id: `local-image-${Date.now()}`,
            role: "assistant" as const,
            parts: [{ type: "text" as const, text: `![${prompt}](${payload.url})` }],
          },
        ]);
        void queryClient.invalidateQueries({ queryKey: ["conversations"] });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "تعذّر توليد الصورة، حاول مرة أخرى.";
        toast.error(message);
        setMessages((current) => [
          ...current,
          {
            id: `local-image-error-${Date.now()}`,
            role: "assistant" as const,
            parts: [{ type: "text" as const, text: `⚠️ ${message}` }],
          },
        ]);
      } finally {
        setImagePending(false);
        focusInput();
      }
    },
    [conversationId, focusInput, queryClient, setMessages],
  );

  const submit = useCallback(
    async (message: PromptInputMessage) => {
      const text = message.text.trim();
      if (!text && message.files.length === 0) return;
      if (isBusy) return;

      if (text && message.files.length === 0 && isImageRequest(text)) {
        onFirstMessage?.();
        await runImageGeneration({ prompt: extractImagePrompt(text), userText: text });
        return;
      }

      await sendMessage({ text, files: message.files });
      onFirstMessage?.();
      focusInput();
    },
    [isBusy, sendMessage, onFirstMessage, focusInput, runImageGeneration],
  );

  const toggleVoice = useCallback(() => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
    const Ctor = (w.SpeechRecognition ?? w.webkitSpeechRecognition) as
      | (new () => {
          lang: string;
          interimResults: boolean;
          continuous: boolean;
          start: () => void;
          stop: () => void;
          onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
          onend: (() => void) | null;
          onerror: (() => void) | null;
        })
      | undefined;

    if (!Ctor) {
      toast.error("الإدخال الصوتي غير مدعوم في هذا المتصفح.");
      return;
    }

    const recognition = new Ctor();
    recognition.lang = "ar-SA";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i += 1) {
        transcript += event.results[i]?.[0]?.transcript ?? "";
      }
      const textarea = textareaRef.current;
      if (textarea) {
        const next = `${textarea.value}${textarea.value ? " " : ""}${transcript}`;
        textarea.value = next;
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
        textarea.focus();
      }
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [listening]);

  const copyMessage = useCallback(async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success("تم نسخ الرسالة");
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="mx-auto w-full max-w-3xl gap-3 px-3 py-4 sm:gap-4 sm:px-4">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <BrandMark size={64} className="shadow-glow" />
              <h1 className="mt-5 text-xl font-extrabold sm:text-3xl">
                مرحباً، أنا <span className="brand-gradient-text">Salman AI</span>
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">كيف يمكنني مساعدتك اليوم؟</p>
              <div className="mt-6 grid w-full gap-2.5 sm:grid-cols-2">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt.title}
                    type="button"
                    onClick={() => void submit({ text: prompt.hint, files: [] })}
                    className="rounded-2xl border border-border bg-card p-3 text-start transition-all hover:border-primary/50 hover:shadow-glow"
                  >
                    <span className="block text-[13px] font-extrabold">{prompt.title}</span>
                    <span className="mt-1 block text-[11px] text-muted-foreground">
                      {prompt.hint}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message, index) => {
              const text = messageText(message);
              const image = message.role === "assistant" ? parseImageMessage(text) : null;
              const isLastAssistant =
                message.role === "assistant" && index === messages.length - 1;
              return (
                <Message from={message.role} key={message.id}>
                  <div className="flex w-full items-start gap-2.5">
                    {message.role === "assistant" ? <BrandMark size={26} /> : null}
                    <MessageContent
                      className={cn(
                        "min-w-0 text-[13px] leading-7 sm:text-sm",
                        message.role === "user" &&
                          "group-[.is-user]:bg-bubble-user group-[.is-user]:text-bubble-user-foreground group-[.is-user]:rounded-2xl group-[.is-user]:px-3.5 group-[.is-user]:py-2.5",
                      )}
                    >
                      {image ? (
                        <GeneratedImage
                          url={image.url}
                          prompt={image.prompt}
                          busy={isBusy}
                          onRegenerate={() =>
                            void runImageGeneration({ prompt: image.prompt })
                          }
                        />
                      ) : message.role === "assistant" ? (
                        <MessageResponse>{text}</MessageResponse>
                      ) : (
                        <p className="whitespace-pre-wrap leading-7">{text}</p>
                      )}
                    </MessageContent>
                  </div>
                  {message.role === "assistant" && text && !image ? (
                    <MessageActions className="ms-9">
                      <MessageAction
                        label="نسخ الرسالة"
                        tooltip="نسخ الرسالة"
                        onClick={() => void copyMessage(text)}
                      >
                        <Copy className="size-4" />
                      </MessageAction>
                      {isLastAssistant ? (
                        <MessageAction
                          label="إعادة التوليد"
                          tooltip="إعادة توليد الرد"
                          disabled={isBusy}
                          onClick={() => void regenerate()}
                        >
                          <RefreshCw className="size-4" />
                        </MessageAction>
                      ) : null}
                    </MessageActions>
                  ) : null}
                </Message>
              );
            })
          )}

          {imagePending ? (
            <div className="flex items-start gap-2.5">
              <BrandMark size={26} />
              <ImageGenerationLoader />
            </div>
          ) : null}

          {status === "submitted" ? (
            <div className="flex items-center gap-2.5">
              <BrandMark size={26} />
              <Shimmer className="text-[13px] font-bold">... Salman AI يكتب الآن</Shimmer>
              <span className="flex gap-1">
                <span className="salman-dot size-1.5 rounded-full bg-primary" />
                <span
                  className="salman-dot size-1.5 rounded-full bg-primary"
                  style={{ animationDelay: "0.15s" }}
                />
                <span
                  className="salman-dot size-1.5 rounded-full bg-primary"
                  style={{ animationDelay: "0.3s" }}
                />
              </span>
            </div>
          ) : null}

          {error ? (
            <p className="text-center text-xs text-destructive">حدث خطأ أثناء توليد الرد.</p>
          ) : null}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="sticky bottom-0 border-t border-border bg-background/85 backdrop-blur">
        <div className="mx-auto w-full max-w-3xl px-3 py-2">
          <PromptInput
            onSubmit={submit}
            accept="image/*,text/*,application/pdf"
            multiple
            maxFiles={4}
            className="rounded-full px-1.5 py-1"
          >
            <div className="flex items-center gap-1">
              <PromptInputTools className="gap-0.5">
                <PromptInputActionMenu>
                  <PromptInputActionMenuTrigger className="size-8 rounded-full" />
                  <PromptInputActionMenuContent>
                    <PromptInputActionAddAttachments label="إرفاق ملف" />
                  </PromptInputActionMenuContent>
                </PromptInputActionMenu>
                <PromptInputButton
                  type="button"
                  onClick={toggleVoice}
                  aria-label="الإدخال الصوتي"
                  variant={listening ? "default" : "ghost"}
                  className="size-8 rounded-full"
                >
                  {listening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
                </PromptInputButton>
              </PromptInputTools>
              <PromptInputTextarea
                ref={textareaRef}
                placeholder="اكتب رسالتك إلى Salman AI..."
                className="min-h-9 flex-1 resize-none py-2 text-[13px] leading-6"
                rows={1}
              />
              <PromptInputSubmit
                status={status}
                className="size-9 shrink-0 rounded-full brand-gradient-bg text-primary-foreground"
              >
                {status === "ready" || status === undefined ? (
                  <ArrowUp className="size-4" />
                ) : undefined}
              </PromptInputSubmit>
            </div>
          </PromptInput>
          <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
            قد يخطئ Salman AI — تحقّق من المعلومات المهمة.
          </p>
        </div>
      </div>
    </div>
  );
}
