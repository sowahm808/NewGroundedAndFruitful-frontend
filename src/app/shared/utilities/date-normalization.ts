export interface FirestoreTimestamp {
  readonly _seconds: number;
  readonly _nanoseconds: number;
}

/** Converts supported API date representations without ever returning an invalid Date. */
export function normalizeDate(value: string | Date | FirestoreTimestamp | null | undefined): Date | null {
  let date: Date;
  if (value instanceof Date) {
    date = new Date(value.getTime());
  } else if (typeof value === 'string') {
    if (!value.trim()) return null;
    date = new Date(value);
  } else if (isFirestoreTimestamp(value)) {
    date = new Date(value._seconds * 1_000 + value._nanoseconds / 1_000_000);
  } else {
    return null;
  }
  return Number.isNaN(date.getTime()) ? null : date;
}

function isFirestoreTimestamp(value: unknown): value is FirestoreTimestamp {
  if (!value || typeof value !== 'object') return false;
  const timestamp = value as Partial<FirestoreTimestamp>;
  return (
    Number.isFinite(timestamp._seconds) &&
    Number.isFinite(timestamp._nanoseconds) &&
    timestamp._nanoseconds! >= 0 &&
    timestamp._nanoseconds! < 1_000_000_000
  );
}
