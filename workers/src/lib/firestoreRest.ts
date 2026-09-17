/**
 * Firestore access from a Cloudflare Worker via the plain REST API, since
 * firebase-admin (Node-only) can't run in the Workers runtime. Auth is a
 * Google service-account JWT-bearer OAuth exchange, signed with Web Crypto
 * (crypto.subtle) instead of Node's crypto module.
 */

export interface ServiceAccount {
  client_email: string;
  private_key: string;
  project_id?: string;
}

function base64url(input: ArrayBuffer | string): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  let str = "";
  bytes.forEach((b) => (str += String.fromCharCode(b)));
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const pemBody = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");
  const binaryDer = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    "pkcs8",
    binaryDer.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

async function signJwtAssertion(sa: ServiceAccount, scope: string): Promise<string> {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: sa.client_email,
    scope,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claim))}`;
  const key = await importPrivateKey(sa.private_key);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  return `${unsigned}.${base64url(sig)}`;
}

// Best-effort in-isolate cache, keyed by scope. A cold isolate just re-fetches;
// this only cuts latency for warm ones, it's not a correctness requirement.
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

export async function getAccessToken(sa: ServiceAccount, scope: string): Promise<string> {
  const cached = tokenCache.get(scope);
  const now = Date.now();
  if (cached && cached.expiresAt - 60_000 > now) return cached.token;

  const assertion = await signJwtAssertion(sa, scope);
  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!resp.ok) {
    throw new Error(`OAuth token exchange failed (${resp.status}): ${await resp.text()}`);
  }
  const json = (await resp.json()) as { access_token: string; expires_in: number };
  tokenCache.set(scope, { token: json.access_token, expiresAt: now + json.expires_in * 1000 });
  return json.access_token;
}

// ---------------------------------------------------------------------------
// Firestore typed-value <-> plain JS value conversion
// ---------------------------------------------------------------------------

export function encodeValue(v: unknown): Record<string, unknown> {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === "string") return { stringValue: v };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") {
    return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  }
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(encodeValue) } };
  if (typeof v === "object") {
    return {
      mapValue: {
        fields: Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, val]) => [k, encodeValue(val)])),
      },
    };
  }
  throw new Error(`Unsupported Firestore value type: ${typeof v}`);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function decodeValue(v: any): any {
  if (!v || typeof v !== "object") return null;
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("nullValue" in v) return null;
  if ("timestampValue" in v) return v.timestampValue;
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(decodeValue);
  if ("mapValue" in v) {
    return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, val]) => [k, decodeValue(val)]));
  }
  if ("vectorValue" in v) {
    // Firestore vector fields come back as a mapValue with a `value` array field
    // under the `__type__: "__vector__"` convention, or as vectorValue directly
    // depending on API surface/version — handle both shapes defensively.
    const raw = v.vectorValue?.values ?? v.vectorValue;
    return Array.isArray(raw) ? raw.map((n: unknown) => (typeof n === "number" ? n : decodeValue(n))) : null;
  }
  return null;
}

export function encodeVector(values: number[]): Record<string, unknown> {
  return { mapValue: { fields: { __type__: { stringValue: "__vector__" }, value: encodeValue(values) } } };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function decodeDocFields(fields: Record<string, any> | undefined): Record<string, unknown> {
  return decodeValue({ mapValue: { fields: fields || {} } });
}

// ---------------------------------------------------------------------------
// Firestore REST client
// ---------------------------------------------------------------------------

export interface FirestoreDoc<T = Record<string, unknown>> {
  path: string;
  id: string;
  data: T;
}

export class FirestoreClient {
  private base: string;

  constructor(
    private projectId: string,
    private sa: ServiceAccount
  ) {
    this.base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
  }

  private async token(): Promise<string> {
    return getAccessToken(this.sa, "https://www.googleapis.com/auth/datastore");
  }

  private async authed(path: string, init?: RequestInit): Promise<Response> {
    const token = await this.token();
    return fetch(`${this.base}${path}`, {
      ...init,
      headers: { ...(init?.headers || {}), Authorization: `Bearer ${token}` },
    });
  }

  /** GET a single document. Returns null on 404 (matches Admin SDK's `.exists` check ergonomics). */
  async getDoc<T = Record<string, unknown>>(path: string): Promise<T | null> {
    const resp = await this.authed(`/${path}`);
    if (resp.status === 404) return null;
    if (!resp.ok) throw new Error(`Firestore getDoc(${path}) failed: ${resp.status} ${await resp.text()}`);
    const json = (await resp.json()) as { fields?: Record<string, unknown> };
    return decodeDocFields(json.fields) as T;
  }

  /**
   * Merge-patch a document (creates it if absent, like Admin SDK's
   * `.update()`/`.set(...,{merge:true})`). Keys may use dot-path notation
   * ("subscription.tier") to touch one field inside a nested map without
   * disturbing its siblings — the mask uses the dotted path as-is, but the
   * `fields` payload must mirror Firestore's actual nested document shape,
   * so dotted keys are expanded into nested mapValues here.
   */
  async patchDoc(path: string, data: Record<string, unknown>): Promise<void> {
    const fields: Record<string, unknown> = {};
    for (const [dottedKey, value] of Object.entries(data)) {
      const segments = dottedKey.split(".");
      let cursor = fields as Record<string, any>;
      for (let i = 0; i < segments.length - 1; i++) {
        const seg = segments[i];
        if (!cursor[seg]) cursor[seg] = { mapValue: { fields: {} } };
        cursor = cursor[seg].mapValue.fields;
      }
      cursor[segments[segments.length - 1]] = encodeValue(value);
    }
    const mask = Object.keys(data)
      .map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`)
      .join("&");
    const resp = await this.authed(`/${path}?${mask}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
    });
    if (!resp.ok) throw new Error(`Firestore patchDoc(${path}) failed: ${resp.status} ${await resp.text()}`);
  }

  /** Like patchDoc, but for fields that need a non-default encoding (e.g. encodeVector for embeddings). */
  async patchDocRaw(path: string, encodedFields: Record<string, Record<string, unknown>>): Promise<void> {
    const mask = Object.keys(encodedFields)
      .map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`)
      .join("&");
    const resp = await this.authed(`/${path}?${mask}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields: encodedFields }),
    });
    if (!resp.ok) throw new Error(`Firestore patchDocRaw(${path}) failed: ${resp.status} ${await resp.text()}`);
  }

  /** Create a new document under a collection, optionally with a caller-chosen id. Returns the new doc id. */
  async createDoc(collectionPath: string, data: Record<string, unknown>, docId?: string): Promise<string> {
    const fields = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, encodeValue(v)]));
    const qs = docId ? `?documentId=${encodeURIComponent(docId)}` : "";
    const resp = await this.authed(`/${collectionPath}${qs}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
    });
    if (!resp.ok) throw new Error(`Firestore createDoc(${collectionPath}) failed: ${resp.status} ${await resp.text()}`);
    const json = (await resp.json()) as { name: string };
    return json.name.split("/").pop() as string;
  }

  async deleteDoc(path: string): Promise<void> {
    const resp = await this.authed(`/${path}`, { method: "DELETE" });
    if (!resp.ok && resp.status !== 404) {
      throw new Error(`Firestore deleteDoc(${path}) failed: ${resp.status} ${await resp.text()}`);
    }
  }

  /** Fetch up to 500 documents by full resource path in one round trip. Missing docs come back as null at their index. */
  async batchGet(paths: string[]): Promise<(Record<string, unknown> | null)[]> {
    if (paths.length === 0) return [];
    const token = await this.token();
    const documents = paths.map((p) => `${this.base}/${p}`);
    const resp = await fetch(
      `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)/documents:batchGet`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ documents }),
      }
    );
    if (!resp.ok) throw new Error(`Firestore batchGet failed: ${resp.status} ${await resp.text()}`);
    const results = (await resp.json()) as { found?: { name: string; fields?: Record<string, unknown> } }[];
    const byName = new Map<string, Record<string, unknown>>();
    for (const r of results) {
      if (r.found) byName.set(r.found.name, decodeDocFields(r.found.fields));
    }
    return documents.map((name) => byName.get(name) ?? null);
  }

  /** Collection scan (no filters) — used sparingly, mirrors `.collection(x).get()`. */
  async listCollection<T = Record<string, unknown>>(collectionPath: string): Promise<FirestoreDoc<T>[]> {
    const out: FirestoreDoc<T>[] = [];
    let pageToken: string | undefined;
    do {
      const qs = pageToken ? `?pageToken=${encodeURIComponent(pageToken)}` : "";
      const resp = await this.authed(`/${collectionPath}${qs}`);
      if (!resp.ok) throw new Error(`Firestore listCollection(${collectionPath}) failed: ${resp.status} ${await resp.text()}`);
      const json = (await resp.json()) as { documents?: { name: string; fields?: Record<string, unknown> }[]; nextPageToken?: string };
      for (const doc of json.documents || []) {
        const id = doc.name.split("/").pop() as string;
        out.push({ path: `${collectionPath}/${id}`, id, data: decodeDocFields(doc.fields) as T });
      }
      pageToken = json.nextPageToken;
    } while (pageToken);
    return out;
  }

  /** Structured query with equality filters — mirrors `.where(field,"==",value)` chains. */
  async queryEquals<T = Record<string, unknown>>(
    collectionId: string,
    filters: { field: string; value: unknown }[]
  ): Promise<FirestoreDoc<T>[]> {
    const token = await this.token();
    const structuredQuery = {
      from: [{ collectionId }],
      where:
        filters.length > 0
          ? {
              compositeFilter: {
                op: "AND",
                filters: filters.map((f) => ({
                  fieldFilter: { field: { fieldPath: f.field }, op: "EQUAL", value: encodeValue(f.value) },
                })),
              },
            }
          : undefined,
    };
    const resp = await fetch(
      `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)/documents:runQuery`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ structuredQuery }),
      }
    );
    if (!resp.ok) throw new Error(`Firestore query(${collectionId}) failed: ${resp.status} ${await resp.text()}`);
    const rows = (await resp.json()) as { document?: { name: string; fields?: Record<string, unknown> } }[];
    return rows
      .filter((r) => r.document)
      .map((r) => {
        const doc = r.document as { name: string; fields?: Record<string, unknown> };
        const id = doc.name.split("/").pop() as string;
        return { path: `${collectionId}/${id}`, id, data: decodeDocFields(doc.fields) as T };
      });
  }

  /**
   * Read-modify-write transaction, mirroring `admin.firestore().runTransaction()`'s
   * call shape closely enough that ported logic barely changes: `tx.get(path)`
   * reads inside the transaction (so a concurrent writer can't slip in
   * unnoticed), `tx.set(path, data)` queues a write applied atomically on commit.
   */
  async runTransaction<T>(
    fn: (tx: { get(path: string): Promise<Record<string, unknown> | null>; set(path: string, data: Record<string, unknown>): void }) => Promise<T>
  ): Promise<T> {
    const token = await this.token();
    const beginResp = await fetch(`${this.base}:beginTransaction`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (!beginResp.ok) throw new Error(`Firestore beginTransaction failed: ${beginResp.status} ${await beginResp.text()}`);
    const { transaction } = (await beginResp.json()) as { transaction: string };

    const writes: Record<string, unknown>[] = [];
    const tx = {
      get: async (path: string): Promise<Record<string, unknown> | null> => {
        const resp = await fetch(
          `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)/documents:batchGet`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ documents: [`${this.base}/${path}`], transaction }),
          }
        );
        if (!resp.ok) throw new Error(`Firestore tx.get(${path}) failed: ${resp.status} ${await resp.text()}`);
        const [result] = (await resp.json()) as { found?: { fields?: Record<string, unknown> } }[];
        return result?.found ? decodeDocFields(result.found.fields) : null;
      },
      set: (path: string, data: Record<string, unknown>): void => {
        // Partial update (like Admin SDK's `.update()`/`.set(...,{merge:true})`):
        // an explicit field mask means only these fields are touched, so
        // sibling fields already on the document (name, price, etc.) survive.
        const fields = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, encodeValue(v)]));
        const fieldPaths = Object.keys(data).map((k) => ({ fieldPath: k }));
        writes.push({ update: { name: `${this.base}/${path}`, fields }, updateMask: { fieldPaths: fieldPaths.map((f) => f.fieldPath) } });
      },
    };

    const result = await fn(tx);

    const commitResp = await fetch(`${this.base}:commit`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ writes, transaction }),
    });
    if (!commitResp.ok) throw new Error(`Firestore transaction commit failed: ${commitResp.status} ${await commitResp.text()}`);

    return result;
  }
}
