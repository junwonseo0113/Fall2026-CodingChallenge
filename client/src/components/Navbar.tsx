import { Link, useNavigate } from "react-router-dom";
import { LogOut, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const initial = user?.name?.[0]?.toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/75 shadow-[var(--shadow-sm)] backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2.5 text-lg font-semibold tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[image:var(--gradient-primary)] shadow-[var(--shadow-glow)]">
            <Sparkles className="h-4 w-4 text-white" />
          </span>
          Pinboard
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          {user && (
            <>
              <span className="hidden items-center gap-2 sm:flex">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[image:var(--gradient-primary)] text-xs font-semibold text-white">
                  {initial}
                </span>
                <span className="text-sm text-[var(--muted-foreground)]">{user.name}</span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
              >
                <LogOut className="h-4 w-4" />
                Log out
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
