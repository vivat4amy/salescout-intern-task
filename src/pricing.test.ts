import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { calculatePrice } from "./pricing";
import type { Product, PriceResult } from "./types";

/** Собирает товар с разумными значениями по умолчанию, переопределяем только нужное. */
function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    sku: "TEST",
    name: "Test product",
    myPrice: 1000,
    minPrice: 500,
    maxPrice: 2000,
    step: 10,
    competitors: [],
    ...overrides,
  };
}

const seller = (price: number, inStock = true) => ({ seller: "S", price, inStock });

describe("calculatePrice: примеры из задания", () => {
  it("UNDERCUT: становимся дешевле лучшего конкурента на step", () => {
    const result = calculatePrice(
      makeProduct({ minPrice: 370000, maxPrice: 420000, step: 10, competitors: [seller(384990)] }),
    );
    expect(result.newPrice).toBe(384980);
    expect(result.reason).toBe("UNDERCUT");
  });

  it("AT_MIN: не опускаемся ниже minPrice", () => {
    const result = calculatePrice(
      makeProduct({ minPrice: 180000, maxPrice: 210000, step: 100, competitors: [seller(175000)] }),
    );
    expect(result.newPrice).toBe(180000);
    expect(result.reason).toBe("AT_MIN");
  });

  it("AT_MAX: не поднимаемся выше maxPrice", () => {
    const result = calculatePrice(
      makeProduct({ minPrice: 100000, maxPrice: 125000, step: 1, competitors: [seller(150000)] }),
    );
    expect(result.newPrice).toBe(125000);
    expect(result.reason).toBe("AT_MAX");
  });

  it("дробная цена и дробный step округляются вниз", () => {
    const result = calculatePrice(
      makeProduct({ minPrice: 330000, maxPrice: 380000, step: 0.5, competitors: [seller(349999.9)] }),
    );
    expect(result.newPrice).toBe(349999);
    expect(result.reason).toBe("UNDERCUT");
  });

  it("NO_COMPETITORS: нет конкурентов в наличии -> maxPrice", () => {
    const result = calculatePrice(
      makeProduct({ minPrice: 80000, maxPrice: 99990, step: 50, competitors: [seller(85000, false)] }),
    );
    expect(result.newPrice).toBe(99990);
    expect(result.reason).toBe("NO_COMPETITORS");
  });
});

describe("calculatePrice: конкуренты", () => {
  it("пустой список конкурентов -> NO_COMPETITORS", () => {
    const result = calculatePrice(makeProduct({ competitors: [] }));
    expect(result).toMatchObject({ newPrice: 2000, reason: "NO_COMPETITORS" });
  });

  it("конкуренты не в наличии игнорируются полностью, даже если дешевле", () => {
    const result = calculatePrice(
      makeProduct({ competitors: [seller(600, false), seller(1500, true)] }),
    );
    expect(result).toMatchObject({ newPrice: 1490, reason: "UNDERCUT" });
  });

  it("берётся минимальная цена среди тех, кто в наличии", () => {
    const result = calculatePrice(
      makeProduct({ competitors: [seller(1800), seller(1200), seller(1500)] }),
    );
    expect(result.newPrice).toBe(1190);
  });

  it("несколько конкурентов с одинаковой минимальной ценой — это просто best", () => {
    const result = calculatePrice(
      makeProduct({ competitors: [seller(1200), seller(1200), seller(1300)] }),
    );
    expect(result).toMatchObject({ newPrice: 1190, reason: "UNDERCUT" });
  });
});

describe("calculatePrice: границы диапазона (включительно)", () => {
  it("candidate == minPrice -> UNDERCUT, а не AT_MIN", () => {
    const result = calculatePrice(makeProduct({ minPrice: 1190, competitors: [seller(1200)] }));
    expect(result).toMatchObject({ newPrice: 1190, reason: "UNDERCUT" });
  });

  it("candidate == maxPrice -> UNDERCUT, а не AT_MAX", () => {
    const result = calculatePrice(makeProduct({ maxPrice: 1190, competitors: [seller(1200)] }));
    expect(result).toMatchObject({ newPrice: 1190, reason: "UNDERCUT" });
  });

  it("candidate на 1 меньше minPrice -> AT_MIN", () => {
    const result = calculatePrice(makeProduct({ minPrice: 1191, competitors: [seller(1200)] }));
    expect(result).toMatchObject({ newPrice: 1191, reason: "AT_MIN" });
  });

  it("candidate на 1 больше maxPrice -> AT_MAX", () => {
    const result = calculatePrice(makeProduct({ maxPrice: 1189, competitors: [seller(1200)] }));
    expect(result).toMatchObject({ newPrice: 1189, reason: "AT_MAX" });
  });

  it("minPrice == maxPrice: цена фиксирована", () => {
    const result = calculatePrice(makeProduct({ minPrice: 900, maxPrice: 900, competitors: [seller(1200)] }));
    expect(result.newPrice).toBe(900);
  });
});

describe("calculatePrice: step и округление", () => {
  it("step = 0: цена конкурента без изменений (с округлением вниз)", () => {
    const result = calculatePrice(makeProduct({ step: 0, competitors: [seller(1200.7)] }));
    expect(result.newPrice).toBe(1200);
  });

  it("округление всегда вниз, а не к ближайшему", () => {
    // 1200.9 - 0.1 = 1200.8 -> 1200 (round дал бы 1201)
    const result = calculatePrice(makeProduct({ step: 0.1, competitors: [seller(1200.9)] }));
    expect(result.newPrice).toBe(1200);
  });

  it("не ломается на ошибках чисел с плавающей точкой (100.3 - 0.3 = 100)", () => {
    const result = calculatePrice(
      makeProduct({ minPrice: 0, maxPrice: 1000, step: 0.3, competitors: [seller(100.3)] }),
    );
    expect(result.newPrice).toBe(100);
  });

  it("результат — всегда целое число", () => {
    const result = calculatePrice(makeProduct({ step: 0.25, competitors: [seller(1234.56)] }));
    expect(Number.isInteger(result.newPrice)).toBe(true);
  });
});

describe("calculatePrice: прочее", () => {
  it("myPrice не влияет на расчёт и возвращается как oldPrice", () => {
    const a = calculatePrice(makeProduct({ myPrice: 1, competitors: [seller(1200)] }));
    const b = calculatePrice(makeProduct({ myPrice: 1999, competitors: [seller(1200)] }));
    expect(a.newPrice).toBe(b.newPrice);
    expect(a.oldPrice).toBe(1);
    expect(b.oldPrice).toBe(1999);
  });

  it("возвращает sku товара", () => {
    expect(calculatePrice(makeProduct({ sku: "ABC-1" })).sku).toBe("ABC-1");
  });

  it("не мутирует входные данные", () => {
    const product = makeProduct({ competitors: [seller(1200), seller(1100)] });
    const snapshot = structuredClone(product);
    calculatePrice(product);
    expect(product).toEqual(snapshot);
  });
});

describe("calculatePrice: data/products.json -> data/expected.json", () => {
  it("совпадает с ожидаемым результатом из задания", () => {
    const products = JSON.parse(readFileSync("data/products.json", "utf8")) as Product[];
    const expected = JSON.parse(readFileSync("data/expected.json", "utf8")) as PriceResult[];
    expect(products.map(calculatePrice)).toEqual(expected);
  });
});
