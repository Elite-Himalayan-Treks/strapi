/**
 * 2C2P Payment Gateway v4.3 client (JWT HS256).
 * Docs: https://developer.2c2p.com/docs/api-payment-token
 */

import jwt from "jsonwebtoken";

// 2C2P Payment Gateway configuration type decleration.
// All fields are required for proper operation.
export type Twoc2pConfig = {
  merchantId: string;
  secretKey: string;
  baseUrl: string;
  backendReturnUrl: string;
  defaultFrontendReturnUrl: string;
  request3DS: "Y" | "N" | "F";
  env: string;
};

// 2C2P Payment Token request type declaration.
export type PaymentTokenRequest = {
  invoiceNo: string;
  description: string;
  amount: number;
  currencyCode: string;
  frontendReturnUrl: string;
  backendReturnUrl?: string;
  locale?: string;
  userInfo?: {
    name?: string;
    email?: string;
    mobileNo?: string;
    countryCode?: string;
  };
};

// 2C2P Payment Token result type declaration.
// Payment Token is used to initiate a payment request and obtain a payment token for the transaction.
export type PaymentTokenResult = {
  webPaymentUrl: string;
  paymentToken: string;
  respCode: string;
  respDesc: string;
};

// 2C2P Payment Inquiry result type declaration.
// Payment Inquiry is used to check the status of a payment after it has been made.
export type PaymentInquiryResult = Record<string, unknown> & {
  invoiceNo?: string;
  respCode?: string;
  respDesc?: string;
  amount?: number | string;
  currencyCode?: string;
  tranRef?: string;
  referenceNo?: string;
  approvalCode?: string;
  channelCode?: string;
  transactionDateTime?: string;
};

// Resolve the 3DS request setting based on environment and configuration.
// so it is used for determining whether to request 3D Secure authentication for a payment transaction.
function resolveRequest3DS(env: string): "Y" | "N" | "F" {
  const raw = (process.env.TWOC2P_REQUEST_3DS || "").trim().toUpperCase();
  if (raw === "Y" || raw === "N" || raw === "F") return raw;
  return env === "production" ? "Y" : "N";
}

// Get the 2C2P configuration from environment variables.
// also it provides default values for certain settings if they are not specified in the environment.

function getConfig(): Twoc2pConfig {
  const merchantId = process.env.TWOC2P_MERCHANT_ID || "";
  const secretKey = process.env.TWOC2P_SECRET_KEY || "";
  const env = (process.env.TWOC2P_ENV || "sandbox").toLowerCase();
  const baseUrl =
    process.env.TWOC2P_BASE_URL ||
    (env === "production"
      ? "https://pgw.2c2p.com/payment/4.3"
      : "https://sandbox-pgw.2c2p.com/payment/4.3");

  const publicUrl = (process.env.PUBLIC_URL || "http://localhost:1337").replace(
    /\/$/,
    "",
  );
  const frontendUrl = (
    process.env.FRONTEND_URL || "http://localhost:3000"
  ).replace(/\/$/, "");

  return {
    merchantId,
    secretKey,
    baseUrl,
    backendReturnUrl:
      process.env.TWOC2P_BACKEND_RETURN_URL ||
      `${publicUrl}/api/bookings/payment/callback`,
    defaultFrontendReturnUrl:
      process.env.TWOC2P_FRONTEND_RETURN_URL ||
      `${frontendUrl}/booking/payment-result`,
    request3DS: resolveRequest3DS(env),
    env,
  };
}

// Check if 2C2P is properly configured by verifying that both the merchant ID and secret key are present in the configuration.
export function isTwoc2pConfigured(): boolean {
  const cfg = getConfig();
  return Boolean(cfg.merchantId && cfg.secretKey);
}

// Sign the given payload data using the provided secret key and return a JWT token.
// it uses the HS256 algorithm for signing and does not include a timestamp in the token.
// it generate the signed JWT token that can be sent to the 2C2P payment gateway for secure communication.
export function signPayload(
  data: Record<string, unknown>,
  secretKey: string,
): string {
  // 2C2P verifies the exact JWT payload; do not add default `iat`.
  return jwt.sign(data, secretKey, { algorithm: "HS256", noTimestamp: true });
}

// Decode the given JWT token using the provided secret key and return the decoded payload.
// it uses the HS256 algorithm for verification and returns the decoded payload as a generic type T.
// if the token is invalid or cannot be verified, it will throw an error.
export function decodePayload<T = Record<string, unknown>>(
  token: string,
  secretKey: string,
): T {
  return jwt.verify(token, secretKey, { algorithms: ["HS256"] }) as T;
}

/**
 * Backend notifications may arrive as `{ payload: "<jwt>" }` or form-encoded.
 * Some environments sign with the merchant secret; if verify fails, decode
 * without verify only when TWOC2P_ALLOW_UNVERIFIED_CALLBACK=true (dev only).
 */
export function decodeIncomingPayload(
  tokenOrBody: string | Record<string, unknown>,
): PaymentInquiryResult {
  const cfg = getConfig();
  let token = "";

  if (typeof tokenOrBody === "string") {
    token = tokenOrBody;
  } else if (tokenOrBody && typeof tokenOrBody === "object") {
    const payload = tokenOrBody.payload ?? tokenOrBody.paymentResponse;
    if (typeof payload === "string") {
      token = payload;
    } else {
      return tokenOrBody as PaymentInquiryResult;
    }
  }

  if (!token) {
    throw new Error("Missing 2C2P payload");
  }

  try {
    return decodePayload<PaymentInquiryResult>(token, cfg.secretKey);
  } catch (err) {
    if (process.env.TWOC2P_ALLOW_UNVERIFIED_CALLBACK === "true") {
      return jwt.decode(token) as PaymentInquiryResult;
    }
    throw err;
  }
}

// Send a POST request to the specified 2C2P API endpoint with the given data, signing the payload with the merchant's secret key.

async function postJwt(
  path: string,
  data: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const cfg = getConfig();
  if (!cfg.merchantId || !cfg.secretKey) {
    throw new Error(
      "2C2P is not configured (TWOC2P_MERCHANT_ID / TWOC2P_SECRET_KEY)",
    );
  }

  const signed = signPayload(data, cfg.secretKey);
  const res = await fetch(`${cfg.baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payload: signed }),
  });

  const raw = (await res.json()) as {
    payload?: string;
    [key: string]: unknown;
  };
  if (!res.ok) {
    throw new Error(`2C2P HTTP ${res.status}: ${JSON.stringify(raw)}`);
  }

  if (typeof raw.payload === "string") {
    return decodePayload(raw.payload, cfg.secretKey);
  }

  return raw;
}

// Request a payment token from the 2C2P API using the provided input data, which includes invoice number, description, amount, currency code, and optional user information. The function returns a promise that resolves to a PaymentTokenResult containing the web payment URL and payment token.
export async function requestPaymentToken(
  input: PaymentTokenRequest,
): Promise<PaymentTokenResult> {
  const cfg = getConfig();
  const amount = Math.round(Number(input.amount) * 100) / 100;

  const body: Record<string, unknown> = {
    merchantID: cfg.merchantId,
    invoiceNo: input.invoiceNo,
    description: input.description.slice(0, 250),
    amount,
    currencyCode: input.currencyCode.toUpperCase(),
    locale: input.locale || "en",
    request3DS: cfg.request3DS,
    frontendReturnUrl: input.frontendReturnUrl || cfg.defaultFrontendReturnUrl,
    backendReturnUrl: input.backendReturnUrl || cfg.backendReturnUrl,
  };

  if (input.userInfo) {
    // Only forward valid ISO country codes — free-text (e.g. "Nepal") can
    // yield hosted-page "Invalid Request (9993)" after token success.
    const countryCode =
      input.userInfo.countryCode &&
      /^[A-Za-z]{2}$/.test(input.userInfo.countryCode)
        ? input.userInfo.countryCode.toUpperCase()
        : undefined;
    const userInfo = {
      ...(input.userInfo.name ? { name: input.userInfo.name } : {}),
      ...(input.userInfo.email ? { email: input.userInfo.email } : {}),
      ...(input.userInfo.mobileNo ? { mobileNo: input.userInfo.mobileNo } : {}),
      ...(countryCode ? { countryCode } : {}),
    };
    if (Object.keys(userInfo).length > 0) {
      body.uiParams = { userInfo };
    }
  }

  const decoded = await postJwt("/paymentToken", body);
  return decoded as PaymentTokenResult;
}

// Inquire the status of a payment using the provided invoice number. The function sends a request to the 2C2P API and returns a promise that resolves to a PaymentInquiryResult containing information about the payment status, such as response code, description, amount, currency code, and transaction reference.
export async function inquirePayment(
  invoiceNo: string,
): Promise<PaymentInquiryResult> {
  const cfg = getConfig();
  return postJwt("/paymentInquiry", {
    merchantID: cfg.merchantId,
    invoiceNo,
    locale: "en",
  }) as Promise<PaymentInquiryResult>;
}

// Get the public configuration for 2C2P, including environment and feature flags.
export function getTwoc2pPublicConfig() {
  const cfg = getConfig();
  return {
    configured: isTwoc2pConfigured(),
    env: cfg.env,
    request3DS: cfg.request3DS,
    defaultFrontendReturnUrl: cfg.defaultFrontendReturnUrl,
    depositPercent: Number(process.env.BOOKING_DEPOSIT_PERCENT || 30),
  };
}

export default {
  isTwoc2pConfigured,
  requestPaymentToken,
  inquirePayment,
  decodeIncomingPayload,
  getTwoc2pPublicConfig,
};
