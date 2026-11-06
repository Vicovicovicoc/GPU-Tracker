export interface PreviousPriceSnapshot {
  price: number;
  in_stock: boolean;
  recorded_at: string;
}

/**
 * Keep one unchanged snapshot per refresh cycle, while recording price or stock changes immediately.
 * The 20-hour window absorbs retries without suppressing the next daily Paris refresh.
 */
export function shouldRecordPriceHistory(
  previous: PreviousPriceSnapshot | null,
  next: { price: number; in_stock: boolean },
  now: Date = new Date(),
): boolean {
  if (!previous) return true;
  if (Number(previous.price) !== next.price || previous.in_stock !== next.in_stock) return true;

  const previousTime = new Date(previous.recorded_at).getTime();
  if (!Number.isFinite(previousTime)) return true;
  return now.getTime() - previousTime >= 20 * 60 * 60 * 1000;
}
