import { readFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "./app";

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  server = createApp().listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server.close();
});

const post = (body: string) =>
  fetch(`${baseUrl}/reprice`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

describe("POST /reprice", () => {
  it("200 и результат из expected.json для data/products.json", async () => {
    const products = readFileSync("data/products.json", "utf8");
    const expected = JSON.parse(readFileSync("data/expected.json", "utf8"));

    const res = await post(products);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(expected);
  });

  it("пустой массив -> 200 и пустой массив", async () => {
    const res = await post("[]");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("не массив -> 400", async () => {
    const res = await post(JSON.stringify({ sku: "x" }));
    expect(res.status).toBe(400);
  });

  it("битый JSON -> 400", async () => {
    const res = await post("{not json");
    expect(res.status).toBe(400);
  });

  it("товар с неверными полями -> 400 с понятным текстом ошибки", async () => {
    const res = await post(JSON.stringify([{ sku: "x", name: "y" }]));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("myPrice");
  });
});
