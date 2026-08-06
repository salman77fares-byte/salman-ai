import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  ArrowUp,
  Copy,
  FileText,
  Image as ImageIcon,
  Mic,
  MicOff,
  Palette,
  Plus,
  RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { BrandMark } from "./BrandMark";
import { GeneratedImage, parseImageMessage } from "./GeneratedImage";
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
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuItem,
  PromptInputActionMenuTrigger,
  PromptInputButton,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputAttachments,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { appendMessages } from "@/lib/chat.functions";
import { useNewChat } from "@/lib/guest-chat";
import { translateImagePrompt } from "@/lib/image-prompt.functions";
import { extractImagePrompt, isImageRequest } from "@/lib/image-intent";
import { buildPollinationsUrl } from "@/lib/pollinations";
import { cn } from "@/lib/utils";

function messageText(message: UIMessage): string {
  return message.parts.map((part) => (part.type === "text" ? part.text : "")).join("");
}

/** Plus (+) menu: attachments and a shortcut that seeds an image request. */
function PlusMenu({ onGenerateImage }: { onGenerateImage: () => void }) {
  const attachments = usePromptInputAttachments();

  return (
    <PromptInputActionMenu>
      <PromptInputActionMenuTrigger
        aria-label="خيارات إضافية"
        className="size-8 rounded-full"
      >
        <Plus className="size-4" />
      </PromptInputActionMenuTrigger>
      <PromptInputActionMenuContent
        align="start"
        side="top"
        sideOffset={10}
        className="min-w-56 rounded-2xl"
      >
        <PromptInputActionMenuItem
          onSelect={(event) => {
            event.preventDefault();
            attachments.openFileDialog();
          }}
        >
          <ImageIcon className="me-2 size-4" />
          إرفاق صورة
        </PromptInputActionMenuItem>
        <PromptInputActionMenuItem
          onSelect={(event) => {
            event.preventDefault();
            attachments.openFileDialog();
          }}
        >
          <FileText className="me-2 size-4" />
          إرفاق ملف
        </PromptInputActionMenuItem>
        <PromptInputActionMenuItem
          onSelect={(event) => {
            event.preventDefault();
            onGenerateImage();
          }}
        >
          <Palette className="me-2 size-4" />
          توليد صورة بالذكاء الاصطناعي
        </PromptInputActionMenuItem>
      </PromptInputActionMenuContent>
    </PromptInputActionMenu>
  );
}

export function ChatWindow({
  chatKey,
  conversationId,
  initialMessages,
  isGuest = false,
  onFirstMessage,
}: {
  chatKey: string;
  conversationId?: string | undefined;
  initialMessages: UIMessage[];
  isGuest?: boolean | undefined;
  onFirstMessage?: (() => void) | undefined;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [listening, setListening] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);

  const queryClient = useQueryClient();
  const saveMessages = useServerFn(appendMessages);
  const translatePrompt = useServerFn(translateImagePrompt);
  const startNewChat = useNewChat();

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
            body: { messages, ...(conversationId ? { conversationId } : {}) },
          };
        },
      }),
    [conversationId],
  );

  const { messages, setMessages, sendMessage, status, regenerate, error } = useChat({
    id: chatKey,
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

  const isBusy = status === "submitted" || status === "streaming" || generatingImage;
  const isEmpty = messages.length === 0;

  const focusInput = useCallback(() => {
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, []);

  useEffect(() => {
    focusInput();
  }, [chatKey, focusInput]);

  useEffect(() => {
    if (status === "ready") focusInput();
  }, [status, focusInput]);

  /** Renders a Pollinations image for an already-translated English prompt. */
  const renderImage = useCallback(
    ({
      englishPrompt,
      userText,
    }: {
      englishPrompt: string;
      userText?: string | undefined;
    }) => {
      const url = buildPollinationsUrl(englishPrompt);
      const stamp = Date.now();
      const content = `![${englishPrompt}](${url})`;

      setMessages((current) => [
        ...current,
        ...(userText
          ? [
              {
                id: `local-user-${stamp}`,
                role: "user" as const,
                parts: [{ type: "text" as const, text: userText }],
              },
            ]
          : []),
        {
          id: `local-image-${stamp}`,
          role: "assistant" as const,
          parts: [{ type: "text" as const, text: content }],
        },
      ]);

      if (!isGuest && conversationId) {
        void saveMessages({
          data: {
            conversationId,
            messages: [
              ...(userText ? [{ sender: "user" as const, content: userText }] : []),
              { sender: "assistant" as const, content },
            ],
            ...(userText ? { title: userText.slice(0, 60) } : {}),
          },
        })
          .then(() => queryClient.invalidateQueries({ queryKey: ["conversations"] }))
          .catch(() => toast.error("تعذّر حفظ الصورة في سجل المحادثات."));
      }

      focusInput();
    },
    [conversationId, focusInput, isGuest, queryClient, saveMessages, setMessages],
  );

  /** Translates the request to a detailed English prompt, then generates. */
  const runImageGeneration = useCallback(
    async ({ request, userText }: { request: string; userText?: string | undefined }) => {
      setGeneratingImage(true);
      try {
        let englishPrompt = request;
        try {
          const result = await translatePrompt({ data: { prompt: request } });
          if (result?.prompt) englishPrompt = result.prompt;
        } catch {
          toast.error("تعذّرت ترجمة الوصف، سيتم استخدام النص الأصلي.");
        }
        renderImage({ englishPrompt, userText });
      } finally {
        setGeneratingImage(false);
      }
    },
    [renderImage, translatePrompt],
  );

  const submit = useCallback(
    async (message: PromptInputMessage) => {
      const text = message.text.trim();
      if (!text && message.files.length === 0) return;
      if (isBusy) return;

      if (text && message.files.length === 0 && isImageRequest(text)) {
        onFirstMessage?.();
        void runImageGeneration({ request: extractImagePrompt(text), userText: text });
        return;
      }

      await sendMessage({ text, files: message.files });
      onFirstMessage?.();
      focusInput();
    },
    [isBusy, sendMessage, onFirstMessage, focusInput, runImageGeneration],
  );

  const seedImagePrompt = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.value = textarea.value.trim() ? textarea.value : "أنشئ صورة ";
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  }, []);

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
    <div className="flex h-full min-h-0 flex-col overflow-x-hidden">
      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="mx-auto w-full max-w-3xl gap-3 px-3 py-4 sm:gap-4 sm:px-4">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <BrandMark size={64} className="shadow-glow" />
              <h1 className="mt-5 text-xl font-extrabold sm:text-3xl">
                مرحباً، أنا <span className="brand-gradient-text">Salman AI</span>
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">كيف يمكنني مساعدتك اليوم؟</p>
              <Button
                size="sm"
                variant="outline"
                onClick={startNewChat}
                className="mt-4 h-8 gap-1.5 rounded-full px-3 text-xs font-extrabold"
              >
                <Plus className="size-3.5" />
                محادثة جديدة
              </Button>
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
                            renderImage({ englishPrompt: image.prompt })
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

          {status === "submitted" || generatingImage ? (
            <div className="flex items-center gap-2.5">
              <BrandMark size={26} />
              <Shimmer className="text-[13px] font-bold">
                {generatingImage
                  ? "جاري رسم وتوليد صورتك بواسطة Salman AI..."
                  : "... Salman AI يكتب الآن"}
              </Shimmer>
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

      <div className="sticky bottom-0 z-20 shrink-0 border-t border-border bg-background/90 backdrop-blur">
        <div className="safe-bottom mx-auto w-full max-w-3xl px-3 pt-2">
          {isGuest ? (
            <p className="mb-1.5 flex items-center justify-center gap-2 text-[11px] leading-5 text-muted-foreground">
              <span>تنبيه: محادثة كزائر - لن يتم حفظ السجل</span>
              <Link to="/auth" className="font-extrabold text-primary hover:underline">
                تسجيل الدخول
              </Link>
            </p>
          ) : null}

          <PromptInput
            onSubmit={submit}
            accept="image/*,text/*,application/pdf"
            multiple
            maxFiles={4}
            className="rounded-full px-1.5 py-1"
          >
            <div className="flex items-center gap-1">
              <PromptInputSubmit
                status={status}
                className="order-last size-9 shrink-0 rounded-full brand-gradient-bg text-primary-foreground"
              >
                {status === "ready" || status === undefined ? (
                  <ArrowUp className="size-4" />
                ) : undefined}
              </PromptInputSubmit>
              <PromptInputTools className="gap-0.5">
                <PlusMenu onGenerateImage={seedImagePrompt} />
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
            </div>
          </PromptInput>
          <p className="mt-1.5 pb-2 text-center text-[10px] text-muted-foreground">
            قد يخطئ Salman AI — تحقّق من المعلومات المهمة.
          </p>
        </div>
      </div>
    </div>
  );
}
