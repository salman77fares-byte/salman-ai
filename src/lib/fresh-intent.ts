/** يحدد ما إذا كان السؤال يحتاج معلومات حية محدثة من الويب. */

const FRESH_KEYWORDS = [
  // زمن
  "اليوم",
  "الآن",
  "حالياً",
  "حاليا",
  "هذا الأسبوع",
  "هذا الشهر",
  "هذه السنة",
  "أمس",
  "غداً",
  "مؤخراً",
  "آخر",
  "أحدث",
  "الأخيرة",
  "مستجدات",
  "تحديث",
  "جديد",
  // أخبار ورياضة وأسواق
  "أخبار",
  "خبر",
  "عاجل",
  "نتيجة",
  "نتائج",
  "مباراة",
  "مباريات",
  "الدوري",
  "ترتيب",
  "بطولة",
  "سعر",
  "أسعار",
  "الدولار",
  "الريال",
  "بيتكوين",
  "العملات",
  "الأسهم",
  "الطقس",
  "الانتخابات",
  "إصدار",
  "أطلقت",
  "صدر",
  "من هو رئيس",
  "من يفوز",
  // English
  "today",
  "now",
  "current",
  "currently",
  "latest",
  "recent",
  "news",
  "breaking",
  "score",
  "price",
  "stock",
  "weather",
  "release",
  "update",
  "who is the current",
  "this week",
  "this year",
];

export function needsFreshInfo(text: string): boolean {
  const q = (text ?? "").toLowerCase();
  if (!q.trim()) return false;
  if (FRESH_KEYWORDS.some((k) => q.includes(k.toLowerCase()))) return true;
  // ذكر سنة حديثة أو مستقبلية
  const year = /(20[2-9]\d)/.exec(q);
  if (year?.[1] && Number(year[1]) >= new Date().getFullYear() - 1) return true;
  return false;
}

/** يبني استعلام بحث نظيفاً من رسالة المستخدم. */
export function buildSearchQuery(text: string): string {
  return (text ?? "")
    .replace(/[\n\r]+/g, " ")
    .replace(/^(?:من فضلك|رجاءً|اخبرني|أخبرني|please|tell me)\s+/i, "")
    .trim()
    .slice(0, 300);
}
