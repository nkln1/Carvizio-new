import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { auth } from "./firebase";
import { getCsrfToken, updateCsrfToken } from "./csrfToken";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
  // Obținem tokenul CSRF curent pentru cereri non-GET
  const csrfToken = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method.toUpperCase()) 
    ? getCsrfToken() 
    : null;

  const res = await fetch(url, {
    method,
    headers: {
      ...(data ? { "Content-Type": "application/json" } : {}),
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  // Actualizăm tokenul CSRF din răspuns (dacă există)
  updateCsrfToken(res);

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;

    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
      headers: {
        ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });

    // Actualizăm tokenul CSRF din răspuns pentru cereri viitoare
    updateCsrfToken(res);

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
      refetchOnWindowFocus: true, // Changed to true to get updates
      staleTime: 0, // Data is considered stale immediately
      gcTime: 0, // Disable garbage collection time (previously cacheTime)
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});