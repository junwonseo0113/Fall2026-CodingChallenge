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
  audioData: string | null;
  audioDuration: number | null;
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
  unlockAt: string | null;
  isLocked: boolean;
  lockedByTime: boolean;
  lockedByLocation: boolean;
  hasGeoLock: boolean;
  unlockLat: number | null;
  unlockLng: number | null;
  unlockRadiusMeters: number | null;
  participation: { sealed: number; total: number };
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
}
