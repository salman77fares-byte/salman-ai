import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, Send, Plus, Paperclip, X, Image as ImageIcon, Copy, Edit2, RotateCcw, Check, Square } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";

import { BrandMark } from "@/components/salman/BrandMark";
import { ModelSettingsDialog } from "@/components/salman/ModelSettingsDialog";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/useSession";
import { askSalmanAI } from "@/lib/aiService";
import { appendMessages, createConversation } from "@/lib/chat.functions";

export const Route = createFileRoute("/chat/")({
  component: ChatIndexScreen,
});

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

const QUICK_SUGGESTIONS = [
  "🚀 فكرة مشروع",
  "💻 كتابة كود",
  "⚽ أخبار الرياضة",
  "🎬 سيناريو فيديو",
  "💡 حل مشكلة تقنية",
];

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

function ChatIndexScreen() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { session, loading } = useSession();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [statusIndex, setStatusIndex] = useState(0);
  const [activeStatuses, setActiveStatuses] = useState<string[]>(CHAT_STATUSES);
  const [activeActionIndex, setActiveActionIndex] = useState<number | null>(null);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

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

  const handleNewChat = () => {
    setMessages([]);
    setInput("");
    setSelectedFile(null);
    setActiveActionIndex(null);
    setCurrentConversationId(null);
    stopGenerationRef.current = true;
    setIsSending(false);
    toast.success("تم بدء محادثة جديدة");
  };

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

  const handleRetry = (index: number) => {
    setActiveActionIndex(null);
    const historyToRetry = messages.slice(0, index + 1);
    const lastUserMessage = historyToRetry[historyToRetry.length - 1];
    if (lastUserMessage && lastUserMessage.role === "user") {
      executeSend(historyToRetry, lastUserMessage.content);
    }
  };

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
                { sender: "user", content: userQuery || "صورة/ملف مرفق" },
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

  if (loading) {
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
      
      {/* أزرار عائمة: محادثة جديدة + الإعدادات */}
      <div className="absolute left-4 top-4 z-10 flex items-center gap-2">
        <Button
          onClick={handleNewChat}
          variant="outline"
          size="sm"
          className="flex items-center gap-1.5 rounded-full border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
        >
          محادثة جديدة
          <Plus className="size-4 text-[#2dd4bf]" />
        </Button>
        <ModelSettingsDialog />
      </div>

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
                          <button
                            onClick={() => handleRetry(idx)}
                            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-200 hover:bg-slate-800"
                          >
                            <RotateCcw className="size-3.5" />
                            إعادة المحاولة
                          </button>
                        </>
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

      {/* الشريط السفلي للإدخال والاقتراحات */}
      <div className="shrink-0 space-y-2.5 border-t border-slate-800/80 bg-[#0b101b] p-3 w-full max-w-full">
        <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
          {QUICK_SUGGESTIONS.map((item, i) => (
            <button
              key={i}
              onClick={() => setInput(item.replace(/^[^\p{L}]+/u, ""))}
              className="shrink-0 rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              {item}
            </button>
          ))}
        </div>

        {selectedFile && (
          <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs">
            <div className="flex items-center gap-2 truncate">
              {selectedFile.type.startsWith("image/") ? (
                <ImageIcon className="size-4 shrink-0 text-[#2dd4bf]" />
              ) : (
                <Paperclip className="size-4 shrink-0 text-[#2dd4bf]" />
              )}
              <span className="max-w-[200px] truncate font-bold text-white">{selectedFile.name}</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-6 rounded-full text-slate-400 hover:text-white"
              onClick={() => setSelectedFile(null)}
            >
              <X className="size-3.5" />
            </Button>
          </div>
        )}

        <div className="flex items-center gap-2 w-full">
          <div className="relative flex flex-1 items-center rounded-2xl border border-slate-800 bg-slate-900/90 transition focus-within:border-[#2dd4bf]">
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
              className="absolute right-2 rounded-xl p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
              title="إرفاق صورة أو ملف"
            >
              <Plus className="size-5" />
            </button>

            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="اكتب رسالتك لـ Salman AI..."
              rows={1}
              dir="auto"
              autoComplete="on"
              autoCorrect="on"
              autoCapitalize="sentences"
              spellCheck={true}
              className="max-h-32 min-h-[44px] w-full resize-none bg-transparent py-3 pl-4 pr-11 text-right text-xs text-white placeholder:text-slate-500 focus:outline-none"
            />
          </div>

          {isSending ? (
            <Button
              type="button"
              onClick={handleStop}
              size="icon"
              className="h-11 w-11 shrink-0 rounded-2xl border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-all"
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
              className="h-11 w-11 shrink-0 rounded-2xl bg-[#2dd4bf] text-slate-950 hover:bg-[#26b8a5] transition-all"
            >
              <Send className="-rotate-90 size-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChatIndexScreen;
