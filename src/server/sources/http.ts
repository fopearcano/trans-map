/**
 * Resilient HTTP client for external sources: timeouts, bounded retries with
 * exponential backoff (5xx, 429, network errors), Retry-After support and
 * typed errors so callers can degrade gracefully.
 */
export const SOURCE_USER_AGENT = "TRANS-MAP/0.1 (research atlas; https://github.com/fopearcano/trans-map)";

export class SourceError extends Error {
  constructor(
    message: string,
    readonly source: string,
    readonly url: string,
  ) {
    super(message);
    this.name = "SourceError";
  }
}
export class SourceTimeoutError extends SourceError {
  name = "SourceTimeoutError";
}
export class SourceRateLimitError extends SourceError {
  name = "SourceRateLimitError";
}
export class SourceHttpError extends SourceError {
  name = "SourceHttpError";
  status = 0;
}
export class SourceParseError extends SourceError {
  name = "SourceParseError";
}
export class SourceNotFoundError extends SourceError {
  name = "SourceNotFoundError";
}

export interface FetchOptions {
  source: string;
  timeoutMs?: number;
  retries?: number;
  baseDelayMs?: number;
  headers?: Record<string, string>;
  fetchImpl?: typeof fetch;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function fetchWithRetry(url: string, opts: FetchOptions): Promise<Response> {
  const { source, timeoutMs = 10_000, retries = 3, baseDelayMs = 500, headers = {}, fetchImpl = fetch } = opts;
  let lastError: SourceError | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await sleep(baseDelayMs * 2 ** (attempt - 1));
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetchImpl(url, { headers: { "User-Agent": SOURCE_USER_AGENT, Accept: "application/json", ...headers }, signal: controller.signal });
      if (res.ok) return res;
      if (res.status === 404) throw new SourceNotFoundError(`${source}: risorsa non trovata`, source, url);
      if (res.status === 429) {
        lastError = new SourceRateLimitError(`${source}: limite di richieste superato`, source, url);
        const retryAfter = Number(res.headers.get("retry-after"));
        if (Number.isFinite(retryAfter) && retryAfter > 0 && attempt < retries) await sleep(Math.min(retryAfter * 1000, 30_000));
        continue;
      }
      const err = new SourceHttpError(`${source}: HTTP ${res.status}`, source, url);
      err.status = res.status;
      if (res.status >= 500) {
        lastError = err;
        continue;
      }
      throw err;
    } catch (e) {
      if (e instanceof SourceError && !(e instanceof SourceRateLimitError)) {
        if (e instanceof SourceHttpError && e.status >= 500) {
          lastError = e;
          continue;
        }
        throw e;
      }
      if ((e as Error).name === "AbortError") lastError = new SourceTimeoutError(`${source}: tempo scaduto dopo ${timeoutMs} ms`, source, url);
      else if (!(e instanceof SourceError)) lastError = new SourceError(`${source}: errore di rete (${(e as Error).message})`, source, url);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError ?? new SourceError(`${source}: richiesta fallita`, source, url);
}

export async function fetchJson<T = unknown>(url: string, opts: FetchOptions): Promise<T> {
  const res = await fetchWithRetry(url, opts);
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new SourceParseError(`${opts.source}: risposta non JSON`, opts.source, url);
  }
}

export async function fetchText(url: string, opts: FetchOptions): Promise<string> {
  const res = await fetchWithRetry(url, { ...opts, headers: { Accept: "text/csv, text/plain, */*", ...opts.headers } });
  return res.text();
}
