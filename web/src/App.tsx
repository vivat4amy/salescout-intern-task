import { useEffect, useState } from "react";
import type { PriceResult, Product, Reason } from "../../src/types";
import productsJson from "../../data/products.json";
import { reprice } from "./api";

// JSON из data/ подходит под тип Product (проверяется компилятором)
const products: Product[] = productsJson;

const REASON_LABELS: Record<Reason, string> = {
  UNDERCUT: "Дешевле конкурента",
  AT_MIN: "Достигнут минимум",
  AT_MAX: "Достигнут максимум",
  NO_COMPETITORS: "Нет конкурентов",
};

const formatPrice = (value: number) => `${value.toLocaleString("ru-RU")} ₸`;

function PriceChange({ oldPrice, newPrice }: { oldPrice: number; newPrice: number }) {
  const diff = newPrice - oldPrice;
  if (diff === 0) return <span className="delta">без изменений</span>;
  const cls = diff < 0 ? "delta down" : "delta up";
  const sign = diff > 0 ? "+" : "−";
  return (
    <span className={cls}>
      {sign}
      {Math.abs(diff).toLocaleString("ru-RU")} ₸
    </span>
  );
}

export function App() {
  const [results, setResults] = useState<PriceResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setResults(await reprice(products));
    } catch (e) {
      setResults(null);
      setError(e instanceof Error ? e.message : "Неизвестная ошибка");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  // Название товара берём из исходных данных по sku
  const nameBySku = new Map(products.map((p) => [p.sku, p.name]));

  return (
    <main>
      <header>
        <h1>Мини прайс-бот</h1>
        <p>Цены «было / стало» после пересчёта по конкурентам</p>
        <button onClick={() => void load()} disabled={loading}>
          {loading ? "Считаем…" : "Пересчитать"}
        </button>
      </header>

      {error && (
        <div className="error" role="alert">
          Не удалось получить цены: {error}. Запущен ли сервер (<code>npm run server</code>)?
        </div>
      )}

      {results && (
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Название</th>
              <th className="num">Было</th>
              <th className="num">Стало</th>
              <th>Причина</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.sku}>
                <td className="mono">{r.sku}</td>
                <td>{nameBySku.get(r.sku) ?? "—"}</td>
                <td className="num">{formatPrice(r.oldPrice)}</td>
                <td className="num">
                  <strong>{formatPrice(r.newPrice)}</strong>
                  <PriceChange oldPrice={r.oldPrice} newPrice={r.newPrice} />
                </td>
                <td>
                  <span className={`badge ${r.reason.toLowerCase()}`}>{REASON_LABELS[r.reason]}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
