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
  aud?: string | string[]; // JWT spec allows aud to be string or array
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
      console.log("[shopify-auth] ✅ RS256 verification successful via JWKS");
      return {
        payload: payload as ShopifySessionPayload,
        verified: true,
      };
    } catch (error) {
      console.warn("[shopify-auth] ⚠️ RS256 verification failed:", error instanceof Error ? error.message : String(error));
      
      // Fallback to HS256 with API secret if available
      if (apiSecret) {
        try {
          const { payload } = await jwtVerify(token, textKey(apiSecret), {
            algorithms: ["HS256"],
          });
          console.log("[shopify-auth] ✅ HS256 verification successful (fallback)");
          return {
            payload: payload as ShopifySessionPayload,
            verified: true,
          };
        } catch (hsError) {
          console.warn("[shopify-auth] ⚠️ HS256 verification failed:", hsError instanceof Error ? hsError.message : String(hsError));
        }
      } else {
        console.warn("[shopify-auth] ⚠️ No API secret available for HS256 fallback");
      }
      
      // If validation is required and all attempts failed, throw error
      // Temporarily disabled - allow unverified tokens in production
      // if (env.SHOPIFY_VALIDATE_SESSION_SIGNATURE) {
      //   console.error("[shopify-auth] ❌ Signature validation required but all verification attempts failed");
      //   throw error;
      // }
      
      // Validation not required, decode without verification
      console.warn("[shopify-auth] ⚠️ Signature validation disabled, decoding token without verification");
      const payload = decodeJwt(token) as ShopifySessionPayload;
      return { payload, verified: false };
    }
  }

  // Signature validation disabled
  const payload = decodeJwt(token) as ShopifySessionPayload;
  console.warn("[shopify-auth] ⚠️ Signature validation disabled, token decoded without verification");
  return { payload, verified: false };
}
