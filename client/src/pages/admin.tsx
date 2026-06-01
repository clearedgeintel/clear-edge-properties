import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, Shield } from "lucide-react";

export default function Admin() {
  const { isAdmin, user, tenant } = useAuth();

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You need admin privileges to access this page.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Admin Dashboard</h1>
          <p className="text-slate-600">Manage your workspace and team</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Workspace / Tenant Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Workspace
              </CardTitle>
              <CardDescription>Your tenant configuration and plan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Name</span>
                <span className="text-sm font-medium text-slate-900">{tenant?.name ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Slug</span>
                <span className="text-sm font-medium text-slate-900">{tenant?.slug ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Subscription Tier</span>
                <Badge variant="outline">{tenant?.subscriptionTier ?? "free"}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Subscription Status</span>
                <Badge variant={tenant?.subscriptionStatus === "active" ? "default" : "secondary"}>
                  {tenant?.subscriptionStatus ?? "inactive"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">API Credits Remaining</span>
                <span className="text-sm font-medium text-slate-900">
                  {tenant?.apiCreditsRemaining ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Max Tracked Properties</span>
                <span className="text-sm font-medium text-slate-900">
                  {tenant?.maxTrackedProperties ?? 0}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Current Admin User */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Your Account
              </CardTitle>
              <CardDescription>Signed-in administrator details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Name</span>
                <span className="text-sm font-medium text-slate-900">{user?.fullName ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Email</span>
                <span className="text-sm font-medium text-slate-900">{user?.email ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Role</span>
                <Badge variant="outline" className="capitalize">{user?.role ?? "—"}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Team limits */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team
              </CardTitle>
              <CardDescription>Seat limits for this workspace</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Max Users</span>
                <span className="text-sm font-medium text-slate-900">{tenant?.maxUsers ?? 1}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
