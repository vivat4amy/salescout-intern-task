import type { Product, PriceResult } from "./types";

/**
 * Убирает «плавающий хвост» после вычитания дробных чисел.
 * Например, 100.3 - 0.3 в JS даёт 99.99999999999999, а должно быть 100,
 * иначе Math.floor ошибочно вернёт 99.
 */
function cleanFloat(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

/**
 * Чистая функция: рассчитывает новую цену для одного товара.
 * Правила — см. README, раздел «Правила расчёта цены».
 * Не меняйте сигнатуру и путь к файлу: решение проверяется автотестами.
 */
export function calculatePrice(product: Product): PriceResult {
  const { sku, myPrice, minPrice, maxPrice, step, competitors } = product;

  // 1. Учитываем только конкурентов, у которых товар есть в наличии.
  const inStockPrices = competitors
    .filter((competitor) => competitor.inStock)
    .map((competitor) => competitor.price);

  // 2. Никого нет — ставим максимальную цену.
  if (inStockPrices.length === 0) {
    return { sku, oldPrice: myPrice, newPrice: maxPrice, reason: "NO_COMPETITORS" };
  }

  // 3. Самая низкая цена среди конкурентов в наличии.
  const best = Math.min(...inStockPrices);

  // 4. Становимся дешевле на step и округляем ВНИЗ до целого тенге.
  const candidate = Math.floor(cleanFloat(best - step));

  // 5. Не выходим за границы [minPrice, maxPrice].
  if (candidate < minPrice) {
    return { sku, oldPrice: myPrice, newPrice: minPrice, reason: "AT_MIN" };
  }
  if (candidate > maxPrice) {
    return { sku, oldPrice: myPrice, newPrice: maxPrice, reason: "AT_MAX" };
  }
  return { sku, oldPrice: myPrice, newPrice: candidate, reason: "UNDERCUT" };
}
