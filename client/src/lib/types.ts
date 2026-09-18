export interface User {
  id: string;
  name: string;
  email: string;
}

export interface CollectionItem {
  id: string;
  imageUrl: string;
  thumbUrl: string;
  sourceUrl?: string;
  title: string;
  note: string;
  credit: string;
  creditUrl: string;
  color?: string; // dominant-color swatch (hex), from Unsplash's own per-photo color field
  tags: string[];
  addedBy: User | null;
  createdAt: string;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  owner: User;
  collaborators: User[];
  isPublic: boolean;
  shareSlug: string;
  items: CollectionItem[];
  lastActivity?: { by: User | null; action: string; at: string };
  createdAt: string;
  updatedAt: string;
}

export interface SearchResult {
  id: string;
  title: string;
  imageUrl: string;
  thumbUrl: string;
  sourceUrl: string;
  credit: string;
  creditUrl?: string;
  downloadLocation?: string;
  color?: string;
}

export interface TodayVisual {
  summary: string; // e.g. "Rainy evening, 14°C" or just "Sunset" when weather is unavailable
  result: SearchResult | null;
}
