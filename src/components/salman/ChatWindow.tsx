import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  ArrowUp,
  Copy,
  FileText,
  Image as ImageIcon,
  Mic,
  MicOff,
  Pencil,
  Plus,
  RefreshCw,
  Square,
  X,
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

const FILE_ACCEPT =
  "image/*,application/pdf,text/plain,text/markdown,text/csv,application/json,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function messageText(message: UIMessage): string {
  return message.parts.map((part) => (part.type === "text" ? part.text : "")).join("");
}

/** Reads a blob/object URL into a data URL so the server can actually see the file. */
async function toDataUrl(url: string): Promise<string> {
  if (url.startsWith("data:")) return url;
  const blob = await (await fetch(url)).blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(blob);
  });
}

/** Plus (+) menu with two dedicated pickers: images and documents. */
function PlusMenu() {
  const attachments = usePromptInputAttachments();
  const imageRef = useRef<HTMLInputElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  return (
    <>
      <input
        ref={imageRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => {
          if (event.currentTarget.files?.length) attachments.add(event.currentTarget.files);
          event.currentTarget.value = "";
        }}
      />
      <input
        ref={fileRef}
        type="file"
        accept={FILE_ACCEPT}
        multiple
        className="hidden"
        onChange={(event) => {
          if (event.currentTarget.files?.length) attachments.add(event.currentTarget.files);
          event.currentTarget.value = "";
        }}
      />
      <PromptInputActionMenu>
        <PromptInputActionMenuTrigger aria-label="خيارات إضافية" className="size-8 rounded-full">
          <Plus className="size-4" />
        </PromptInputActionMenuTrigger>
        <PromptInputActionMenuContent
          align="start"
          side="top"
          sideOffset={10}
          className="min-w-52 rounded-2xl"
        >
          <PromptInputActionMenuItem
            onSelect={(event) => {
              event.preventDefault();
              imageRef.current?.click();
            }}
          >
            <ImageIcon className="me-2 size-4" />
            إرفاق صورة
          </PromptInputActionMenuItem>
          <PromptInputActionMenuItem
            onSelect={(event) => {
              event.preventDefault();
              fileRef.current?.click();
            }}
          >
            <FileText className="me-2 size-4" />
            إرفاق ملف
          </PromptInputActionMenuItem>
        </PromptInputActionMenuContent>
      </PromptInputActionMenu>
    </>
  );
}

/** Thumbnails / chips for the currently attached files. */
function AttachmentPreviews() {
  const attachments = usePromptInputAttachments();
  if (attachments.files.length === 0) return null;

  return (
    <div className="flex w-full basis-full flex-wrap gap-2 border-b border-border/70 bg-secondary/40 px-2 py-2">
      {attachments.files.map((file) => (
        <div
          key={file.id}
          className="relative flex items-center gap-1.5 rounded-xl border border-border bg-secondary px-2 py-1"
        >
          {file.mediaType?.startsWith("image/") && file.url ? (
            <img src={file.url} alt={file.filename ?? ""} className="size-8 rounded-lg object-cover" />
          ) : (
            <FileText className="size-4 text-muted-foreground" />
          )}
          <span className="max-w-28 truncate text-[10px] font-bold">{file.filename}</span>
          <button
            type="button"
            aria-label="إزالة المرفق"
            onClick={() => attachments.remove(file.id)}
            className="rounded-full p-0.5 text-muted-foreground hover:text-destructive"
          >
            <X className="size-3" />
          </button>
        </div>
      ))}
    </div>
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
  const [stalled, setStalled] = useState(false);
  const [touchMenu, setTouchMenu] = useState<
    { id: string; text: string; x: number; y: number } | null
  >(null);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const { messages, setMessages, sendMessage, status, regenerate, stop, error } = useChat({
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
  const lastMessage = messages[messages.length - 1];
  const lastAssistantEmpty =
    lastMessage?.role === "assistant" &&
    lastMessage.parts.every((part) => part.type !== "text" || part.text.length === 0);
  const showThinking =
    generatingImage ||
    status === "submitted" ||
    (status === "streaming" && (lastMessage?.role === "user" || lastAssistantEmpty));


  const focusInput = useCallback(() => {
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, []);

  useEffect(() => {
    focusInput();
  }, [chatKey, focusInput]);

  useEffect(() => {
    if (status === "ready") focusInput();
  }, [status, focusInput]);

  // Watchdog: if the model never starts answering within 15s, fail loudly.
  useEffect(() => {
    if (status !== "submitted") return;
    setStalled(false);
    const timer = setTimeout(() => {
      stop();
      setStalled(true);
      toast.error("تأخّر الرد أكثر من ١٥ ثانية، حاول مرة أخرى.");
    }, 15_000);
    return () => clearTimeout(timer);
  }, [status, stop]);

  useEffect(() => {
    if (status === "streaming") setStalled(false);
  }, [status]);

  /** Renders a Pollinations (Flux) image for an already-translated English prompt. */
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
      setStalled(false);

      if (text && message.files.length === 0 && isImageRequest(text)) {
        onFirstMessage?.();
        void runImageGeneration({ request: extractImagePrompt(text), userText: text });
        return;
      }

      // Attachments arrive as blob URLs; inline them so the model receives the bytes.
      let files = message.files;
      try {
        files = await Promise.all(
          message.files.map(async (file) => ({ ...file, url: await toDataUrl(file.url) })),
        );
      } catch {
        toast.error("تعذّر تجهيز المرفقات.");
        return;
      }

      await sendMessage({ text, files });
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
          onerror: ((event: { error?: string }) => void) | null;
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
    recognition.onerror = (event) => {
      setListening(false);
      if (event?.error === "not-allowed" || event?.error === "service-not-allowed") {
        toast.error("يرجى السماح بالوصول للميكروفون لاستخدام هذه الميزة");
      } else if (event?.error === "no-speech") {
        toast.error("لم يتم التعرّف على أي كلام، حاول مرة أخرى.");
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [listening]);

  const copyMessage = useCallback(async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success("تم نسخ الرسالة");
  }, []);

  /** Puts a previous user message back in the input and drops it (and later turns). */
  const editAndResend = useCallback(
    (id: string, text: string) => {
      setMessages((current) => {
        const index = current.findIndex((message) => message.id === id);
        return index === -1 ? current : current.slice(0, index);
      });
      const textarea = textareaRef.current;
      if (textarea) {
        textarea.value = text;
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
        textarea.focus();
        textarea.setSelectionRange(text.length, text.length);
      }
    },
    [setMessages],
  );

  const openTouchMenu = useCallback((id: string, text: string, x: number, y: number) => {
    setTouchMenu({ id, text, x, y });
  }, []);

  const clearLongPress = () => {
    if (longPressRef.current) clearTimeout(longPressRef.current);
    longPressRef.current = null;
  };

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-x-hidden">
      {!isEmpty ? (
        <div className="pointer-events-none absolute right-3 top-2 z-30">
          <Button
            size="sm"
            variant="secondary"
            onClick={startNewChat}
            className="pointer-events-auto h-8 gap-1.5 rounded-full border border-border px-3 text-xs font-extrabold shadow-soft"
          >
            <Plus className="size-3.5" />
            محادثة جديدة
          </Button>
        </div>
      ) : null}

      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-3 py-4 text-start sm:gap-4 sm:px-4">
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
              const isUser = message.role === "user";
              const isLastAssistant =
                message.role === "assistant" && index === messages.length - 1;
              const fileParts = message.parts.filter(
                (part): part is Extract<typeof part, { type: "file" }> => part.type === "file",
              );
              return (
                <Message
                  from={message.role}
                  key={message.id}
                  // RTL: user bubbles hug the right edge, Salman AI hugs the left.
                  className={cn(
                    "flex w-full max-w-full flex-col",
                    isUser ? "items-end text-right" : "items-start text-right",
                  )}
                >
                  <div
                    className={cn(
                      "flex max-w-[92%] items-start gap-2.5",
                      isUser ? "self-end flex-row-reverse" : "self-start",
                    )}
                  >
                    {!isUser ? <BrandMark size={26} /> : null}
                    <MessageContent
                      onContextMenu={
                        isUser
                          ? (event) => {
                              event.preventDefault();
                              openTouchMenu(message.id, text, event.clientX, event.clientY);
                            }
                          : undefined
                      }
                      onTouchStart={
                        isUser
                          ? (event) => {
                              const touch = event.touches[0];
                              const x = touch?.clientX ?? 0;
                              const y = touch?.clientY ?? 0;
                              clearLongPress();
                              longPressRef.current = setTimeout(
                                () => openTouchMenu(message.id, text, x, y),
                                500,
                              );
                            }
                          : undefined
                      }
                      onTouchEnd={isUser ? clearLongPress : undefined}
                      onTouchMove={isUser ? clearLongPress : undefined}
                      className={cn(
                        "min-w-0 text-[13px] leading-7 sm:text-sm",
                        isUser &&
                          "group-[.is-user]:ml-0 group-[.is-user]:mr-0 group-[.is-user]:bg-bubble-user group-[.is-user]:text-bubble-user-foreground group-[.is-user]:rounded-2xl group-[.is-user]:px-3.5 group-[.is-user]:py-2.5",
                        !isUser &&
                          "group-[.is-assistant]:rounded-2xl group-[.is-assistant]:bg-secondary group-[.is-assistant]:px-3.5 group-[.is-assistant]:py-2.5",
                      )}
                    >

                      {fileParts.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {fileParts.map((part, fileIndex) =>
                            part.mediaType?.startsWith("image/") ? (
                              <img
                                key={`${message.id}-file-${fileIndex}`}
                                src={part.url}
                                alt={part.filename ?? "مرفق"}
                                className="max-h-40 rounded-xl object-cover"
                              />
                            ) : (
                              <span
                                key={`${message.id}-file-${fileIndex}`}
                                className="flex items-center gap-1.5 rounded-xl bg-background/40 px-2 py-1 text-[11px] font-bold"
                              >
                                <FileText className="size-3.5" />
                                {part.filename ?? "ملف"}
                              </span>
                            ),
                          )}
                        </div>
                      ) : null}
                      {image ? (
                        <GeneratedImage
                          url={image.url}
                          prompt={image.prompt}
                          busy={isBusy}
                          onRegenerate={() => renderImage({ englishPrompt: image.prompt })}
                        />
                      ) : message.role === "assistant" ? (
                        <MessageResponse>{text}</MessageResponse>
                      ) : text ? (
                        <p className="whitespace-pre-wrap leading-7">{text}</p>
                      ) : null}
                    </MessageContent>
                  </div>
                  {message.role === "assistant" && text && !image ? (
                    <MessageActions className="ms-9 justify-start">

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

          {showThinking ? (
            <div className="flex items-center gap-2.5 self-start rounded-2xl border border-border/60 bg-secondary/60 px-3 py-2">
              <BrandMark size={26} />
              <Shimmer className="text-[13px] font-extrabold">
                {generatingImage
                  ? "🎨 جاري رسم وتوليد صورتك..."
                  : status === "submitted"
                    ? "🔍 جاري البحث في الويب..."
                    : "✍️ جاري صياغة الإجابة..."}
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


          {error || stalled ? (
            <div className="mx-auto flex flex-col items-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-center">
              <p className="text-xs font-bold text-destructive">
                {stalled
                  ? "تأخّر الرد ولم يكتمل. تحقّق من اتصالك ثم أعد المحاولة."
                  : "حدث خطأ أثناء توليد الرد."}
              </p>
              <Button
                size="sm"
                variant="outline"
                disabled={isBusy}
                className="h-8 gap-1.5 rounded-full px-3 text-xs font-extrabold"
                onClick={() => {
                  setStalled(false);
                  void regenerate();
                }}
              >
                <RefreshCw className="size-3.5" />
                إعادة المحاولة
              </Button>
            </div>
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
            accept={FILE_ACCEPT}
            multiple
            maxFiles={4}
            className="[&>div]:!h-auto [&>div]:items-end [&>div]:rounded-3xl [&>div]:px-1.5 [&>div]:py-1"
          >
            <AttachmentPreviews />
            <div className="flex min-w-0 flex-1 basis-full items-end gap-1">
              <PromptInputSubmit
                status={status}
                onStop={stop}
                aria-label={isBusy ? "إيقاف الرد" : "إرسال"}
                className="order-last size-9 shrink-0 self-end rounded-full brand-gradient-bg text-primary-foreground"
              >
                {isBusy ? <Square className="size-3.5 fill-current" /> : <ArrowUp className="size-4" />}
              </PromptInputSubmit>
              <PromptInputTools className="shrink-0 gap-0.5 self-end">
                <PlusMenu />
                <PromptInputButton
                  type="button"
                  onClick={toggleVoice}
                  aria-label="الإدخال الصوتي"
                  variant={listening ? "default" : "ghost"}
                  className={cn("size-8 rounded-full", listening && "animate-pulse")}
                >
                  {listening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
                </PromptInputButton>
              </PromptInputTools>
              <PromptInputTextarea
                ref={textareaRef}
                placeholder="اكتب رسالتك إلى Salman AI..."
                dir="auto"
                autoCorrect="on"
                autoCapitalize="sentences"
                autoComplete="on"
                spellCheck
                className="max-h-[120px] min-h-9 w-full min-w-0 flex-1 resize-none overflow-y-auto py-2 text-[13px] leading-6"
                rows={1}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
                  event.preventDefault();
                  if (event.shiftKey) {
                    event.currentTarget.form?.requestSubmit();
                    return;
                  }
                  // Plain Enter inserts a newline instead of sending.
                  const textarea = event.currentTarget;
                  if (!document.execCommand("insertText", false, "\n")) {
                    const { selectionStart, selectionEnd, value } = textarea;
                    textarea.value = `${value.slice(0, selectionStart)}\n${value.slice(selectionEnd)}`;
                    textarea.setSelectionRange(selectionStart + 1, selectionStart + 1);
                    textarea.dispatchEvent(new Event("input", { bubbles: true }));
                  }
                }}
              />
            </div>
          </PromptInput>
          {listening ? (
            <p className="mt-1.5 text-center text-[11px] font-extrabold text-primary">
              🎙️ جاري الاستماع...
            </p>
          ) : null}

          <p className="mt-1.5 pb-2 text-center text-[10px] text-muted-foreground">
            قد يخطئ Salman AI — تحقّق من المعلومات المهمة.
          </p>
        </div>
      </div>

      {touchMenu ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setTouchMenu(null)} />
          <div
            className="fixed z-50 w-44 overflow-hidden rounded-2xl border border-border bg-popover shadow-soft"
            style={{
              top: Math.min(touchMenu.y, window.innerHeight - 120),
              left: Math.min(touchMenu.x, window.innerWidth - 190),
            }}
          >
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2.5 text-xs font-bold hover:bg-secondary"
              onClick={() => {
                void copyMessage(touchMenu.text);
                setTouchMenu(null);
              }}
            >
              <Copy className="size-4" />
              نسخ
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2.5 text-xs font-bold hover:bg-secondary"
              onClick={() => {
                editAndResend(touchMenu.id, touchMenu.text);
                setTouchMenu(null);
              }}
            >
              <Pencil className="size-4" />
              تعديل وإعادة الإرسال
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
