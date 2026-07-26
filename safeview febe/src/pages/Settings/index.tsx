import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  User as UserIcon, Shield, Bell, Monitor, Camera, FileText,
  Save, LogOut, Download, Trash2, KeyRound, Smartphone, Mail,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { useSettings } from "@/services/settingsStore";
import { exportLogsCsv } from "@/services/alertsApi";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [settings, update] = useSettings();
  const [profile, setProfile] = useState({
    full_name: "", email: user?.email || "", username: settings.profile.username,
    phone: settings.profile.phone, organization: settings.profile.organization,
    role: settings.profile.role,
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data) setProfile((p) => ({ ...p, full_name: data.full_name || "", email: data.email || p.email }));
      });
  }, [user]);

  const handleProfileSave = async () => {
    if (!user) return;
    setSavingProfile(true);
    const { error } = await supabase.from("profiles")
      .update({ full_name: profile.full_name.trim() }).eq("id", user.id);
    update({ profile: {
      username: profile.username, phone: profile.phone,
      organization: profile.organization, role: profile.role,
    }});
    setSavingProfile(false);
    if (error) toast.error("Could not save profile");
    else toast.success("Profile saved");
  };

  const handlePasswordChange = async () => {
    if (!pwd.next || pwd.next !== pwd.confirm) {
      toast.error("Passwords don't match");
      return;
    }
    if (pwd.next.length < 8) { toast.error("Use at least 8 characters"); return; }
    const { error } = await supabase.auth.updateUser({ password: pwd.next });
    if (error) toast.error(error.message);
    else { toast.success("Password updated"); setPwd({ current: "", next: "", confirm: "" }); }
  };

  const handleLogout = async () => {
    await signOut();
    toast.success("Signed out");
    navigate("/auth", { replace: true });
  };

  const exportSettings = () => {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `safeview-settings-${new Date().toISOString().slice(0,10)}.json`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("Settings exported");
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Settings</h2>
        <p className="text-sm text-muted-foreground">
          Manage your profile, security, notifications and platform preferences.
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="grid grid-cols-3 lg:grid-cols-6 w-full">
          <TabsTrigger value="profile"><UserIcon className="w-3.5 h-3.5 mr-1.5" />Profile</TabsTrigger>
          <TabsTrigger value="security"><Shield className="w-3.5 h-3.5 mr-1.5" />Security</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="w-3.5 h-3.5 mr-1.5" />Alerts</TabsTrigger>
          <TabsTrigger value="system"><Monitor className="w-3.5 h-3.5 mr-1.5" />System</TabsTrigger>
          <TabsTrigger value="cctv"><Camera className="w-3.5 h-3.5 mr-1.5" />CCTV</TabsTrigger>
          <TabsTrigger value="audit"><FileText className="w-3.5 h-3.5 mr-1.5" />Audit</TabsTrigger>
        </TabsList>

        {/* PROFILE */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Personal and organizational information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Full name"><Input value={profile.full_name} onChange={(e) => setProfile({...profile, full_name: e.target.value})} /></Field>
                <Field label="Username"><Input value={profile.username} onChange={(e) => setProfile({...profile, username: e.target.value})} placeholder="e.g. analyst.j" /></Field>
                <Field label="Email"><Input value={profile.email} disabled /></Field>
                <Field label="Phone"><Input value={profile.phone} onChange={(e) => setProfile({...profile, phone: e.target.value})} placeholder="+1 555 0100" /></Field>
                <Field label="Organization"><Input value={profile.organization} onChange={(e) => setProfile({...profile, organization: e.target.value})} /></Field>
                <Field label="Role / Designation"><Input value={profile.role} onChange={(e) => setProfile({...profile, role: e.target.value})} /></Field>
              </div>
              <Separator />
              <div className="flex justify-between">
                <Button variant="outline" onClick={handleLogout} className="text-destructive hover:text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />Sign out
                </Button>
                <Button onClick={handleProfileSave} disabled={savingProfile}>
                  <Save className="w-4 h-4 mr-2" />Save profile
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SECURITY */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><KeyRound className="w-4 h-4" />Change password</CardTitle>
              <CardDescription>Choose a strong password (min 8 characters).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Field label="New password"><Input type="password" value={pwd.next} onChange={(e) => setPwd({...pwd, next: e.target.value})} /></Field>
              <Field label="Confirm password"><Input type="password" value={pwd.confirm} onChange={(e) => setPwd({...pwd, confirm: e.target.value})} /></Field>
              <Button onClick={handlePasswordChange}>Update password</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Authentication & Sessions</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Row label="Two-factor authentication" hint="Require a code at sign-in (SMS / authenticator app).">
                <Switch checked={settings.security.twoFactor}
                  onCheckedChange={(v) => update({ security: { ...settings.security, twoFactor: v } })} />
              </Row>
              <Row label="Session timeout" hint="Automatically sign out after inactivity.">
                <Select value={String(settings.security.sessionTimeout)}
                  onValueChange={(v) => update({ security: { ...settings.security, sessionTimeout: Number(v) } })}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[15,30,60,120,240].map(n => <SelectItem key={n} value={String(n)}>{n} min</SelectItem>)}
                  </SelectContent>
                </Select>
              </Row>
              <Separator />
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex justify-between"><span>Current session</span><span className="font-mono">{navigator.userAgent.split(") ")[0].split("(")[1] || "Browser"}</span></div>
                <div className="flex justify-between"><span>Last login</span><span className="font-mono">{new Date((user as any)?.last_sign_in_at || Date.now()).toLocaleString()}</span></div>
                <div className="flex justify-between"><span>Active sessions</span><span className="font-mono">1</span></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* NOTIFICATIONS */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader><CardTitle>Notification preferences</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Row label="Email alerts" hint="Send threat alerts to your email."
                icon={<Mail className="w-4 h-4 text-muted-foreground" />}>
                <Switch checked={settings.notifications.email}
                  onCheckedChange={(v) => update({ notifications: { ...settings.notifications, email: v } })} />
              </Row>
              <Row label="SMS alerts" hint="Critical incidents only."
                icon={<Smartphone className="w-4 h-4 text-muted-foreground" />}>
                <Switch checked={settings.notifications.sms}
                  onCheckedChange={(v) => update({ notifications: { ...settings.notifications, sms: v } })} />
              </Row>
              <Row label="Browser push notifications">
                <Switch checked={settings.notifications.push}
                  onCheckedChange={(v) => update({ notifications: { ...settings.notifications, push: v } })} />
              </Row>
              <Row label="Critical alerts only" hint="Mute medium and low severity events.">
                <Switch checked={settings.notifications.criticalOnly}
                  onCheckedChange={(v) => update({ notifications: { ...settings.notifications, criticalOnly: v } })} />
              </Row>
              <Row label="Alert sound">
                <Switch checked={settings.notifications.sound}
                  onCheckedChange={(v) => update({ notifications: { ...settings.notifications, sound: v } })} />
              </Row>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SYSTEM */}
        <TabsContent value="system">
          <Card>
            <CardHeader><CardTitle>System preferences</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Row label="Theme" hint="Switch between light and dark interface.">
                <Select value={theme} onValueChange={setTheme}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dark">Dark (SOC)</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                  </SelectContent>
                </Select>
              </Row>
              <Row label="Dashboard refresh interval">
                <Select value={String(settings.system.refreshInterval)}
                  onValueChange={(v) => update({ system: { ...settings.system, refreshInterval: Number(v) } })}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[5,10,15,30,60].map(n => <SelectItem key={n} value={String(n)}>{n} sec</SelectItem>)}
                  </SelectContent>
                </Select>
              </Row>
              <Row label="Timezone">
                <Select value={settings.system.timezone}
                  onValueChange={(v) => update({ system: { ...settings.system, timezone: v } })}>
                  <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["UTC","America/New_York","America/Los_Angeles","Europe/London","Europe/Berlin","Asia/Karachi","Asia/Singapore","Asia/Tokyo"].map(z => <SelectItem key={z} value={z}>{z}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Row>
              <Row label="Date format">
                <Select value={settings.system.dateFormat}
                  onValueChange={(v: any) => update({ system: { ...settings.system, dateFormat: v } })}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ISO">ISO 8601</SelectItem>
                    <SelectItem value="US">MM/DD/YYYY</SelectItem>
                    <SelectItem value="EU">DD/MM/YYYY</SelectItem>
                  </SelectContent>
                </Select>
              </Row>
              <Row label="Language">
                <Select value={settings.system.language}
                  onValueChange={(v) => update({ system: { ...settings.system, language: v } })}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ur">اردو</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                  </SelectContent>
                </Select>
              </Row>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CCTV */}
        <TabsContent value="cctv">
          <Card>
            <CardHeader><CardTitle>CCTV monitoring preferences</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Row label="Auto reconnect cameras" hint="Try to recover lost streams automatically.">
                <Switch checked={settings.cctv.autoReconnect}
                  onCheckedChange={(v) => update({ cctv: { ...settings.cctv, autoReconnect: v } })} />
              </Row>
              <Row label="Stream quality">
                <Select value={settings.cctv.streamQuality}
                  onValueChange={(v: any) => update({ cctv: { ...settings.cctv, streamQuality: v } })}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low (480p)</SelectItem>
                    <SelectItem value="medium">Medium (720p)</SelectItem>
                    <SelectItem value="high">High (1080p)</SelectItem>
                    <SelectItem value="ultra">Ultra (4K)</SelectItem>
                  </SelectContent>
                </Select>
              </Row>
              <Row label="Auto-record incidents" hint="Save short clips around detected threats.">
                <Switch checked={settings.cctv.autoRecord}
                  onCheckedChange={(v) => update({ cctv: { ...settings.cctv, autoRecord: v } })} />
              </Row>
              <Row label="Alert sensitivity">
                <Select value={settings.cctv.sensitivity}
                  onValueChange={(v: any) => update({ cctv: { ...settings.cctv, sensitivity: v } })}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </Row>
              <Row label="Severity filter">
                <Select value={settings.cctv.severityFilter}
                  onValueChange={(v: any) => update({ cctv: { ...settings.cctv, severityFilter: v } })}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All severities</SelectItem>
                    <SelectItem value="medium+">Medium and above</SelectItem>
                    <SelectItem value="high+">High and above</SelectItem>
                    <SelectItem value="critical">Critical only</SelectItem>
                  </SelectContent>
                </Select>
              </Row>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AUDIT */}
        <TabsContent value="audit">
          <Card>
            <CardHeader><CardTitle>Audit & data</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => exportLogsCsv().then(() => toast.success("Logs exported"))}>
                  <Download className="w-4 h-4 mr-2" />Download audit logs (CSV)
                </Button>
                <Button variant="outline" onClick={exportSettings}>
                  <Download className="w-4 h-4 mr-2" />Export settings (JSON)
                </Button>
                <Button variant="outline" onClick={() => {
                  localStorage.removeItem("safeview-settings-v1");
                  toast.success("Local session history cleared. Reload to apply.");
                }} className="text-destructive hover:text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" />Clear session history
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Audit logs are immutable and retained per your organization's policy.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Row({ label, hint, icon, children }: { label: string; hint?: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <div className="min-w-0 flex items-start gap-2">
        {icon}
        <div>
          <div className="text-sm font-medium">{label}</div>
          {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
