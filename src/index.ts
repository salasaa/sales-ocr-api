import { OpenAPIHono } from "@hono/zod-openapi";
import { Scalar } from "@scalar/hono-api-reference";
import { cors } from "hono/cors";

import authRouter from "./modules/auth/route";

import userRouter from "./modules/user/route";
import contactRouter from "./modules/contact/route";
import transactionRouter from "./modules/transaction/route";

const app = new OpenAPIHono();

app.use(cors());

// Registrasi Base Route API
app.route("/users", userRouter);
app.route("/contacts", contactRouter);
app.route("/transactions", transactionRouter);
app.route("/auth", authRouter);

app.doc("/openapi.json", {
  openapi: "3.0.0",
  info: {
    title: "Sales OCR API",
    version: "1.0.0",
  },
});

app.get(
  "/",
  Scalar({
    pageTitle: "Sales OCR API",
    url: "/openapi.json",
  }),
);

export default app;
