export class IniTifyError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'IniTifyError';
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof IniTifyError) return error.message;
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred.';
}
