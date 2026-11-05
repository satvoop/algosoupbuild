/** Browser-side JSON call that turns an API error body into a thrown message. */
export async function callApi<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const body: unknown = await response.json().catch((error: unknown) => {
    if (error instanceof SyntaxError) return {};
    throw error;
  });
  if (response.status === 401 && !url.endsWith("/api/login")) {
    window.location.assign(new URL("/login", window.location.origin).href);
  }
  if (!response.ok) {
    const message = (body as { error?: unknown }).error;
    throw new Error(typeof message === "string" ? message : `Request failed (${response.status})`);
  }
  return body as T;
}

export function formatPrice(price: number | null): string {
  return price === null || Number.isNaN(price) ? "-" : `${Math.round(price * 1000) / 10}%`;
}

export function formatVolume(volume: number | null): string {
  if (volume === null) return "-";
  return `$${(volume / 1_000_000).toFixed(1)}M`;
}
