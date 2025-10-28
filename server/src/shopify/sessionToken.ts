import { createRemoteJWKSet, decodeJwt, jwtVerify } from "jose";
import { createSecretKey } from "crypto";
import { env } from "../env";

const SHOPIFY_SESSION_JWKS_URL = "https://app.shopify.com/services/jwks";

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getRemoteJwks() {
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(SHOPIFY_SESSION_JWKS_URL), {
      cacheMaxAge: 5 * 60 * 1000,
    });
  }
  return jwks;
}

function textKey(value: string) {
  return createSecretKey(Buffer.from(value, "utf-8"));
}

export type ShopifySessionPayload = {
  iss?: string;
  dest?: string;
  aud?: string;
  exp?: number;
};

export type ShopifySessionVerificationResult = {
  payload: ShopifySessionPayload;
  verified: boolean;
};

export async function verifyShopifySessionToken(
  token: string,
  options: {
    validateSignature: boolean;
    apiSecret?: string | null;
  },
): Promise<ShopifySessionVerificationResult> {
  const { validateSignature, apiSecret } = options;

  if (validateSignature) {
    // Try RS256 via Shopify's JWKS first.
    try {
      const { payload } = await jwtVerify(token, getRemoteJwks(), {
        algorithms: ["RS256"],
      });
      return {
        payload: payload as ShopifySessionPayload,
        verified: true,
      };
    } catch (error) {
      console.warn("[shopify-auth] RS256 verification failed", error);
      if (apiSecret) {
        try {
          const { payload } = await jwtVerify(token, textKey(apiSecret), {
            algorithms: ["HS256"],
          });
          return {
            payload: payload as ShopifySessionPayload,
            verified: true,
          };
        } catch (hsError) {
          console.warn("[shopify-auth] HS256 verification failed", hsError);
        }
      }
      if (!env.SHOPIFY_VALIDATE_SESSION_SIGNATURE) {
        const payload = decodeJwt(token) as ShopifySessionPayload;
        return { payload, verified: false };
      }
      throw error;
    }
  }

  const payload = decodeJwt(token) as ShopifySessionPayload;
  return { payload, verified: false };
}
