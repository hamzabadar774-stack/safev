import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Mail, Calendar, LogOut, Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
};

export const SettingsDialog = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    if (!open || !user) return;
    setLoading(true);
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          toast.error("Failed to load profile");
        } else if (data) {
          setProfile(data as Profile);
          setFullName(data.full_name || "");
        }
        setLoading(false);
      });
  }, [open, user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim() })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Failed to save");
      return;
    }
    toast.success("Profile updated");
    setProfile((p) => (p ? { ...p, full_name: fullName.trim() } : p));
  };

  const handleLogout = async () => {
    await signOut();
    onOpenChange(false);
    toast.success("Logged out");
    navigate("/auth", { replace: true });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Account Settings</DialogTitle>
          <DialogDescription>Manage your personal information and session.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                <User className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold truncate">
                  {profile?.full_name || "Unnamed user"}
                </p>
                <p className="text-xs text-muted-foreground font-mono truncate">
                  {profile?.email}
                </p>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="profile-name">Full name</Label>
                <Input
                  id="profile-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your name"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Mail className="w-3 h-3" /> Email
                </Label>
                <p className="text-sm font-mono">{profile?.email}</p>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" /> Member since
                </Label>
                <p className="text-sm font-mono">
                  {profile?.created_at
                    ? new Date(profile.created_at).toLocaleDateString()
                    : "—"}
                </p>
              </div>
            </div>

            <Separator />

            <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2">
              <Button
                variant="outline"
                onClick={handleLogout}
                className="text-destructive hover:text-destructive"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Log out
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save changes
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};