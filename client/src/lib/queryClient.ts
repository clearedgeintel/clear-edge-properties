import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { auth } from "./auth";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Attach the Supabase access token so the tenant-aware backend (requireAuth) can
// resolve the user/tenant. Falls back to no header if there is no session.
async function authHeaders(): Promise<Record<string, string>> {
  try {
    const session = await auth.getSession();
    const token = session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = { ...(await authHeaders()) };
  if (data) headers["Content-Type"] = "application/json";

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // A plain-object second key element is treated as query-string params, e.g.
    // ['/api/properties', { sortBy: 'score-desc', limit: 20 }].
    let url = queryKey[0] as string;
    const params = queryKey[1];
    if (params && typeof params === "object" && !Array.isArray(params)) {
      const qs = new URLSearchParams();
      for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
        if (value !== undefined && value !== null && value !== "") qs.append(key, String(value));
      }
      const query = qs.toString();
      if (query) url += (url.includes("?") ? "&" : "?") + query;
    }

    const res = await fetch(url, {
      headers: await authHeaders(),
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
