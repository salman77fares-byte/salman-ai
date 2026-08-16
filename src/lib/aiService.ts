async function compressImage(dataUrl: string, maxWidth = 800, quality = 0.7): Promise<string> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !dataUrl.startsWith("data:image")) return resolve(dataUrl);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      let width = img.width, height = img.height;
      if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth; }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (ctx) { ctx.drawImage(img, 0, 0, width, height); resolve(canvas.toDataURL("image/jpeg", quality)); }
      else resolve(dataUrl);
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export async function askSalmanAI(messages: any[]) {
  const groqApiKey = import.meta.env.VITE_GROQ_API_KEY;
  const tavilyApiKey = import.meta.env.VITE_TAVILY_API_KEY;

  if (!groqApiKey) return "خطأ: مفتاح Groq مفقود من إعدادات البيئة.";

  let hasImage = false;
  const formattedMessages = await Promise.all(
    messages.filter((m) => m.role === "user" || m.role === "assistant").map(async (m) => {
      let rawImgUrl = m.attachment?.base64 || m.image || m.imageBase64;
      if (rawImgUrl) {
        hasImage = true;
        const url = typeof rawImgUrl === 'string' && rawImgUrl.startsWith('data') ? rawImgUrl : `data:image/jpeg;base64,${rawImgUrl}`;
        const compressed = await compressImage(url);
        return { role: m.role, content: [{ type: "text", text: m.content || "اشرح الصورة" }, { type: "image_url", image_url: { url: compressed } }] };
      }
      return { role: m.role, content: typeof m.content === "string" ? m.content : JSON.stringify(m.content || "") };
    })
  );

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${groqApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: hasImage ? "llama-3.2-11b-vision-preview" : "llama-3.3-70b-versatile",
        messages: formattedMessages,
        temperature: 0.5,
        max_tokens: 2048,
      }),
    });

    if (response.status === 401) return "خطأ 401: المفتاح غير صالح. تأكد من تحديثه في إعدادات البيئة.";
    if (!response.ok) return `خطأ من Groq: ${response.status}`;
    const data = await response.json();
    return data.choices?.[0]?.message?.content || "لا يوجد رد";
  } catch (e) { return "تعذر الاتصال بـ Groq"; }
}
