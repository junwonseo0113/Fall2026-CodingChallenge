import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await register(name, email, password);
      navigate("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to create account");
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
          <h1 className="mb-1 text-center text-2xl font-semibold tracking-tight">Create an account</h1>
          <p className="mb-6 text-center text-sm text-[var(--muted-foreground)]">
            Start saving and sharing collections.
          </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
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
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Creating account..." : "Sign up"}
          </Button>
        </form>
          <p className="mt-6 text-center text-sm text-[var(--muted-foreground)]">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-[var(--primary)]">
              Log in
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
