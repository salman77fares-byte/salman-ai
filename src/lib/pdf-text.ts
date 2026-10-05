// استخراج نص ملفات PDF داخل المتصفح (يُحمَّل عند الحاجة فقط)
export async function extractPdfText(file: File, maxChars = 60000): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const workerUrl = (await import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  let out = "";
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const line = content.items
      .map((it) => ("str" in it ? it.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    out += `\n--- صفحة ${p} ---\n${line}`;
    if (out.length > maxChars) {
      out = out.slice(0, maxChars) + "\n...[تم اقتطاع بقية المستند]";
      break;
    }
  }
  return out.trim();
}
