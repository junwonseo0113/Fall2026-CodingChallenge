import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to log in");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[image:var(--gradient-primary)] shadow-[var(--shadow-glow)]">
            <Sparkles className="h-6 w-6 text-white" />
          </span>
        </div>
        <Card className="p-8 shadow-[var(--shadow-lg)]">
          <h1 className="mb-1 text-center text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mb-6 text-center text-sm text-[var(--muted-foreground)]">
            Log in to see your saved collections.
          </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Logging in..." : "Log in"}
          </Button>
        </form>
          <p className="mt-6 text-center text-sm text-[var(--muted-foreground)]">
            Don't have an account?{" "}
            <Link to="/register" className="font-medium text-[var(--primary)]">
              Sign up
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
