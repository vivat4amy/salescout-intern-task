import type { PriceResult, Product } from "../../src/types";

/** Отправляет товары на сервер и возвращает рассчитанные цены. */
export async function reprice(products: Product[]): Promise<PriceResult[]> {
  const res = await fetch("/reprice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(products),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Сервер ответил ошибкой ${res.status}`);
  }
  return (await res.json()) as PriceResult[];
}
