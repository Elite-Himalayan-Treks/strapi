/**
 * 2C2P Payment Gateway v4.3 client (JWT HS256).
 * Docs: https://developer.2c2p.com/docs/api-payment-token
 */

import jwt from "jsonwebtoken";

export type Twoc2pConfig = {
  merchantId: string;
  secretKey: string;
  baseUrl: string;
  backendReturnUrl: string;
  defaultFrontendReturnUrl: string;
};

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

export type PaymentTokenResult = {
  webPaymentUrl: string;
  paymentToken: string;
  respCode: string;
  respDesc: string;
};

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
  };
}

export function isTwoc2pConfigured(): boolean {
  const cfg = getConfig();
  return Boolean(cfg.merchantId && cfg.secretKey);
}

export function signPayload(
  data: Record<string, unknown>,
  secretKey: string,
): string {
  // 2C2P verifies the exact JWT payload; do not add default `iat`.
  return jwt.sign(data, secretKey, { algorithm: "HS256", noTimestamp: true });
}

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

export function getTwoc2pPublicConfig() {
  const cfg = getConfig();
  return {
    configured: isTwoc2pConfigured(),
    env: (process.env.TWOC2P_ENV || "sandbox").toLowerCase(),
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
