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
}
