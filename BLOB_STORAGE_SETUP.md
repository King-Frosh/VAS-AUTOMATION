# Private Vercel Blob storage changes

## What changed

- New source uploads are stored in a **private** Vercel Blob store. The existing `uploads.stored_path` column stores a `blob:<pathname>` locator; no database migration is required.
- Generated `.xlsx` files are written to a temporary directory, uploaded to private Blob, and the temporary directory is removed in a `finally` block.
- The authenticated report-download route reads the private Blob object server-side and streams it through the existing application route. Blob URLs/tokens are not exposed to the browser.
- SMTP delivery retrieves the report bytes from private Blob before attaching them to the email.
- Legacy local paths remain readable for existing records and seeded data.
- The existing database schema and report/email workflow are unchanged.

## Vercel setup

1. In the Vercel project, create or connect a **Private** Blob store under Storage. Do not use a public store for source logs or partner reports.
2. Ensure `BLOB_READ_WRITE_TOKEN` is present in Development, Preview, and Production environments as needed. Prefer the project-connected token managed by Vercel.
3. Install the added SDK dependency and regenerate the lockfile with `npm install` before deploying. The SDK was not present in the supplied project; this change targets `@vercel/blob` 2.8.x (private Blob support requires SDK >= 2.3).
4. Deploy, then check `/api/health`; it reports whether the Blob token is configured.
5. Test with a small source file: upload, generate a report, download it while signed in, and send a test email. Confirm unauthenticated report downloads return HTTP 401.

## Upload-size limit

The existing form submits through a Next.js Server Action. Vercel server request bodies are limited to 4.5 MB, so the previous 25 MB application limit could not reliably work in production. This implementation sets a conservative 4 MB file limit to leave room for request overhead. Supporting larger source files requires switching the upload form to Vercel Blob client uploads and finalizing processing after the direct upload.

## Environment security

Do not commit `.env.local` or paste its values into support tickets. The supplied archive contained a local environment file, so it has been excluded from the updated archive. Keep your existing `DATABASE_URL` in your local environment and Vercel project settings. `.env.example` contains placeholders only.
