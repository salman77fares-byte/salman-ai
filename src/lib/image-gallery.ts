import { IMAGE_MODELS, type ImageModelId } from "./pollinations";

export type GalleryItem = { id: number; url: string; prompt: string; model: ImageModelId; createdAt: number };

const KEY = "salman-image-gallery";
const MAX = 200;

export function loadGallery(): GalleryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(raw) ? (raw as GalleryItem[]) : [];
  } catch {
    return [];
  }
}

function save(items: GalleryItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items.slice(0, MAX)));
  } catch {
    /* storage full */
  }
}

export function addToGallery(item: GalleryItem) {
  save([item, ...loadGallery().filter((x) => x.id !== item.id)]);
}

export function removeFromGallery(id: number): GalleryItem[] {
  const next = loadGallery().filter((x) => x.id !== id);
  save(next);
  return next;
}

export function modelLabel(id: ImageModelId): string {
  return IMAGE_MODELS.find((m) => m.id === id)?.label.split(" — ")[0] ?? id;
}
