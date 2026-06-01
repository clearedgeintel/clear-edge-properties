import { Button } from "@/components/ui/button";
import { Plus, CheckCircle, Loader2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Property, UserProperty } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

type TrackedItem = UserProperty & { property: Property | null };

interface AddToPipelineButtonProps {
  property: Property;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
}

export function AddToPipelineButton({
  property,
  variant = "outline",
  size = "sm",
  className = "",
}: AddToPipelineButtonProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: watchlist } = useQuery<TrackedItem[]>({
    queryKey: ["/api/watchlist"],
  });

  const tracked = Array.isArray(watchlist)
    ? watchlist.find((item) => item.zpid === property.zpid)
    : undefined;
  const inPipeline = Boolean(tracked);

  const addMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/watchlist", { zpid: property.zpid });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      toast({
        title: "Added to Pipeline",
        description: `${property.address ?? "Property"} has been added to your tracked properties`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message ?? "Failed to track property",
        variant: "destructive",
      });
    },
  });

  if (inPipeline) {
    return (
      <Button
        variant="ghost"
        size={size}
        className={`${className} text-green-600 hover:text-green-700`}
        disabled
      >
        <CheckCircle className="w-4 h-4 mr-2" />
        In Pipeline
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      disabled={addMutation.isPending}
      onClick={() => addMutation.mutate()}
    >
      {addMutation.isPending ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <Plus className="w-4 h-4 mr-2" />
      )}
      Add to Pipeline
    </Button>
  );
}
