export type FragmentCredentials = Readonly<{ launchCode: string | null; inviteToken: string | null }>;
export type PlatformDescriptor = Readonly<{
  mode: "standalone" | "mock" | "dashboard";
  requiresDashboardSession: boolean;
  guestSessionsSupported: boolean;
  dashboardLaunchUrl: string | null;
}>;
export type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};
export type FragmentLocationLike = { hash: string; pathname: string; search: string };
export type FragmentHistoryLike = {
  replaceState(data: unknown, unused: string, url?: string | null): void;
};

export declare class FragmentCredentialError extends Error {}
export declare class InviteHandoffError extends Error {}
export declare function consumeFragmentCredentials(input: {
  location: FragmentLocationLike;
  history: FragmentHistoryLike;
}): FragmentCredentials;
export declare function parsePlatformDescriptor(payload: unknown): PlatformDescriptor;
export declare function createDashboardResumeUrl(
  platform: PlatformDescriptor,
  input: { gameId: string; code: string }
): string;
export declare function storeInviteHandoff(input: {
  storage?: StorageLike;
  gameId: string;
  code: string;
  inviteToken: string;
  now?: number;
  ttlMs?: number;
}): Readonly<{ code: string; expiresAt: number }>;
export declare function takeInviteHandoff(input: {
  storage?: StorageLike;
  gameId: string;
  code: string;
  now?: number;
}): Readonly<{
  gameId: string;
  code: string;
  inviteToken: string;
  createdAt: number;
  expiresAt: number;
}> | null;
