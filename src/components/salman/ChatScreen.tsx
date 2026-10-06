import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, Send, Plus, Paperclip, X, Copy, Edit2, RotateCcw, Check, Square, Mic, MicOff } from "lucide-react";
import { extractPdfText } from "@/lib/pdf-text";
import { useEffect, useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";

import { BrandMark } from "@/components/salman/BrandMark";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/useSession";
import { askSalmanAI } from "@/lib/chat-client";
import { appendMessages, createConversation, getConversationMessages, type StoredMessage } from "@/lib/chat.functions";


interface Message {
  role: "user" | "assistant";
  content: string;
  attachment?: {
    name: string;
    type: string;
    url: string;
    base64?: string;
    textContent?: string;
  };
}


const SEARCH_STATUSES = [
  "جاري البحث في المصادر المحدثة...",
  "جاري تحليل البيانات...",
  "جاري صياغة الإجابة..."
];

const CHAT_STATUSES = [
  "Salman يكتب الآن...",
  "جاري التفكير في الرد...",
  "جاري تجهيز الإجابة..."
];

// مكون مخصص لصناديق الأكواد البرمجية
const CodeBlock = ({ children }: { children: React.ReactNode }) => {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLPreElement>(null);

  const handleCopyCode = () => {
    if (codeRef.current) {
      const text = codeRef.current.innerText || codeRef.current.textContent || "";
      navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("تم نسخ الكود");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="group/code relative my-3 w-full max-w-full min-w-0 overflow-hidden rounded-xl border border-slate-700/80 bg-slate-950 text-slate-100 shadow-md [direction:ltr] [text-align:left]">
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-3 py-1.5 text-xs text-slate-400 select-none">
        <span className="font-mono text-[11px] font-semibold text-slate-300 uppercase">Code</span>
        <button
          type="button"
          onClick={handleCopyCode}
          className="flex items-center gap-1 rounded bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
        >
          {copied ? (
            <>
              <Check className="size-3 text-emerald-400" />
              <span className="text-emerald-400">تم النسخ</span>
            </>
          ) : (
            <>
              <Copy className="size-3" />
              <span>نسخ</span>
            </>
          )}
        </button>
      </div>
      <pre
        ref={codeRef}
        className="w-full max-w-full overflow-x-auto p-3 font-mono text-xs leading-relaxed text-slate-100 whitespace-pre-wrap break-words [overflow-wrap:anywhere]"
      >
        {children}
      </pre>
    </div>
  );
};

export function ChatScreen({ conversationId }: { conversationId?: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { session, loading } = useSession();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [statusIndex, setStatusIndex] = useState(0);
  const [activeStatuses, setActiveStatuses] = useState<string[]>(CHAT_STATUSES);
  const [activeActionIndex, setActiveActionIndex] = useState<number | null>(null);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(conversationId ?? null);
  const fetchMessages = useServerFn(getConversationMessages);
  const { data: storedMessages, isPending: messagesPending } = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () => fetchMessages({ data: { conversationId: conversationId! } }),
    enabled: Boolean(session && conversationId),
    staleTime: 1000 * 60 * 15,
  });
  useEffect(() => {
    if (storedMessages) {
      setMessages(
        storedMessages.map((msg: StoredMessage) => ({
          role: msg.sender === "user" ? "user" : "assistant",
          content: msg.content,
        })),
      );
    }
  }, [storedMessages]);

  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    type: string;
    url: string;
    base64: string;
    textContent?: string;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const stopGenerationRef = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages.length]);

  useEffect(() => {
    if (!isSending) {
      setStatusIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % activeStatuses.length);
    }, 1500);

    return () => clearInterval(interval);
  }, [isSending, activeStatuses]);

  // زر "محادثة جديدة" العائم في الشريط العلوي يُطلق هذا الحدث
  useEffect(() => {
    const reset = () => {
      setMessages([]);
      setInput("");
      setSelectedFile(null);
      setActiveActionIndex(null);
      setCurrentConversationId(null);
      stopGenerationRef.current = true;
      setIsSending(false);
    };
    window.addEventListener("salman-new-chat", reset);
    return () => window.removeEventListener("salman-new-chat", reset);
  }, []);

  const handleTouchStart = (index: number) => {
    pressTimerRef.current = setTimeout(() => {
      setActiveActionIndex(index);
    }, 600);
  };

  const handleTouchEnd = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("تم نسخ النص إلى الحافظة");
    setActiveActionIndex(null);
  };

  const handleEdit = (text: string) => {
    setInput(text);
    setActiveActionIndex(null);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // إعادة المحاولة متاحة لآخر رسالة فقط: يُحذف الرد الأخير ويُولَّد رد جديد بدل تكراره
  const lastUserIdx = (() => {
    for (let i = messages.length - 1; i >= 0; i--) if (messages[i]?.role === "user") return i;
    return -1;
  })();

  const handleRetry = (index: number) => {
    setActiveActionIndex(null);
    if (index !== lastUserIdx || isSending) return;
    const historyToRetry = messages.slice(0, index + 1);
    const lastUserMessage = historyToRetry[historyToRetry.length - 1];
    if (lastUserMessage && lastUserMessage.role === "user") {
      executeSend(historyToRetry, lastUserMessage.content);
    }
  };

  // نافذة التسجيل الصوتي: يستمر التسجيل حتى يضغط المستخدم ✓ أو ✗ أو إرسال
  const [listening, setListening] = useState(false);
  const [voiceText, setVoiceText] = useState("");
  const [voiceSeconds, setVoiceSeconds] = useState(0);
  const recognitionRef = useRef<{ stop: () => void; abort?: () => void } | null>(null);
  const keepListeningRef = useRef(false);
  const finalTextRef = useRef("");
  const committedRef = useRef(""); // نص الجلسات السابقة (بعد إعادة التشغيل التلقائي)
  const barsRef = useRef<Array<HTMLSpanElement | null>>([]);
  const audioCleanupRef = useRef<(() => void) | null>(null);

  // موجة صوتية حيّة من الميكروفون عبر Web Audio API
  const startWaveform = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      let raf = 0;
      const tick = () => {
        analyser.getByteFrequencyData(data);
        barsRef.current.forEach((bar, i) => {
          if (!bar) return;
          const v = data[(i + 1) % data.length] ?? 0;
          bar.style.height = `${Math.max(12, Math.min(100, (v / 255) * 130))}%`;
        });
        raf = requestAnimationFrame(tick);
      };
      tick();
      audioCleanupRef.current = () => {
        cancelAnimationFrame(raf);
        stream.getTracks().forEach((t) => t.stop());
        void ctx.close();
      };
    } catch {
      /* الموجة اختيارية؛ التعرف على الكلام يستمر */
    }
  };
  const stopWaveform = () => {
    audioCleanupRef.current?.();
    audioCleanupRef.current = null;
  };

  useEffect(() => {
    if (!listening) return;
    setVoiceSeconds(0);
    const t = setInterval(() => setVoiceSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [listening]);

  useEffect(() => () => {
    keepListeningRef.current = false;
    recognitionRef.current?.stop();
    audioCleanupRef.current?.();
  }, []);

  const startMic = () => {
    const w = window as unknown as Record<string, unknown>;
    const SR = (w["SpeechRecognition"] || w["webkitSpeechRecognition"]) as
      | (new () => {
          lang: string;
          interimResults: boolean;
          continuous: boolean;
          onresult: (e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void;
          onend: () => void;
          onerror: (e: { error?: string }) => void;
          start: () => void;
          stop: () => void;
        })
      | undefined;
    if (!SR) {
      toast.error("المتصفح لا يدعم الإملاء الصوتي");
      return;
    }
    finalTextRef.current = "";
    committedRef.current = "";
    setVoiceText("");
    keepListeningRef.current = true;

    const launch = () => {
      const rec = new SR();
      rec.lang = "ar-SA";
      rec.interimResults = true;
      rec.continuous = true;
      // نعيد بناء نص الجلسة كاملاً من جميع النتائج في كل مرة (بدل الإلحاق) لمنع التكرار،
      // مع دمج المقاطع التراكمية التي يرسلها Android (كل مقطع يحتوي سابقه)
      rec.onresult = (e) => {
        const finals: string[] = [];
        let interim = "";
        for (let i = 0; i < e.results.length; i++) {
          const r = e.results[i];
          if (!r) continue;
          const t = r[0].transcript.trim();
          if (!t) continue;
          if (r.isFinal) {
            const last = finals[finals.length - 1];
            if (last && t.startsWith(last)) finals[finals.length - 1] = t;
            else if (!last || !last.endsWith(t)) finals.push(t);
          } else {
            interim = t;
          }
        }
        let session = finals.join(" ");
        if (interim && !session.endsWith(interim)) {
          session = interim.startsWith(session) ? interim : `${session} ${interim}`;
        }
        finalTextRef.current = [committedRef.current, finals.join(" ")].filter(Boolean).join(" ");
        setVoiceText([committedRef.current, session.trim()].filter(Boolean).join(" "));
      };
      rec.onerror = (e) => {
        if (e?.error === "not-allowed" || e?.error === "service-not-allowed") {
          keepListeningRef.current = false;
          setListening(false);
          toast.error("يرجى السماح بالوصول إلى الميكروفون");
        }
      };
      // بعض المتصفحات توقف التعرف عند الصمت؛ نعيد التشغيل تلقائياً ما دامت النافذة مفتوحة
      rec.onend = () => {
        if (keepListeningRef.current) {
          committedRef.current = finalTextRef.current;
          try { launch(); } catch { /* تجاهل */ }
        }
      };
      recognitionRef.current = rec;
      rec.start();
    };
    try {
      launch();
      setListening(true);
      void startWaveform();
    } catch {
      toast.error("تعذّر تشغيل الميكروفون");
    }
  };

  const finishMic = (mode: "cancel" | "accept" | "send") => {
    keepListeningRef.current = false;
    recognitionRef.current?.stop();
    stopWaveform();
    setListening(false);
    const text = (voiceText || finalTextRef.current).trim();
    setVoiceText("");
    if (mode === "cancel" || !text) return;
    const merged = (input ? input.trimEnd() + " " : "") + text;
    setInput(merged);
    if (mode === "send") {
      if (textareaRef.current) textareaRef.current.value = merged;
      setTimeout(() => void handleSend(), 30);
    } else {
      setTimeout(() => textareaRef.current?.focus(), 30);
    }
  };

  const toggleMic = () => (listening ? finishMic("accept") : startMic());

  const handleStop = () => {
    stopGenerationRef.current = true;
    setIsSending(false);
  };

  const executeSend = async (chatHistory: Message[], userQuery: string) => {
    const isSearchQuery = /بحث|أخبار|أحدث|ابحث|معلومات|مصادر/i.test(userQuery);
    setActiveStatuses(isSearchQuery ? SEARCH_STATUSES : CHAT_STATUSES);

    stopGenerationRef.current = false;
    setIsSending(true);
    setMessages([...chatHistory, { role: "assistant", content: "" }]);

    let convId = currentConversationId;
    const isRegistered = !!session?.user;

    // إنشـاء معرف محادثة جديدة في القاعدة للمستخدم المسجّل
    if (isRegistered && !convId) {
      try {
        const newConv = await createConversation();
        if (newConv?.id) {
          convId = newConv.id;
          setCurrentConversationId(convId);
        }
      } catch (err) {
        console.error("خطأ في إنشاء المحادثة:", err);
      }
    }

    try {
      const formattedHistory = chatHistory.map((m) => {
        let finalContent = m.content;
        
        if (m.attachment?.textContent) {
          finalContent = `${m.content ? m.content + "\n\n" : ""}[محتوى الملف المرفق: ${m.attachment.name}]\n\`\`\`\n${m.attachment.textContent}\n\`\`\``;
        }

        if (m.attachment?.base64 && (m.attachment.type.startsWith("image/") || m.attachment.base64.startsWith("data:image/"))) {
          const rawBase64 = m.attachment.base64.includes(",") 
            ? m.attachment.base64.split(",")[1] 
            : m.attachment.base64;
          const mimeType = m.attachment.type || "image/jpeg";
          const promptText = finalContent.trim() || "حلل هذه الصورة واشرح محتواها بالتفصيل وأجب عن أي سؤال حولها.";

          return {
            role: m.role,
            content: [
              { type: "text", text: promptText },
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${rawBase64}` } }
            ],
            image: `data:${mimeType};base64,${rawBase64}`,
            imageBase64: rawBase64,
            imageMimeType: mimeType
          };
        }

        return { role: m.role, content: finalContent };
      });

      const fullResponse = await askSalmanAI(formattedHistory);

      if (stopGenerationRef.current) return;

      const cleanedResponse = fullResponse
        .replace(/<think>[\s\S]*?(?:<\/think>|$)/gi, "")
        .trim();

      let currentText = "";
      const words = cleanedResponse.split(" ");
      
      for (let i = 0; i < words.length; i++) {
        if (stopGenerationRef.current) break;

        currentText += (i === 0 ? "" : " ") + words[i];
        const textToUpdate = currentText;
        setMessages((prev) => {
          const newMsgs = [...prev];
          newMsgs[newMsgs.length - 1] = { role: "assistant", content: textToUpdate };
          return newMsgs;
        });
        await new Promise((resolve) => setTimeout(resolve, 8));
      }

      // حفظ الرسالتين (المستخدم + المساعد) في قاعدة البيانات عند اكتمال الرد
      if (isRegistered && convId && cleanedResponse) {
        try {
          await appendMessages({
            data: {
              conversationId: convId,
              messages: [
                { sender: "user", content: (() => {
                  const att = chatHistory[chatHistory.length - 1]?.attachment;
                  return att?.textContent
                    ? `${userQuery ? userQuery + "\n\n" : ""}[محتوى الملف المرفق: ${att.name}]\n\`\`\`\n${att.textContent}\n\`\`\``
                    : userQuery || "صورة/ملف مرفق";
                })() },
                { sender: "assistant", content: cleanedResponse },
              ],
              title: userQuery.slice(0, 40) || "محادثة جديدة",
            },
          });
          queryClient.invalidateQueries();
        } catch (saveErr) {
          console.error("خطأ أثناء حفظ المحادثة:", saveErr);
        }
      }

    } catch (error) {
      if (!stopGenerationRef.current) {
        console.error(error);
        toast.error("تعذّر جلب الرد حالياً.");
        setMessages((prev) => {
          const newMsgs = [...prev];
          newMsgs[newMsgs.length - 1] = { role: "assistant", content: "عذراً، حدث خطأ أثناء معالجة الصورة أو الطلب." };
          return newMsgs;
        });
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (textareaRef.current) {
      textareaRef.current.blur();
    }

    setTimeout(async () => {
      const rawText = textareaRef.current?.value || input;
      const userText = rawText.trim();

      if ((!userText && !selectedFile) || isSending) return;

      const currentAttachment = selectedFile;
      const userMessage: Message = {
        role: "user",
        content: userText,
        ...(currentAttachment ? { attachment: { ...currentAttachment } } : {}),
      };

      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      setInput("");
      setSelectedFile(null);

      await executeSend(updatedMessages, userText);
    }, 80);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      toast.error("حجم الملف يجب ألا يتجاوز 8 ميجابايت");
      return;
    }

    if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
      const toastId = toast.loading("جارٍ قراءة ملف PDF...");
      extractPdfText(file)
        .then((text) => {
          toast.dismiss(toastId);
          if (!text.replace(/--- صفحة \d+ ---/g, "").trim()) {
            toast.error("هذا الملف لا يحتوي نصاً قابلاً للقراءة (ربما صور ممسوحة ضوئياً)");
            return;
          }
          setSelectedFile({
            name: file.name,
            type: "application/pdf",
            url: URL.createObjectURL(file),
            base64: "",
            textContent: text,
          });
        })
        .catch((err) => {
          console.error(err);
          toast.dismiss(toastId);
          toast.error("تعذّرت قراءة ملف PDF");
        });
      return;
    }

    const isTextFile =
      file.type.startsWith("text/") ||
      /\.(txt|json|js|ts|tsx|jsx|py|md|html|css|csv|xml|json)$/i.test(file.name);

    if (isTextFile) {
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedFile({
          name: file.name,
          type: file.type || "text/plain",
          url: URL.createObjectURL(file),
          base64: "",
          textContent: reader.result as string,
        });
      };
      reader.readAsText(file);
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedFile({
          name: file.name,
          type: file.type || "image/jpeg",
          url: URL.createObjectURL(file),
          base64: reader.result as string,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading || (conversationId && session && messagesPending)) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-[#0b101b] px-6 text-center text-slate-100">
        <BrandMark size={64} className="shadow-glow" />
        <h1 className="text-xl font-extrabold">
          مرحباً بك، أنا <span className="brand-gradient-text">Salman AI</span>
        </h1>
        <p className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="size-4 animate-spin" />
          جارٍ التجهيز...
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full max-w-full overflow-x-hidden flex-col justify-between bg-[#0b101b] text-slate-100" dir="rtl">
      

      {/* منطقة المحتوى والرسائل */}
      <div className="flex flex-1 flex-col justify-start space-y-5 overflow-y-auto overflow-x-hidden px-3 py-4 w-full max-w-full">
        
        {messages.length === 0 && (
          <div className="my-auto flex flex-col items-center justify-center space-y-3 py-6 text-center">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3 shadow-xl">
              <BrandMark size={64} />
            </div>
            <h2 className="text-xl font-black tracking-tight text-white">مرحباً بك مع Salman AI</h2>
            <p className="max-w-xs text-xs leading-relaxed text-slate-400">
              مرحباً بك! أنا جاهز لمساعدتك في أي وقت...
            </p>
          </div>
        )}

        {messages.length > 0 && (
          <div className="w-full max-w-full space-y-5 pt-10">
            {messages.map((msg, idx) => {
              if (msg.role === "assistant" && !msg.content.trim()) return null;

              const isUser = msg.role === "user";

              return (
                <div
                  key={idx}
                  className={`flex w-full max-w-full flex-col ${
                    isUser ? "items-end" : "items-start"
                  }`}
                >
                  {!isUser && (
                    <div className="mb-1.5 flex items-center gap-2 pr-1">
                      <BrandMark size={26} />
                      <span className="text-xs font-extrabold text-slate-200">Salman AI</span>
                    </div>
                  )}

                  <div
                    onTouchStart={() => handleTouchStart(idx)}
                    onTouchEnd={handleTouchEnd}
                    onMouseDown={() => handleTouchStart(idx)}
                    onMouseUp={handleTouchEnd}
                    className={`relative cursor-pointer select-none break-words whitespace-pre-wrap px-4 py-3 text-right text-sm leading-relaxed shadow-sm ${
                      isUser
                        ? "max-w-[85%] rounded-2xl rounded-bl-none bg-[#2dd4bf] font-medium text-slate-950"
                        : "w-full max-w-full rounded-2xl rounded-tr-none border border-slate-700/60 bg-slate-800/90 text-slate-100"
                    }`}
                  >
                    {msg.attachment && (
                      <div className="mb-2 flex items-center gap-2 rounded-xl bg-black/10 p-2 text-xs max-w-full overflow-hidden">
                        {msg.attachment.type.startsWith("image/") ? (
                          <img
                            src={msg.attachment.url}
                            alt="attachment"
                            className="h-24 w-auto rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex items-center gap-1.5 font-bold truncate">
                            <Paperclip className="size-4 shrink-0" />
                            <span className="max-w-[180px] truncate">{msg.attachment.name}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {!isUser ? (
                      <div className="prose prose-invert prose-sm max-w-full min-w-0 space-y-3 leading-relaxed break-words [overflow-wrap:anywhere]">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            pre({ children }) {
                              return <CodeBlock>{children}</CodeBlock>;
                            },
                            code({ node, inline, className, children, ...props }: any) {
                              if (inline) {
                                return (
                                  <code className="rounded bg-slate-900/80 px-1.5 py-0.5 font-mono text-xs text-[#2dd4bf] break-words" {...props}>
                                    {children}
                                  </code>
                                );
                              }
                              return <code className="font-mono text-xs" {...props}>{children}</code>;
                            }
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      msg.content
                    )}
                  </div>

                  {activeActionIndex === idx && (
                    <div className="animate-in fade-in z-10 mt-1.5 flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-900 p-1 shadow-lg">
                      <button
                        onClick={() => handleCopy(msg.content)}
                        className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-200 hover:bg-slate-800"
                      >
                        <Copy className="size-3.5" />
                        نسخ
                      </button>
                      {isUser && (
                        <>
                          <button
                            onClick={() => handleEdit(msg.content)}
                            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-200 hover:bg-slate-800"
                          >
                            <Edit2 className="size-3.5" />
                            تعديل
                          </button>
                        </>
                      )}
                      {idx >= lastUserIdx && !isSending && lastUserIdx >= 0 && (
                        <button
                          onClick={() => handleRetry(lastUserIdx)}
                          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-200 hover:bg-slate-800"
                        >
                          <RotateCcw className="size-3.5" />
                          إعادة المحاولة
                        </button>
                      )}
                      <button
                        onClick={() => setActiveActionIndex(null)}
                        className="px-1 text-slate-500 hover:text-slate-300"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {isSending && messages[messages.length - 1]?.content === "" && (
          <div className="flex w-full flex-col items-start gap-1.5">
            <div className="flex items-center gap-2 pr-1">
              <BrandMark size={26} />
              <span className="text-xs font-extrabold text-slate-200">Salman AI</span>
            </div>
            <div className="w-fit max-w-[96%] animate-pulse rounded-2xl rounded-tr-none border border-slate-700/60 bg-slate-800/90 px-4 py-3 text-right text-sm font-medium text-[#2dd4bf]">
              {activeStatuses[statusIndex]}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* مربع الإرسال العائم */}
      <div className="shrink-0 w-full max-w-full px-3 pb-4 pt-2">
        <div className="mx-auto w-full max-w-3xl rounded-3xl border border-slate-700/50 bg-slate-900/70 p-2 shadow-[0_8px_30px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          {selectedFile && (
            <div className="mb-2 flex flex-wrap gap-2 px-1">
              <div className="relative">
                {selectedFile.type.startsWith("image/") ? (
                  <img
                    src={selectedFile.url}
                    alt={selectedFile.name}
                    className="size-16 rounded-2xl border border-slate-700 object-cover"
                  />
                ) : (
                  <div className="flex size-16 flex-col items-center justify-center gap-1 rounded-2xl border border-slate-700 bg-slate-800/80 px-1">
                    <Paperclip className="size-4 text-[#2dd4bf]" />
                    <span className="w-full truncate text-center text-[9px] text-slate-300">
                      {selectedFile.name}
                    </span>
                  </div>
                )}
                <button
                  type="button"
                  aria-label="حذف المرفق"
                  onClick={() => setSelectedFile(null)}
                  className="absolute -left-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full border border-slate-700 bg-slate-950 text-slate-300 shadow hover:text-white"
                >
                  <X className="size-3" />
                </button>
              </div>
            </div>
          )}

          {listening && (
            <div className="flex items-center gap-2 w-full px-1 py-1" role="dialog" aria-label="تسجيل صوتي">
              <button
                type="button"
                onClick={() => finishMic("cancel")}
                aria-label="إلغاء التسجيل"
                className="flex size-10 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-slate-300 hover:text-white"
              >
                <X className="size-4" />
              </button>
              <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <div className="flex h-6 items-end gap-0.5" aria-hidden>
                  {Array.from({ length: 18 }).map((_, i) => (
                    <span
                      key={i}
                      ref={(el) => { barsRef.current[i] = el; }}
                      className="w-1 rounded-full bg-[#2dd4bf] transition-[height] duration-75"
                      style={{ height: "12%" }}
                    />
                  ))}
                </div>
                <p dir="auto" className="w-full truncate text-center text-xs text-slate-300">
                  {voiceText || "جاري الاستماع..."} <span className="text-slate-500">· {Math.floor(voiceSeconds / 60)}:{String(voiceSeconds % 60).padStart(2, "0")}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => finishMic("accept")}
                aria-label="اعتماد النص"
                className="flex size-10 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-[#2dd4bf] hover:bg-slate-700"
              >
                <Check className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => finishMic("send")}
                aria-label="إرسال الصوت"
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#2dd4bf] text-slate-950 hover:bg-[#26b8a5]"
              >
                <Send className="-rotate-90 size-4" />
              </button>
            </div>
          )}

          <div className={`flex items-end gap-2 w-full ${listening ? "hidden" : ""}`}>
            <div className="relative flex flex-1 items-center">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.txt,.json,.js,.ts,.tsx,.py,.md,.csv"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute right-1 rounded-full p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
                title="إرفاق صورة أو ملف"
              >
                <Plus className="size-5" />
              </button>

              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={listening ? "جاري الاستماع..." : "اكتب رسالتك لـ Salman AI..."}
                rows={1}
                dir="auto"
                autoComplete="on"
                autoCorrect="on"
                autoCapitalize="sentences"
                spellCheck={true}
                className="max-h-32 min-h-[44px] w-full resize-none bg-transparent py-3 pl-11 pr-11 text-right text-xs text-white placeholder:text-slate-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={toggleMic}
                aria-label={listening ? "إيقاف الإملاء الصوتي" : "الإملاء الصوتي"}
                title={listening ? "إيقاف الإملاء الصوتي" : "الإملاء الصوتي"}
                className={`absolute left-1 rounded-full p-2 transition hover:bg-slate-800 ${listening ? "animate-pulse text-red-400" : "text-slate-400 hover:text-white"}`}
              >
                {listening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
              </button>
            </div>

            {isSending ? (
              <Button
                type="button"
                onClick={handleStop}
                size="icon"
                className="size-10 shrink-0 rounded-full border border-slate-700 bg-slate-800 text-slate-300 transition-all hover:bg-slate-700 hover:text-white"
                title="إيقاف الرد"
              >
                <Square className="size-4 fill-current" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => handleSend()}
                disabled={!input.trim() && !selectedFile}
                size="icon"
                className="size-10 shrink-0 rounded-full bg-[#2dd4bf] text-slate-950 transition-all hover:bg-[#26b8a5]"
              >
                <Send className="-rotate-90 size-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

