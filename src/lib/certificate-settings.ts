import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { prisma } from "./db";
import {
  CERTIFICATE_BRAND_CONFIG_ID,
  DEFAULT_CERTIFICATE_BRAND,
  mergeCertificateBrand,
  sanitizeTrainingCopy,
  type CertificateBrandSettings,
} from "./certificate-brand";

const CONFIG_PATH = join(process.cwd(), "data", "certificate-brand.json");

async function readFromFile(): Promise<CertificateBrandSettings | null> {
  try {
    const raw = await readFile(CONFIG_PATH, "utf8");
    return sanitizeTrainingCopy(mergeCertificateBrand(JSON.parse(raw)));
  } catch {
    return null;
  }
}

async function writeToFile(merged: CertificateBrandSettings) {
  await mkdir(dirname(CONFIG_PATH), { recursive: true });
  await writeFile(CONFIG_PATH, JSON.stringify(merged, null, 2), "utf8");
}

async function readFromDb(): Promise<CertificateBrandSettings | null> {
  const client = prisma as unknown as {
    appConfig?: {
      findUnique: (args: {
        where: { id: string };
      }) => Promise<{ value: unknown } | null>;
    };
  };
  if (!client.appConfig) return null;
  try {
    const row = await client.appConfig.findUnique({
      where: { id: CERTIFICATE_BRAND_CONFIG_ID },
    });
    if (!row) return null;
    return sanitizeTrainingCopy(mergeCertificateBrand(row.value ?? null));
  } catch {
    return null;
  }
}

async function writeToDb(
  merged: CertificateBrandSettings,
  updatedById?: string | null
) {
  const client = prisma as unknown as {
    appConfig?: {
      upsert: (args: {
        where: { id: string };
        create: {
          id: string;
          value: CertificateBrandSettings;
          updatedById: string | null;
        };
        update: {
          value: CertificateBrandSettings;
          updatedById: string | null;
        };
      }) => Promise<unknown>;
    };
  };
  if (!client.appConfig) return;
  try {
    await client.appConfig.upsert({
      where: { id: CERTIFICATE_BRAND_CONFIG_ID },
      create: {
        id: CERTIFICATE_BRAND_CONFIG_ID,
        value: merged,
        updatedById: updatedById || null,
      },
      update: {
        value: merged,
        updatedById: updatedById || null,
      },
    });
  } catch (err) {
    // Optional mirror — file save is the source of truth
    console.warn("AppConfig DB mirror skipped:", err);
  }
}

export async function getCertificateBrandSettings(): Promise<CertificateBrandSettings> {
  const fromFile = await readFromFile();
  if (fromFile) return fromFile;

  const fromDb = await readFromDb();
  if (fromDb) {
    // Seed file from DB so future saves stay file-based
    try {
      await writeToFile(fromDb);
    } catch {
      /* ignore */
    }
    return fromDb;
  }

  return { ...DEFAULT_CERTIFICATE_BRAND };
}

export async function saveCertificateBrandSettings(
  value: CertificateBrandSettings,
  updatedById?: string | null
): Promise<CertificateBrandSettings> {
  const merged = sanitizeTrainingCopy(mergeCertificateBrand(value));
  await writeToFile(merged);
  await writeToDb(merged, updatedById);
  return merged;
}
