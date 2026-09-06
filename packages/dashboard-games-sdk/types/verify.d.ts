export type VerificationIssue = Readonly<{
  code: string;
  path: string;
  message: string;
}>;

export type VerificationResult = Readonly<{
  ok: boolean;
  root: string;
  manifest: Record<string, unknown> | null;
  errors: readonly VerificationIssue[];
  warnings: readonly VerificationIssue[];
}>;

export declare class VerificationError extends Error {
  readonly result: VerificationResult;
}

export declare function verifyGameRepository(root?: string): Promise<VerificationResult>;
export declare function assertGameRepository(root?: string): Promise<VerificationResult>;
export declare function formatVerificationResult(result: VerificationResult): string;
