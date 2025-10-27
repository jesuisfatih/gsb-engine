import "dotenv/config";

process.env.NODE_ENV = "test";

if (!process.env.JWT_EXPIRES_IN) {
  process.env.JWT_EXPIRES_IN = "15m";
}

if (!process.env.ALLOW_DEV_TENANT_HEADER) {
  process.env.ALLOW_DEV_TENANT_HEADER = "false";
}
