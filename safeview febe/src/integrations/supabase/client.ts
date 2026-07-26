// SafeView backend compatibility shim.
//
// The original project used Supabase directly. The backend was rebuilt as a
// self-hosted Node/Express + SQLite + Socket.IO service (see /backend). This
// file exposes the small subset of the `supabase-js` surface that the rest of
// the frontend consumes, transparently forwarding calls to the new backend.
//
// Supported surface:
//   supabase.auth.signUp / signInWithPassword / signOut / getSession
//                / onAuthStateChange / updateUser
//   supabase.from(table).select(cols, {count, head})
//                       .insert(row).update(row).delete()
//                       .eq(col, val).order(col, {ascending}).limit(n)
//                       .single() / .maybeSingle() / thenable
//   supabase.functions.invoke(name, { body })
//   supabase.channel(name).on("postgres_changes", filter, cb).subscribe()
//                          .unsubscribe()
//
// If a call is not covered here, add it — do not reintroduce a real Supabase
// client.

import { io, type Socket } from "socket.io-client";

const API_URL: string =
  (import.meta as any).env?.VITE_API_URL || "http://localhost:4000";

const TOKEN_KEY = "safeview.token";
const USER_KEY = "safeview.user";

type User = { id: string; email: string; user_metadata?: Record<string, any> };
type Session = { access_token: string; user: User } | null;

function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
function setToken(tok: string | null) {
  try {
    if (tok) localStorage.setItem(TOKEN_KEY, tok);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {}
}
function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function setStoredUser(u: User | null) {
  try {
    if (u) localStorage.setItem(USER_KEY, JSON.stringify(u));
    else localStorage.removeItem(USER_KEY);
  } catch {}
}

async function apiFetch(path: string, opts: RequestInit = {}) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((opts.headers as Record<string, string>) || {}),
  };
  const tok = getToken();
  if (tok) headers.Authorization = `Bearer ${tok}`;
  const res = await fetch(`${API_URL}${path}`, { ...opts, headers });
  const text = await res.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!res.ok) {
    const msg = (body && (body.error || body.message)) || res.statusText;
    throw new Error(msg);
  }
  return body;
}

/* -------------------- Auth listeners -------------------- */
type AuthListener = (event: string, session: Session) => void;
const authListeners = new Set<AuthListener>();

function emitAuth(event: string) {
  const session = currentSession();
  authListeners.forEach((cb) => {
    try { cb(event, session); } catch (e) { console.error(e); }
  });
}

function currentSession(): Session {
  const tok = getToken();
  const user = getStoredUser();
  return tok && user ? { access_token: tok, user } : null;
}

/* -------------------- Query builder -------------------- */

type Filter = { op: string; column: string; value: any };
type Order = { column: string; ascending: boolean };

class QueryBuilder<T = any> implements PromiseLike<any> {
  private _method: "select" | "insert" | "update" | "delete" = "select";
  private _select = "*";
  private _filters: Filter[] = [];
  private _order: Order | null = null;
  private _limit: number | null = null;
  private _single: "one" | "maybe" | null = null;
  private _payload: any = null;
  private _count: boolean = false;
  private _head: boolean = false;

  constructor(private table: string) {}

  select(cols = "*", opts?: { count?: string; head?: boolean }) {
    this._method = "select";
    this._select = cols;
    if (opts?.count) this._count = true;
    if (opts?.head) this._head = true;
    return this;
  }
  insert(row: any) { this._method = "insert"; this._payload = row; return this; }
  update(row: any) { this._method = "update"; this._payload = row; return this; }
  delete() { this._method = "delete"; return this; }

  eq(column: string, value: any) { this._filters.push({ op: "eq", column, value }); return this; }
  neq(column: string, value: any) { this._filters.push({ op: "neq", column, value }); return this; }
  gt(column: string, value: any) { this._filters.push({ op: "gt", column, value }); return this; }
  lt(column: string, value: any) { this._filters.push({ op: "lt", column, value }); return this; }
  gte(column: string, value: any) { this._filters.push({ op: "gte", column, value }); return this; }
  lte(column: string, value: any) { this._filters.push({ op: "lte", column, value }); return this; }
  order(column: string, opts?: { ascending?: boolean }) {
    this._order = { column, ascending: opts?.ascending !== false };
    return this;
  }
  limit(n: number) { this._limit = n; return this; }
  single() { this._single = "one"; return this._exec(); }
  maybeSingle() { this._single = "maybe"; return this._exec(); }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: (value: any) => TResult1 | PromiseLike<TResult1>,
    onrejected?: (reason: any) => TResult2 | PromiseLike<TResult2>,
  ): Promise<TResult1 | TResult2> {
    return this._exec().then(onfulfilled, onrejected);
  }

  private async _exec(): Promise<{ data: any; error: any; count?: number }> {
    try {
      const body = {
        method: this._method,
        select: this._select,
        filters: this._filters,
        order: this._order,
        limit: this._limit,
        single: this._single,
        payload: this._payload,
        count: this._count,
        head: this._head,
      };
      const res = await apiFetch(`/db/${encodeURIComponent(this.table)}`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      return { data: res.data, error: null, count: res.count };
    } catch (e: any) {
      return { data: null, error: { message: e?.message || String(e) } };
    }
  }
}

/* -------------------- Realtime shim (Socket.IO) -------------------- */

let socket: Socket | null = null;
function getSocket(): Socket {
  if (!socket) {
    socket = io(API_URL, {
      transports: ["websocket", "polling"],
      auth: () => ({ token: getToken() || undefined }),
    });
  }
  return socket;
}

class Channel {
  private handlers: Array<{
    table: string;
    event: string;
    cb: (payload: any) => void;
    listener: (payload: any) => void;
  }> = [];
  constructor(public name: string) {}
  on(_type: string, filter: { event: string; schema?: string; table: string }, cb: (payload: any) => void) {
    const s = getSocket();
    const eventName = `db:${filter.table}`;
    const listener = (payload: any) => {
      if (filter.event === "*" || filter.event === payload.eventType) cb(payload);
    };
    s.on(eventName, listener);
    this.handlers.push({ table: filter.table, event: filter.event, cb, listener });
    return this;
  }
  subscribe(cb?: (status: string) => void) {
    cb?.("SUBSCRIBED");
    return this;
  }
  unsubscribe() {
    if (!socket) return Promise.resolve("ok");
    for (const h of this.handlers) socket.off(`db:${h.table}`, h.listener);
    this.handlers = [];
    return Promise.resolve("ok");
  }
}

/* -------------------- The exported supabase object -------------------- */

export const supabase = {
  auth: {
    async signUp(opts: { email: string; password: string; options?: any }) {
      try {
        const res = await apiFetch("/auth/register", {
          method: "POST",
          body: JSON.stringify({
            email: opts.email,
            password: opts.password,
            full_name: opts.options?.data?.full_name,
          }),
        });
        setToken(res.token);
        setStoredUser(res.user);
        emitAuth("SIGNED_IN");
        return { data: { user: res.user, session: currentSession() }, error: null };
      } catch (e: any) {
        return { data: { user: null, session: null }, error: { message: e.message } };
      }
    },
    async signInWithPassword(opts: { email: string; password: string }) {
      try {
        const res = await apiFetch("/auth/login", {
          method: "POST",
          body: JSON.stringify(opts),
        });
        setToken(res.token);
        setStoredUser(res.user);
        emitAuth("SIGNED_IN");
        return { data: { user: res.user, session: currentSession() }, error: null };
      } catch (e: any) {
        return { data: { user: null, session: null }, error: { message: e.message } };
      }
    },
    async signOut() {
      setToken(null);
      setStoredUser(null);
      emitAuth("SIGNED_OUT");
      return { error: null };
    },
    async getSession() {
      return { data: { session: currentSession() }, error: null };
    },
    async getUser() {
      const s = currentSession();
      return { data: { user: s?.user || null }, error: null };
    },
    onAuthStateChange(cb: AuthListener) {
      authListeners.add(cb);
      return { data: { subscription: { unsubscribe: () => authListeners.delete(cb) } } };
    },
    async updateUser(opts: { password?: string; data?: any }) {
      try {
        const res = await apiFetch("/auth/update", {
          method: "PATCH",
          body: JSON.stringify(opts),
        });
        if (res.user) setStoredUser(res.user);
        return { data: { user: res.user }, error: null };
      } catch (e: any) {
        return { data: { user: null }, error: { message: e.message } };
      }
    },
  },
  from<T = any>(table: string) { return new QueryBuilder<T>(table); },
  channel(name: string) { return new Channel(name); },
  removeChannel(ch: Channel) { return ch.unsubscribe(); },
  functions: {
    async invoke(name: string, opts?: { body?: any }) {
      try {
        const res = await apiFetch(`/functions/${encodeURIComponent(name)}`, {
          method: "POST",
          body: JSON.stringify(opts?.body ?? {}),
        });
        return { data: res, error: null };
      } catch (e: any) {
        return { data: null, error: { message: e.message } };
      }
    },
  },
};

export type { User, Session };
