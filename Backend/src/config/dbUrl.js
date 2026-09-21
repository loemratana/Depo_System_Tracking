// Helpers for the Postgres connection string.

/**
 * Removes the `sslmode=...` query parameter from a connection string.
 *
 * Why this exists: node-postgres merges the settings parsed from the
 * connection string OVER the explicit options passed to `new Pool(...)`, and
 * treats `sslmode=require` as "verify the server certificate". So with
 * `?sslmode=require` in DATABASE_URL, the explicit
 * `ssl: { rejectUnauthorized: false }` in config/db.js was silently ignored
 * and Supabase's certificate chain (not signed by a public CA) was rejected
 * with "self-signed certificate in certificate chain".
 *
 * Stripping the parameter lets the explicit `ssl` option — scoped to this one
 * connection, not the whole process — decide.
 *
 * Other query parameters are left untouched, whether sslmode comes first,
 * last, in the middle, or is the only one.
 */
export function withoutSslMode(url) {
  return String(url).replace(/([?&])sslmode=[^&]*(&?)/, (_match, separator, trailingAmp) =>
    trailingAmp ? separator : '',
  );
}
