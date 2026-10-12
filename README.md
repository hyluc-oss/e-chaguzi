# e-Chaguzi

University election application built with Next.js, PostgreSQL, Prisma, Circom, and Solidity.

## Local setup

1. Install Node.js dependencies with `npm install`.
2. Copy `.env.example` to `.env` and configure PostgreSQL, `SESSION_SECRET`, and Microsoft Entra SAML values.
   Students and administrators have separate login pages at `/auth/login` and `/auth/admin`. For persistent local sign-in, set `LOCAL_AUTH_ENABLED=true`, configure `LOCAL_STUDENT_ACCOUNTS` as a JSON array of Student ID/password/optional Gmail records, and set `LOCAL_ADMIN_ID` and `LOCAL_ADMIN_PASSWORD` in `.env`; then run `npm run auth:provision-local` once. Credentials are stored as scrypt hashes in PostgreSQL and remain available independently of the environment file; running the provision command again does not overwrite existing passwords. Students sign in with their registration number; registered Gmail is used only for password recovery. Configure a Gmail SMTP app password using `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and `EMAIL_FROM`, and set `APP_BASE_URL` to the app's public HTTPS URL (localhost is allowed for local development) to enable password-reset email. Reset links expire after 20 minutes and can be used once. Local password authentication defaults to disabled and should not be enabled for public production deployments; for institutional access use SAML.
3. Apply the committed PostgreSQL migrations and generate Prisma Client:

   ```bash
   npx prisma migrate deploy
   npx prisma generate
   npm run db:seed
   ```

   For local development, use `npx prisma migrate dev` to create and apply later schema migrations. Review and commit the generated SQL; do not use `db push` for deployed environments.

   The seed loads the supplied 2026/2027 election, four scopes, and eight candidates. It is safe to rerun when those records match; it refuses to overwrite differing data. It does not create voter accounts, trustee assignments, contract addresses, or voter commitments.

   Create a private, custom-format PostgreSQL backup before making bulk changes:

   ```bash
   npm run db:backup
   ```

   Backups are saved under the ignored `backups/` directory. To choose another new filename, pass it as an argument, for example `npm run db:backup -- /secure/path/echaguzi.dump`. Existing files are never overwritten. Inspect an archive with `pg_restore --list backups/<backup-file>.dump` (replace the placeholder with the generated filename). Restore only into a deliberately selected empty database; restoring into an existing database may overwrite or conflict with its objects.

4. For institutional authentication, configure the Entra enterprise application with the service-provider metadata at `/api/auth/metadata` and the assertion consumer URL `/api/auth/callback`. Local password sign-in does not require Entra.
5. Set `SAML_ADMIN_GROUP_ID` and `SAML_TRUSTEE_GROUP_ID` to distinct Entra security groups. Roles are derived from the signed SAML group claim; role values supplied by a browser are not accepted. Accounts in both groups are denied access to avoid conflicting duties.
6. Set the SAML entry point to the tenant's `https://login.microsoftonline.com/<tenant-id>/saml2`, use the same public host for `SAML_ISSUER` and `SAML_CALLBACK_URL`, and paste the Entra signing certificate into `SAML_IDP_CERT`. For local testing the callback may use `http://localhost:3000/api/auth/callback`; deployed callbacks must use HTTPS. Configure the groups claim plus faculty, residence, and class claim names to match the values assigned to students in Entra.
7. Run `npm run auth:check`; it checks the required settings and PostgreSQL connectivity without displaying secrets. Then start the app with `npm run dev`.

Admin routes require a signed session for a provisioned local administrator or a user in the configured Entra admin group. Without valid authentication and database configuration, sign-in and protected features remain unavailable.

## Election setup

Administrators create elections and the four required position types from `/admin/elections`. Each election has one university-wide USRC executive race and can include multiple faculty, residence, and class scopes. Every race scope key must exactly match the corresponding SAML eligibility claim configured in `.env`. Each election also requires five distinct institutional key-trustee accounts, with a 3-of-5 decryption quorum. An election cannot be published until a voter Merkle root is registered on-chain.

Root registration requires a deployed ballot contract, an RPC endpoint, and a server-side `ELECTION_ADMIN_PRIVATE_KEY`. Do not commit `.env` or production secrets.

The portal records trustee assignments only; it never stores private key shares. The selected voting direction is ElectionGuard for the off-chain encrypted election and aggregate tally, with public verification artifacts anchored on-chain. Ballots must be encrypted in the voter's browser: the portal and any backend service must never receive plaintext selections. Do not enable ballot submission until an independently reviewed, browser-compatible ElectionGuard implementation interoperable with the trustee tooling is selected.

The trustee key-generation ceremony, encrypted ballot verifier, aggregate decryption, and artifact anchoring are not enabled yet. The current Solidity ballot contract exposes candidate selections and must not be used for a live election. Do not represent trustee roster assignment as a completed key ceremony or cryptographic protection.

## Validation

```bash
npm run lint
npm run build
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/echaguzi npx prisma validate
```
