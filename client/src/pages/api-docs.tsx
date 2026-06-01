import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Code, Key, Zap, Shield } from "lucide-react";

interface Endpoint {
  method: "GET" | "POST";
  path: string;
  description: string;
  params?: string;
}

const ENDPOINTS: Endpoint[] = [
  {
    method: "GET",
    path: "/api/v1/properties",
    description: "List scored properties with optional filters",
    params: "?city=Austin&minScore=70&limit=20&offset=0",
  },
  {
    method: "GET",
    path: "/api/v1/properties/:id",
    description: "Get a single property by ID with full details",
  },
  {
    method: "POST",
    path: "/api/v1/ai/analyze",
    description: "Generate AI investment analysis for a property",
    params: 'Body: { "propertyId": 123 }',
  },
  {
    method: "GET",
    path: "/api/v1/market-data",
    description: "Get demographic and market data for a ZIP code",
    params: "?zipCode=90210",
  },
];

const TIER_RATES = [
  { tier: "Free", requests: "50/hr", features: "Read-only property data" },
  { tier: "Basic", requests: "200/hr", features: "Properties + AI analysis" },
  { tier: "Pro", requests: "500/hr", features: "Full API access" },
  { tier: "Enterprise", requests: "2,000/hr", features: "Full access + priority support" },
];

function MethodBadge({ method }: { method: string }) {
  return (
    <Badge className={method === "GET" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"}>
      {method}
    </Badge>
  );
}

export default function ApiDocs() {
  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">API Documentation</h1>
          <p className="text-slate-500 mt-1">
            Integrate RealDealTracker property data into your applications.
          </p>
        </div>

        <Tabs defaultValue="endpoints">
          <TabsList>
            <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
            <TabsTrigger value="auth">Authentication</TabsTrigger>
            <TabsTrigger value="limits">Rate Limits</TabsTrigger>
          </TabsList>

          {/* Endpoints Tab */}
          <TabsContent value="endpoints" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  Base URL
                </CardTitle>
              </CardHeader>
              <CardContent>
                <code className="text-sm bg-slate-100 px-3 py-2 rounded block">
                  https://your-domain.com/api/v1
                </code>
              </CardContent>
            </Card>

            {ENDPOINTS.map((ep) => (
              <Card key={ep.path}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <MethodBadge method={ep.method} />
                    <div className="flex-1 min-w-0">
                      <code className="text-sm font-mono font-medium">{ep.path}</code>
                      <p className="text-sm text-slate-500 mt-1">{ep.description}</p>
                      {ep.params && (
                        <code className="text-xs bg-slate-50 px-2 py-1 rounded mt-2 block text-slate-600">
                          {ep.params}
                        </code>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Example Request</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-sm bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto">
{`curl -H "Authorization: Bearer ce_your_api_key" \\
  "https://your-domain.com/api/v1/properties?city=Austin&minScore=70&limit=10"`}
                </pre>
                <p className="text-xs text-slate-400 mt-2">
                  Response includes scored properties with address, price, score, metrics, and more.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Auth Tab */}
          <TabsContent value="auth" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  API Key Authentication
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-slate-600">
                  All API requests require a valid API key passed in the Authorization header.
                </p>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Header format:</p>
                  <code className="text-sm bg-slate-100 px-3 py-2 rounded block">
                    Authorization: Bearer ce_your_api_key_here
                  </code>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Getting an API key:</p>
                  <ol className="text-sm text-slate-600 list-decimal list-inside space-y-1">
                    <li>Go to <a href="/api-access" className="text-blue-600 underline">API Access</a> in your dashboard</li>
                    <li>Click "Create New Key"</li>
                    <li>Copy and store the key securely — it's shown only once</li>
                  </ol>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Error Responses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex gap-3"><Badge variant="destructive">401</Badge> Invalid or missing API key</div>
                  <div className="flex gap-3"><Badge variant="destructive">403</Badge> Insufficient permissions</div>
                  <div className="flex gap-3"><Badge className="bg-orange-100 text-orange-800">429</Badge> Rate limit exceeded</div>
                  <div className="flex gap-3"><Badge variant="destructive">500</Badge> Internal server error</div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rate Limits Tab */}
          <TabsContent value="limits" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Rate Limits by Tier
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-500 border-b">
                        <th className="pb-2 font-medium">Tier</th>
                        <th className="pb-2 font-medium">API Requests</th>
                        <th className="pb-2 font-medium">Access</th>
                      </tr>
                    </thead>
                    <tbody>
                      {TIER_RATES.map((tier) => (
                        <tr key={tier.tier} className="border-b last:border-0">
                          <td className="py-3 font-medium">{tier.tier}</td>
                          <td className="py-3">
                            <Badge variant="outline">{tier.requests}</Badge>
                          </td>
                          <td className="py-3 text-slate-500">{tier.features}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-slate-400 mt-4">
                  Rate limits are per API key. When exceeded, requests return 429 status with a Retry-After header.
                  Upgrade your subscription tier for higher limits.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
