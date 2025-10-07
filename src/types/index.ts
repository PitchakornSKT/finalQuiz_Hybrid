export type User = { id: string; name: string; year: string; avatarUrl?: string };
export type Comment = { id: string; author: string; authorId?: string; text: string; createdAt?: string };
export type Post = { id: string; author: string; authorId?: string; text: string; likes: number; liked?: boolean; comments: Comment[]; createdAt?: string };