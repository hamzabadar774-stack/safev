import { useState, useEffect } from "react";
import { useNavigate, Navigate, useSearchParams } from "react-router-dom";
import { Loader2, Shield, Activity, Camera, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

const Auth = () => {
  const navigate = useNavigate();
  const { user, isReady } = useAuth();
  const [params] = useSearchParams();
  const rawNext = params.get("next");
  const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    if (isReady && user) navigate(next, { replace: true });
  }, [isReady, user, navigate, next]);

  if (isReady && user) return <Navigate to={next} replace />;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) return toast.error(error.message || "Invalid email or password");
    toast.success("Welcome back");
    navigate(next, { replace: true });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("Password must be at least 6 characters");
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}${next}`,
        data: { full_name: fullName.trim() },
      },
    });
    setLoading(false);
    if (error) {
      if (error.message.toLowerCase().includes("already")) {
        toast.error("This email is already registered. Try signing in.");
      } else {
        toast.error(error.message);
      }
      return;
    }
    toast.success("Account created");
    navigate(next, { replace: true });
  };

  const features = [
    { icon: Activity, title: "Real-time Threat Monitoring", desc: "Continuous packet inspection across your network." },
    { icon: Shield, title: "AI-Based Intrusion Detection", desc: "Hybrid ML + heuristic detection of anomalies." },
    { icon: Camera, title: "CCTV Device Security", desc: "Protect RTSP/ONVIF cameras from exploits." },
  ];

  return (
    <div className="min-h-screen bg-background grid lg:grid-cols-2">
      {/* Left: Branding */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-card border-r border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center">
            <Eye className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">SafeView</h1>
            <p className="text-xs text-muted-foreground">Security Operations Platform</p>
          </div>
        </div>

        <div className="max-w-md">
          <h2 className="text-3xl font-bold tracking-tight mb-3">
            CCTV Intrusion Detection
          </h2>
          <p className="text-muted-foreground mb-8">
            Monitor, detect, and respond to threats targeting your surveillance infrastructure in real time.
          </p>

          <ul className="space-y-5">
            {features.map((f) => (
              <li key={f.title} className="flex gap-3">
                <div className="w-9 h-9 rounded-md bg-secondary border border-border flex items-center justify-center shrink-0">
                  <f.icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{f.title}</p>
                  <p className="text-xs text-muted-foreground">{f.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          End-to-end encrypted
        </div>
      </div>

      {/* Right: Auth card */}
      <div className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center">
              <Eye className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">SafeView</h1>
              <p className="text-xs text-muted-foreground">Security Operations Platform</p>
            </div>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight mb-1">
            {mode === "signin" ? "Sign in to your account" : "Create an account"}
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            {mode === "signin" ? "Access your security dashboard." : "Start monitoring in minutes."}
          </p>

          <Card className="p-6 border-border bg-card">
            <Tabs value={mode} onValueChange={(v) => setMode(v as "signin" | "signup")}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Work email</Label>
                    <Input id="signin-email" type="email" autoComplete="email" required
                      value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <Input id="signin-password" type="password" autoComplete="current-password" required
                      value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Sign in
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full name</Label>
                    <Input id="signup-name" type="text" autoComplete="name"
                      value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Work email</Label>
                    <Input id="signup-email" type="email" autoComplete="email" required
                      value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input id="signup-password" type="password" autoComplete="new-password" required minLength={6}
                      value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Create account
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </Card>

          <p className="text-xs text-muted-foreground text-center mt-6">
            Protected by enterprise-grade authentication.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
