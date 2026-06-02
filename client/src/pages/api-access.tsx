import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { ApiKey } from "@shared/schema";
import {
  Key,
  Copy,
  Trash2,
  Plus,
  Shield,
  Globe,
  CheckCircle,
  AlertTriangle,
  BookOpen,
  DollarSign
} from "lucide-react";

const API_ENDPOINTS = [
  {
    method: "GET",
    endpoint: "/api/v1/properties",
    description: "Retrieve property listings with filtering and pagination",
    params: "?limit=20&city=Miami&minScore=70"
  },
  {
    method: "GET", 
    endpoint: "/api/v1/properties/{id}",
    description: "Get detailed property information including AI analysis"
  },
  {
    method: "POST",
    endpoint: "/api/v1/ai/analyze",
    description: "Generate AI-powered property analysis and investment insights",
    body: '{"propertyId": 123, "investorProfile": "buy-and-hold"}'
  },
  {
    method: "POST",
    endpoint: "/api/v1/ai/loi",
    description: "Generate Letter of Intent for property offers",
    body: '{"propertyId": 123, "offerAmount": 250000, "terms": "..."}'
  },
  {
    method: "GET",
    endpoint: "/api/v1/market-data",
    description: "Access demographic and market data for areas",
    params: "?zipCode=33101"
  }
];

const PRICING_TIERS = [
  {
    name: "Starter",
    price: "$49/month",
    requests: "10,000 requests/month",
    features: ["Property data access", "Basic market data", "Email support"],
    color: "border-blue-200 bg-blue-50"
  },
  {
    name: "Professional", 
    price: "$149/month",
    requests: "50,000 requests/month",
    features: ["Everything in Starter", "AI analysis endpoints", "Demographic data", "Priority support"],
    color: "border-purple-200 bg-purple-50",
    popular: true
  },
  {
    name: "Enterprise",
    price: "Custom",
    requests: "Unlimited requests",
    features: ["Everything in Professional", "Custom endpoints", "Dedicated support", "SLA guarantee"],
    color: "border-slate-200 bg-slate-50"
  }
];

export default function ApiAccess() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [rateLimit, setRateLimit] = useState(1000);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user's API keys (tenant-scoped)
  const { data: apiKeys, isLoading: keysLoading } = useQuery<ApiKey[]>({
    queryKey: ['/api/api-keys'],
  });

  // Create new API key
  const createKeyMutation = useMutation({
    mutationFn: async (data: { keyName: string; permissions: string[]; rateLimit: number }) => {
      const response = await apiRequest("POST", "/api/api-keys", data);
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedKey(data.apiKey);
      setNewKeyName("");
      setSelectedPermissions([]);
      setRateLimit(1000);
      queryClient.invalidateQueries({ queryKey: ['/api/api-keys'] });
      toast({
        title: "API Key Created",
        description: "Your new API key has been generated. Make sure to copy it now!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create API key",
        variant: "destructive",
      });
    },
  });

  // Delete API key
  const deleteKeyMutation = useMutation({
    mutationFn: async (keyId: string) => {
      await apiRequest("DELETE", `/api/api-keys/${keyId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/api-keys'] });
      toast({
        title: "API Key Deleted",
        description: "The API key has been permanently deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete API key",
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "API key copied to clipboard",
    });
  };

  const handleCreateKey = () => {
    if (!newKeyName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a name for your API key",
        variant: "destructive",
      });
      return;
    }

    createKeyMutation.mutate({
      keyName: newKeyName,
      permissions: selectedPermissions,
      rateLimit
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-br from-brand-blue to-brand-navy rounded-xl flex items-center justify-center">
            <Globe className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">ClearEdge Props API Access</h1>
            <p className="text-lg text-slate-600">Integrate real estate data and AI insights into your applications</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="keys" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="keys">API Keys</TabsTrigger>
          <TabsTrigger value="docs">Documentation</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
        </TabsList>

        {/* API Keys Tab */}
        <TabsContent value="keys" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-slate-800">Your API Keys</h2>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Key
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New API Key</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="keyName">Key Name</Label>
                    <Input
                      id="keyName"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      placeholder="e.g., Production App, Test Environment"
                    />
                  </div>
                  <div>
                    <Label htmlFor="rateLimit">Rate Limit (requests/hour)</Label>
                    <Input
                      id="rateLimit"
                      type="number"
                      value={rateLimit}
                      onChange={(e) => setRateLimit(parseInt(e.target.value) || 1000)}
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleCreateKey}
                      disabled={createKeyMutation.isPending}
                    >
                      {createKeyMutation.isPending ? "Creating..." : "Create Key"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Generated Key Alert */}
          {generatedKey && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">Your new API key has been generated:</p>
                  <div className="flex items-center space-x-2 bg-slate-100 p-2 rounded">
                    <code className="flex-1 text-sm">{generatedKey}</code>
                    <Button size="sm" variant="outline" onClick={() => copyToClipboard(generatedKey)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-sm text-slate-600">
                    Make sure to copy this key now. You won't be able to see it again!
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* API Keys List */}
          <div className="space-y-4">
            {keysLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
                <p className="text-slate-500 mt-2">Loading API keys...</p>
              </div>
            ) : apiKeys?.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Key className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-600">No API Keys</h3>
                  <p className="text-slate-500">Create your first API key to get started</p>
                </CardContent>
              </Card>
            ) : (
              apiKeys?.map((key: ApiKey) => (
                <Card key={key.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-3">
                          <h3 className="font-semibold text-slate-800">{key.keyName}</h3>
                          <Badge variant={key.isActive ? "default" : "secondary"}>
                            {key.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-slate-600">
                          <span>Key: {key.keyPrefix}***</span>
                          <span>Rate limit: {key.rateLimit}/hour</span>
                          <span>
                            Last used: {key.lastUsed ? new Date(key.lastUsed).toLocaleDateString() : "Never"}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteKeyMutation.mutate(key.id)}
                        disabled={deleteKeyMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Documentation Tab */}
        <TabsContent value="docs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BookOpen className="h-5 w-5" />
                <span>API Documentation</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">Authentication</h3>
                <div className="bg-slate-100 p-4 rounded-lg">
                  <p className="mb-2">Include your API key in the Authorization header:</p>
                  <code className="text-sm">Authorization: Bearer YOUR_API_KEY</code>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Base URL</h3>
                <div className="bg-slate-100 p-4 rounded-lg">
                  <code className="text-sm">https://api.clearedgedeals.com</code>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Available Endpoints</h3>
                <div className="space-y-4">
                  {API_ENDPOINTS.map((endpoint, index) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Badge variant={endpoint.method === 'GET' ? 'default' : 'secondary'}>
                              {endpoint.method}
                            </Badge>
                            <code className="text-sm">{endpoint.endpoint}</code>
                          </div>
                        </div>
                        <p className="text-sm text-slate-600 mb-2">{endpoint.description}</p>
                        {endpoint.params && (
                          <div className="text-xs">
                            <span className="text-slate-500">Example: </span>
                            <code className="bg-slate-100 px-1 rounded">{endpoint.params}</code>
                          </div>
                        )}
                        {endpoint.body && (
                          <div className="text-xs mt-2">
                            <span className="text-slate-500">Body: </span>
                            <pre className="bg-slate-100 p-2 rounded mt-1 text-xs overflow-x-auto">
                              {endpoint.body}
                            </pre>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Rate Limiting</h3>
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    API requests are limited based on your subscription tier. Rate limit headers are included in responses:
                    <br />
                    <code className="text-xs">X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset</code>
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pricing Tab */}
        <TabsContent value="pricing" className="space-y-6">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold text-slate-800">API Pricing Plans</h2>
            <p className="text-slate-600">Choose the plan that fits your application's needs</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PRICING_TIERS.map((tier, index) => (
              <Card key={index} className={`${tier.color} ${tier.popular ? 'ring-2 ring-brand-orange' : ''} relative`}>
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-brand-orange">Most Popular</Badge>
                  </div>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-xl">{tier.name}</CardTitle>
                  <div className="text-3xl font-bold text-slate-800">{tier.price}</div>
                  <p className="text-slate-600">{tier.requests}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {tier.features.map((feature, fIndex) => (
                      <li key={fIndex} className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full" variant={tier.popular ? "default" : "outline"}>
                    <DollarSign className="h-4 w-4 mr-2" />
                    {tier.name === "Enterprise" ? "Contact Sales" : "Subscribe"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Enterprise Solutions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 mb-4">
                Need higher limits, custom endpoints, or dedicated support? Our enterprise solutions include:
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Unlimited API requests</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Custom data feeds and endpoints</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Dedicated account manager</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>99.9% SLA guarantee</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Priority support and consulting</span>
                </li>
              </ul>
              <Button className="mt-4" variant="outline">
                Contact Enterprise Sales
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}