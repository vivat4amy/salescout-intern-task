import type { Product } from "../src/types";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isNonNegativeNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;

/**
 * Проверяет, что тело запроса — массив корректных товаров.
 * Возвращает текст ошибки или null, если всё в порядке.
 */
export function validateProducts(body: unknown): string | null {
  if (!Array.isArray(body)) {
    return "Тело запроса должно быть массивом товаров";
  }

  for (const [i, item] of body.entries()) {
    const where = `products[${i}]`;
    if (!isRecord(item)) return `${where}: ожидался объект`;

    if (typeof item.sku !== "string") return `${where}.sku: ожидалась строка`;
    if (typeof item.name !== "string") return `${where}.name: ожидалась строка`;

    for (const field of ["myPrice", "minPrice", "maxPrice", "step"] as const) {
      if (!isNonNegativeNumber(item[field])) {
        return `${where}.${field}: ожидалось неотрицательное число`;
      }
    }
    if ((item.minPrice as number) > (item.maxPrice as number)) {
      return `${where}: minPrice не может быть больше maxPrice`;
    }

    if (!Array.isArray(item.competitors)) return `${where}.competitors: ожидался массив`;
    for (const [j, c] of item.competitors.entries()) {
      const cWhere = `${where}.competitors[${j}]`;
      if (!isRecord(c)) return `${cWhere}: ожидался объект`;
      if (!isNonNegativeNumber(c.price)) return `${cWhere}.price: ожидалось неотрицательное число`;
      if (typeof c.inStock !== "boolean") return `${cWhere}.inStock: ожидалось true/false`;
    }
  }
  return null;
}

/** Type guard: после успешной validateProducts тело можно считать Product[]. */
export function isProductList(body: unknown): body is Product[] {
  return validateProducts(body) === null;
}
