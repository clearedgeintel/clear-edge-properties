import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { upsertBrandingSchema, type WhitelabelBranding } from "@shared/schema";

type BrandingFormValues = z.infer<typeof upsertBrandingSchema>;
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building, Palette, FileText, Eye } from "lucide-react";

export default function BrandingPage() {
  const { toast } = useToast();

  const { data: branding, isLoading } = useQuery<WhitelabelBranding | null>({
    queryKey: ['/api/branding'],
  });

  const form = useForm<BrandingFormValues>({
    resolver: zodResolver(upsertBrandingSchema),
    defaultValues: {
      companyName: branding?.companyName || '',
      logoUrl: branding?.logoUrl || '',
      primaryColor: branding?.primaryColor || '#3B82F6',
      secondaryColor: branding?.secondaryColor || '#1E40AF',
      fontFamily: branding?.fontFamily || 'Inter',
      reportFooter: branding?.reportFooter || '',
      licenseNumber: branding?.licenseNumber || '',
      brokerName: branding?.brokerName || '',
      disclaimerText: branding?.disclaimerText || '',
    },
  });

  // Update form when branding data loads
  React.useEffect(() => {
    if (branding) {
      form.reset({
        companyName: branding.companyName || '',
        logoUrl: branding.logoUrl || '',
        primaryColor: branding.primaryColor || '#3B82F6',
        secondaryColor: branding.secondaryColor || '#1E40AF',
        fontFamily: branding.fontFamily || 'Inter',
        reportFooter: branding.reportFooter || '',
        licenseNumber: branding.licenseNumber || '',
        brokerName: branding.brokerName || '',
        disclaimerText: branding.disclaimerText || '',
      });
    }
  }, [branding, form]);

  const saveBrandingMutation = useMutation({
    mutationFn: async (data: BrandingFormValues) => {
      // Server upserts tenant branding (tenant derived from auth, no tenantId in body).
      const method = branding ? "PATCH" : "POST";
      const response = await apiRequest(method, "/api/branding", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Branding settings saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/branding'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save branding settings",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: BrandingFormValues) => {
    saveBrandingMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            <div className="h-4 bg-slate-200 rounded w-3/4"></div>
            <div className="h-4 bg-slate-200 rounded w-1/2"></div>
            <div className="h-4 bg-slate-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl flex items-center justify-center shadow-lg">
              <Palette className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">White-Label Branding</h1>
              <p className="text-slate-600">
                Customize your company branding for property reports and client materials
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="xl:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
              <div className="p-6 lg:p-8">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    {/* Company Information Section */}
                    <div>
                      <div className="flex items-center space-x-3 mb-6">
                        <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                          <Building className="w-4 h-4 text-blue-600" />
                        </div>
                        <h2 className="text-lg font-semibold text-slate-900">Company Information</h2>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="companyName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Company Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Your Company Name" {...field} value={field.value ?? ''} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="brokerName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Broker Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Jane Smith, Broker" {...field} value={field.value ?? ''} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="licenseNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>License Number</FormLabel>
                              <FormControl>
                                <Input placeholder="RE123456789" {...field} value={field.value ?? ''} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Visual Branding Section */}
                    <div className="border-t border-slate-200 pt-8">
                      <div className="flex items-center space-x-3 mb-6">
                        <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
                          <Palette className="w-4 h-4 text-purple-600" />
                        </div>
                        <h2 className="text-lg font-semibold text-slate-900">Visual Branding</h2>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="logoUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Logo URL</FormLabel>
                              <FormControl>
                                <Input placeholder="https://company.com/logo.png" {...field} value={field.value ?? ''} />
                              </FormControl>
                              <FormDescription>
                                Upload your logo to a hosting service and paste the URL here
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="fontFamily"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Font Family</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value ?? undefined} defaultValue={field.value ?? undefined}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a font" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="Inter">Inter</SelectItem>
                                  <SelectItem value="Roboto">Roboto</SelectItem>
                                  <SelectItem value="Open Sans">Open Sans</SelectItem>
                                  <SelectItem value="Lato">Lato</SelectItem>
                                  <SelectItem value="Montserrat">Montserrat</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="primaryColor"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Primary Color</FormLabel>
                              <FormControl>
                                <div className="flex items-center space-x-3">
                                  <Input type="color" {...field} value={field.value ?? '#3B82F6'} className="w-16 h-10" />
                                  <Input placeholder="#3B82F6" {...field} value={field.value ?? ''} className="flex-1" />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="secondaryColor"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Secondary Color</FormLabel>
                              <FormControl>
                                <div className="flex items-center space-x-3">
                                  <Input type="color" {...field} value={field.value ?? '#1E40AF'} className="w-16 h-10" />
                                  <Input placeholder="#1E40AF" {...field} value={field.value ?? ''} className="flex-1" />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Report Content Section */}
                    <div className="border-t border-slate-200 pt-8">
                      <div className="flex items-center space-x-3 mb-6">
                        <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                          <FileText className="w-4 h-4 text-green-600" />
                        </div>
                        <h2 className="text-lg font-semibold text-slate-900">Report Content</h2>
                      </div>
                      <div className="space-y-6">
                        <FormField
                          control={form.control}
                          name="reportFooter"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Report Footer</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Custom footer text for your property reports..."
                                  rows={3}
                                  {...field}
                                  value={field.value ?? ''}
                                />
                              </FormControl>
                              <FormDescription>
                                This text will appear at the bottom of all generated property reports
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="disclaimerText"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Disclaimer Text</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Legal disclaimer text for your reports..."
                                  rows={4}
                                  {...field}
                                  value={field.value ?? ''}
                                />
                              </FormControl>
                              <FormDescription>
                                Legal disclaimer and important notices for your property reports
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end pt-6 border-t border-slate-200">
                      <Button 
                        type="submit" 
                        disabled={saveBrandingMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {saveBrandingMutation.isPending ? "Saving..." : "Save Branding Settings"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            </div>
          </div>

          {/* Preview Panel */}
          <div className="xl:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 sticky top-6">
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                    <Eye className="w-4 h-4 text-amber-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-slate-900">Live Preview</h2>
                </div>
                
                {/* Business Card Preview */}
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-6 border border-slate-200">
                  <div className="text-center space-y-4">
                    {form.watch('logoUrl') ? (
                      <img 
                        src={form.watch('logoUrl') ?? undefined}
                        alt="Company Logo"
                        className="w-16 h-16 mx-auto rounded-lg object-contain"
                      />
                    ) : (
                      <div 
                        className="w-16 h-16 rounded-lg mx-auto flex items-center justify-center text-white font-bold text-xl shadow-lg"
                        style={{ backgroundColor: form.watch('primaryColor') || '#3B82F6' }}
                      >
                        {form.watch('companyName')?.charAt(0) || 'C'}
                      </div>
                    )}
                    
                    <div>
                      <h3
                        className="text-xl font-bold"
                        style={{ color: form.watch('primaryColor') || '#1E293B' }}
                      >
                        {form.watch('companyName') || 'Your Company Name'}
                      </h3>
                      {form.watch('brokerName') && (
                        <p className="text-slate-600 text-sm mt-1">
                          {form.watch('brokerName')}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1 text-xs text-slate-500">
                      {form.watch('licenseNumber') && (
                        <div>License #{form.watch('licenseNumber')}</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Color Swatches */}
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-slate-900 mb-3">Color Palette</h4>
                  <div className="flex space-x-3">
                    <div className="text-center">
                      <div 
                        className="w-12 h-12 rounded-lg border border-slate-200 shadow-sm"
                        style={{ backgroundColor: form.watch('primaryColor') || '#3B82F6' }}
                      ></div>
                      <div className="text-xs text-slate-500 mt-1">Primary</div>
                    </div>
                    <div className="text-center">
                      <div 
                        className="w-12 h-12 rounded-lg border border-slate-200 shadow-sm"
                        style={{ backgroundColor: form.watch('secondaryColor') || '#1E40AF' }}
                      ></div>
                      <div className="text-xs text-slate-500 mt-1">Secondary</div>
                    </div>
                  </div>
                </div>

                {/* Font Preview */}
                {form.watch('fontFamily') && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-slate-900 mb-3">Typography</h4>
                    <div 
                      className="text-lg"
                      style={{ fontFamily: form.watch('fontFamily') ?? undefined }}
                    >
                      {form.watch('fontFamily')} Font
                    </div>
                    <div 
                      className="text-sm text-slate-600 mt-1"
                      style={{ fontFamily: form.watch('fontFamily') ?? undefined }}
                    >
                      The quick brown fox jumps over the lazy dog
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}