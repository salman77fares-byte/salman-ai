/** Salman Fares' other projects, surfaced in the settings modal. */
export type SalmanProject = {
  name: string;
  description: string;
  url: string;
  emoji: string;
};

export const SALMAN_PROJECTS: SalmanProject[] = [
  {
    emoji: "📖",
    name: "زاد الدعاة",
    description: "منصة محتوى دعوي ومكتبة موارد",
    url: "https://zad-alduat.lovable.app",
  },
  {
    emoji: "💎",
    name: "متجر كنز",
    description: "متجر إلكتروني للمنتجات المختارة",
    url: "https://kanzstore.lovable.app",
  },
  {
    emoji: "📱",
    name: "متجر سلمان فارس",
    description: "متجر تقني للأجهزة والملحقات",
    url: "https://salmanfares.lovable.app/",
  },
];
