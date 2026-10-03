import * as Sentry from "@sentry/nextjs";
import { connection } from "next/server";
import { MONITORING_ERRORS } from '@/constants/errors/monitoring'

class SentryExampleAPIError extends Error {
  constructor(message: string | undefined) {
    super(message);
    this.name = "SentryExampleAPIError";
  }
}

// A faulty API route to test Sentry's error monitoring
export async function GET() {
  // Opt out of prerendering so the error is thrown at request time
  await connection();
  Sentry.logger.info("Sentry example API called");
  throw new SentryExampleAPIError(
    MONITORING_ERRORS.API_EXAMPLE,
  );
}
