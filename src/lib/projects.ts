/** Salman Fares' other projects, surfaced in the sidebar and settings. */
export type SalmanProject = {
  name: string;
  description: string;
  url?: string;
};

export const SALMAN_PROJECTS: SalmanProject[] = [
  { name: "زاد الدعاة", description: "منصة محتوى دعوي ومكتبة موارد" },
  { name: "متجر كنز", description: "متجر إلكتروني للمنتجات المختارة" },
  { name: "متجر سلمان تك", description: "متجر تقني للأجهزة والملحقات" },
];
