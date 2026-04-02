interface CloudflareD1Config {
  accountId: string;
  databaseId: string;
  apiToken: string;
}

const REQUIRED_D1_ENV_KEYS = [
  "CLOUDFLARE_ACCOUNT_ID",
  "CLOUDFLARE_DATABASE_ID",
  "CLOUDFLARE_D1_TOKEN",
] as const;

export function getCloudflareD1Config(): CloudflareD1Config {
  const config = {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID?.trim(),
    databaseId: process.env.CLOUDFLARE_DATABASE_ID?.trim(),
    apiToken: process.env.CLOUDFLARE_D1_TOKEN?.trim(),
  };

  const missingKeys = REQUIRED_D1_ENV_KEYS.filter((key) => {
    if (key === "CLOUDFLARE_ACCOUNT_ID") return !config.accountId;
    if (key === "CLOUDFLARE_DATABASE_ID") return !config.databaseId;
    return !config.apiToken;
  });

  if (missingKeys.length > 0) {
    throw new Error(
      `Missing Cloudflare D1 environment variables: ${missingKeys.join(
        ", "
      )}. Copy .env.example to .env.local and fill in your own values before starting the app.`
    );
  }

  return config as CloudflareD1Config;
}
