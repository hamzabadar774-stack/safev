import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Settings, User, LogOut, ShieldCheck, Sun, Moon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { SettingsDialog } from "@/components/SettingsDialog";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useTheme } from "@/hooks/useTheme";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export function Header() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [now, setNow] = useState(new Date());
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const handleLogout = async () => {
    await signOut();
    toast.success("Signed out");
    navigate("/auth", { replace: true });
  };

  const initials = (user?.user_metadata?.full_name || user?.email || "A")
    .split(" ").map((s: string) => s[0]).join("").slice(0, 2).toUpperCase();

  return (
    <header className="border-b border-border bg-card sticky top-0 z-40">
      <div className="px-4 h-14 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <SidebarTrigger />
          <div className="hidden sm:flex flex-col leading-tight ml-1">
            <h1 className="text-sm font-semibold tracking-tight">Security Operations Center</h1>
            <p className="text-[10px] text-muted-foreground">Real-time intrusion detection &amp; response</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary border border-border">
            <ShieldCheck className="w-3.5 h-3.5 text-success" />
            <span className="text-xs text-muted-foreground">System status:</span>
            <span className="text-xs font-medium text-success">Operational</span>
          </div>
          <div className="hidden md:block text-xs text-muted-foreground font-mono">
            {now.toLocaleString("en-US", { hour12: false })}
          </div>

          <button className="relative p-2 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-destructive rounded-full" />
          </button>

          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Toggle theme"
            title="Toggle theme"
          >
            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-md hover:bg-secondary transition-colors">
                <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-xs font-semibold text-primary">
                  {initials}
                </div>
                <div className="hidden sm:flex flex-col items-start leading-tight">
                  <span className="text-xs font-medium">
                    {user?.user_metadata?.full_name || "Admin"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">Security Admin</span>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-medium truncate">
                    {user?.user_metadata?.full_name || "Signed in"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setSettingsOpen(true)}>
                <User className="w-4 h-4 mr-2" />
                Profile & Settings
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate("/settings")}>
                <Settings className="w-4 h-4 mr-2" />
                Preferences
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </header>
  );
}
