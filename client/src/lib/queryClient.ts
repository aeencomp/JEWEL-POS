import { QueryClient, QueryFunction } from "@tanstack/react-query";

/** Turn `500: {"message":"..."}` from apiRequest into a readable string. */
export function parseApiErrorMessage(error: Error): string {
  const match = error.message.match(/^\d+:\s*([\s\S]*)$/);
  if (!match) return error.message;
  const body = match[1].trim();
  try {
    const json = JSON.parse(body);
    if (typeof json.message === "string") return json.message;
  } catch {
    /* not JSON */
  }
  return body.replace(/^\{?"?message"?:\s*"?/i, "").replace(/["}]+$/, "").trim() || error.message;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    if (res.status === 403) {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    }
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
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
    const res = await fetch(queryKey.join("/") as string, {
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
