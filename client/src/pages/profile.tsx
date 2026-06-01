import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { User, Mail, Calendar, CreditCard, Shield, ExternalLink } from "lucide-react";

export default function Profile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery<any>({
    queryKey: ["/api/auth/user"],
  });

  const [username, setUsername] = useState("");

  // Initialize form when user data loads
  useState(() => {
    if (user?.username) setUsername(user.username);
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-200 rounded w-48" />
            <div className="h-64 bg-slate-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Profile Settings</h1>
          <p className="text-slate-500 mt-1">Manage your account information.</p>
        </div>

        {/* Account Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5" />
              Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-slate-400" />
                <span className="text-sm text-slate-600">{user?.email || "—"}</span>
              </div>
              <p className="text-xs text-slate-400">Email is managed through Supabase authentication.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Display Name</Label>
              <Input
                id="username"
                value={username || user?.username || ""}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Your display name"
              />
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <div>
                <Badge variant={user?.role === "ADMIN" ? "default" : "secondary"}>
                  <Shield className="h-3 w-3 mr-1" />
                  {user?.role || "USER"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subscription */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Subscription
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Status</p>
                <Badge
                  className={
                    user?.subscriptionStatus === "active"
                      ? "bg-green-100 text-green-800"
                      : "bg-slate-100 text-slate-600"
                  }
                >
                  {user?.subscriptionStatus || "inactive"}
                </Badge>
              </div>
              {user?.subscriptionTier && (
                <div>
                  <p className="text-sm font-medium">Tier</p>
                  <p className="text-sm text-slate-600 capitalize">{user.subscriptionTier}</p>
                </div>
              )}
            </div>

            {user?.createdAt && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Calendar className="h-4 w-4" />
                <span>
                  Member since{" "}
                  {new Date(user.createdAt).toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
            )}

            <Separator />

            <div className="flex gap-2">
              {user?.subscriptionStatus !== "active" && (
                <Button asChild size="sm">
                  <a href="/subscribe">Upgrade Plan</a>
                </Button>
              )}
              {user?.stripeCustomerId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      const res = await apiRequest("POST", "/api/billing-portal");
                      const { url } = await res.json();
                      window.open(url, "_blank");
                    } catch {
                      window.location.href = "/pricing";
                    }
                  }}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Manage Billing
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
