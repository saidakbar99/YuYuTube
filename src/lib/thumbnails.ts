/** 1280x720, true 16:9 — not generated for every upload. */
export const maxResThumbnail = (id: string) => `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;

/** 480x360, always present, 4:3 with letterbox bars that object-cover crops away. */
export const fallbackThumbnail = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
