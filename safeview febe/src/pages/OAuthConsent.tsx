import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type SupabaseOAuth = {
  getAuthorizationDetails: (id: string) => Promise<{ data: any; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: { message: string } | null }>;
};
const oauth = (supabase.auth as unknown as { oauth: SupabaseOAuth }).oauth;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) return setError("Missing authorization_id");
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/auth?next=" + encodeURIComponent(next);
        return;
      }
      const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) return setError(error.message);
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error } = approve
      ? await oauth.approveAuthorization(authorizationId)
      : await oauth.denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      return setError(error.message);
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      return setError("No redirect returned by the authorization server.");
    }
    window.location.href = target;
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="p-6 max-w-md w-full">
          <h1 className="text-lg font-semibold mb-2">Authorization error</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
        </Card>
      </main>
    );
  }
  if (!details) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </main>
    );
  }

  const clientName = details.client?.name ?? details.client?.client_name ?? "an app";
  const redirectUri = details.client?.redirect_uris?.[0] ?? details.redirect_uri;
  const scopes: string[] = Array.isArray(details.scopes)
    ? details.scopes
    : (details.scope ?? "").split(" ").filter(Boolean);

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="p-8 max-w-md w-full">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-semibold tracking-tight">
            Connect {clientName} to SafeView
          </h1>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          This lets <span className="font-medium">{clientName}</span> use SafeView as you.
          It can call the SafeView SOC tools while you are signed in.
        </p>
        {redirectUri && (
          <p className="text-xs text-muted-foreground mb-4 break-all">
            Redirect: <span className="font-mono">{redirectUri}</span>
          </p>
        )}
        {scopes.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-medium mb-1">Requested access</p>
            <ul className="text-xs text-muted-foreground list-disc pl-5">
              {scopes.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        )}
        <p className="text-xs text-muted-foreground mb-6">
          This does not bypass SafeView's permissions or backend policies.
        </p>
        <div className="flex gap-2">
          <Button className="flex-1" disabled={busy} onClick={() => decide(true)}>
            Approve
          </Button>
          <Button variant="outline" className="flex-1" disabled={busy} onClick={() => decide(false)}>
            Cancel connection
          </Button>
        </div>
      </Card>
    </main>
  );
}