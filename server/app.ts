import express, { type ErrorRequestHandler, type Express } from "express";
import { calculatePrice } from "../src/pricing";
import { isProductList, validateProducts } from "./validate";

export function createApp(): Express {
  const app = express();

  app.use(express.json({ limit: "5mb" }));

  // POST /reprice: массив товаров на входе -> массив результатов в том же порядке
  app.post("/reprice", (req, res) => {
    if (!isProductList(req.body)) {
      res.status(400).json({ error: validateProducts(req.body) });
      return;
    }
    res.json(req.body.map(calculatePrice));
  });

  // Битый JSON в теле запроса тоже считается некорректным запросом (400)
  const jsonErrorHandler: ErrorRequestHandler = (err, _req, res, next) => {
    if (err instanceof SyntaxError) {
      res.status(400).json({ error: "Некорректный JSON" });
      return;
    }
    next(err);
  };
  app.use(jsonErrorHandler);

  return app;
}
