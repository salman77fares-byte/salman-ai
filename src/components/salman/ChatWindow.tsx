import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Copy, Mic, MicOff, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { BrandMark } from "./BrandMark";
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
import { cn } from "@/lib/utils";

const QUICK_PROMPTS = [
  { title: "ساعدني في كتابة كود", hint: "أنشئ دالة React لعرض قائمة مهام" },
  { title: "لخص هذا النص", hint: "لخّص المقال التالي في خمس نقاط" },
  { title: "أفكار لمشاريع جديدة", hint: "اقترح ٥ أفكار مشاريع تقنية مربحة" },
  { title: "اشرح لي مفهوماً", hint: "اشرح لي كيف تعمل قواعد البيانات العلائقية" },
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

  const { messages, sendMessage, status, regenerate, error } = useChat({
    id: conversationId,
    messages: initialMessages,
    transport,
    onError: (err) => {
      const message = err.message.includes("429")
        ? "تم تجاوز حد الاستخدام، حاول بعد قليل."
        : err.message.includes("402")
          ? "انتهى رصيد الذكاء الاصطناعي، يلزم ترقية الخطة."
          : "تعذّر الحصول على رد. حاول مرة أخرى.";
      toast.error(message);
    },
  });

  const isBusy = status === "submitted" || status === "streaming";
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

  const submit = useCallback(
    async (message: PromptInputMessage) => {
      const text = message.text.trim();
      if (!text && message.files.length === 0) return;
      if (isBusy) return;
      await sendMessage({ text, files: message.files });
      onFirstMessage?.();
      focusInput();
    },
    [isBusy, sendMessage, onFirstMessage, focusInput],
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
        <ConversationContent className="mx-auto w-full max-w-3xl gap-6 px-4 py-6">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <BrandMark size={72} className="shadow-glow" />
              <h1 className="mt-6 text-2xl font-extrabold sm:text-3xl">
                مرحباً بك، أنا <span className="brand-gradient-text">Salman AI</span>
              </h1>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                كيف يمكنني مساعدتك اليوم؟
              </p>
              <div className="mt-8 grid w-full gap-3 sm:grid-cols-2">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt.title}
                    type="button"
                    onClick={() => void submit({ text: prompt.hint, files: [] })}
                    className="rounded-2xl border border-border bg-card p-4 text-start transition-all hover:border-primary/50 hover:shadow-glow"
                  >
                    <span className="block text-sm font-extrabold">{prompt.title}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">{prompt.hint}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message, index) => {
              const text = messageText(message);
              const isLastAssistant =
                message.role === "assistant" && index === messages.length - 1;
              return (
                <Message from={message.role} key={message.id}>
                  <div className="flex w-full items-start gap-3">
                    {message.role === "assistant" ? <BrandMark size={30} /> : null}
                    <MessageContent
                      className={cn(
                        "min-w-0",
                        message.role === "user" &&
                          "group-[.is-user]:bg-bubble-user group-[.is-user]:text-bubble-user-foreground group-[.is-user]:rounded-2xl",
                      )}
                    >
                      {message.role === "assistant" ? (
                        <MessageResponse>{text}</MessageResponse>
                      ) : (
                        <p className="whitespace-pre-wrap leading-relaxed">{text}</p>
                      )}
                    </MessageContent>
                  </div>
                  {message.role === "assistant" && text ? (
                    <MessageActions className="ms-11">
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

          {status === "submitted" ? (
            <div className="flex items-center gap-3">
              <BrandMark size={30} />
              <Shimmer className="text-sm font-bold">... Salman AI يكتب الآن</Shimmer>
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
        <div className="mx-auto w-full max-w-3xl px-4 py-3">
          <PromptInput
            onSubmit={submit}
            accept="image/*,text/*,application/pdf"
            multiple
            maxFiles={4}
            className="rounded-2xl"
          >
            <PromptInputTextarea
              ref={textareaRef}
              placeholder="اكتب رسالتك إلى Salman AI..."
              className="min-h-[52px] text-base"
            />
            <PromptInputFooter className="justify-between">
              <PromptInputTools>
                <PromptInputActionMenu>
                  <PromptInputActionMenuTrigger />
                  <PromptInputActionMenuContent>
                    <PromptInputActionAddAttachments label="إرفاق ملف" />
                  </PromptInputActionMenuContent>
                </PromptInputActionMenu>
                <PromptInputButton
                  type="button"
                  onClick={toggleVoice}
                  aria-label="الإدخال الصوتي"
                  variant={listening ? "default" : "ghost"}
                >
                  {listening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
                </PromptInputButton>
              </PromptInputTools>
              <PromptInputSubmit status={status} />
            </PromptInputFooter>
          </PromptInput>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            قد يخطئ Salman AI — تحقّق من المعلومات المهمة.
          </p>
        </div>
      </div>
    </div>
  );
}
