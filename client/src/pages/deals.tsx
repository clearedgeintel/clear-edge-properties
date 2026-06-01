import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, MoreVertical, Edit, Trash2, Calendar, DollarSign, Home, Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { type DealStage, DEAL_STAGES } from "@/lib/deals";

interface Deal {
  id: string;
  title: string;
  address: string;
  price: number;
  score: number;
  stage: DealStage;
  notes?: string;
  loiFile?: {
    name: string;
    url: string;
    uploadedAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const STORAGE_KEY = "clearedge_deals";

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [isLoiUploadOpen, setIsLoiUploadOpen] = useState(false);
  const [pendingDealForLoi, setPendingDealForLoi] = useState<string | null>(null);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const { toast } = useToast();

  // Load deals from localStorage on mount
  useEffect(() => {
    const savedDeals = localStorage.getItem(STORAGE_KEY);
    if (savedDeals) {
      try {
        const parsedDeals = JSON.parse(savedDeals).map((deal: any) => ({
          ...deal,
          createdAt: new Date(deal.createdAt),
          updatedAt: new Date(deal.updatedAt),
        }));
        setDeals(parsedDeals);
      } catch (error) {
        console.error("Failed to load deals from localStorage:", error);
      }
    }
  }, []);

  // Save deals to localStorage whenever deals change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(deals));
  }, [deals]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;
    
    if (source.droppableId === destination.droppableId) return;

    const newStage = destination.droppableId as DealStage;
    
    // If moving to LOI Sent stage, offer optional file upload
    if (newStage === "loi_sent") {
      setPendingDealForLoi(draggableId);
      setIsLoiUploadOpen(true);
      return;
    }
    
    setDeals(prevDeals => 
      prevDeals.map(deal => 
        deal.id === draggableId 
          ? { ...deal, stage: newStage, updatedAt: new Date() }
          : deal
      )
    );

    toast({
      title: "Deal Updated",
      description: `Deal moved to ${DEAL_STAGES.find(s => s.id === newStage)?.title}`,
    });
  };

  const addDeal = (dealData: Omit<Deal, "id" | "createdAt" | "updatedAt">) => {
    const newDeal: Deal = {
      ...dealData,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    setDeals(prev => [...prev, newDeal]);
    setIsAddModalOpen(false);
    
    toast({
      title: "Deal Added",
      description: "New deal has been added to your pipeline",
    });
  };

  const updateDeal = (updatedDeal: Deal) => {
    setDeals(prev => 
      prev.map(deal => 
        deal.id === updatedDeal.id 
          ? { ...updatedDeal, updatedAt: new Date() }
          : deal
      )
    );
    setEditingDeal(null);
    
    toast({
      title: "Deal Updated",
      description: "Deal has been successfully updated",
    });
  };

  const deleteDeal = (dealId: string) => {
    setDeals(prev => prev.filter(deal => deal.id !== dealId));
    
    toast({
      title: "Deal Deleted",
      description: "Deal has been removed from your pipeline",
    });
  };

  const getDealsByStage = (stage: DealStage) => 
    deals.filter(deal => deal.stage === stage);

  const getScoreBadgeColor = (score: number) => {
    if (score >= 80) return "bg-green-100 text-green-800";
    if (score >= 60) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const handleLoiUpload = (file: File) => {
    if (!pendingDealForLoi) return;

    // Create a blob URL for the file (in a real app, you'd upload to a server)
    const url = URL.createObjectURL(file);
    
    setDeals(prevDeals => 
      prevDeals.map(deal => 
        deal.id === pendingDealForLoi 
          ? { 
              ...deal, 
              stage: "loi_sent", 
              loiFile: {
                name: file.name,
                url: url,
                uploadedAt: new Date()
              },
              updatedAt: new Date() 
            }
          : deal
      )
    );

    setIsLoiUploadOpen(false);
    setPendingDealForLoi(null);
    
    toast({
      title: "LOI Uploaded",
      description: "Deal moved to LOI Sent with attached document",
    });
  };

  const handleLoiCancel = () => {
    setIsLoiUploadOpen(false);
    setPendingDealForLoi(null);
  };

  const handleLoiSkip = () => {
    if (!pendingDealForLoi) return;

    setDeals(prevDeals => 
      prevDeals.map(deal => 
        deal.id === pendingDealForLoi 
          ? { ...deal, stage: "loi_sent", updatedAt: new Date() }
          : deal
      )
    );

    setIsLoiUploadOpen(false);
    setPendingDealForLoi(null);
    
    toast({
      title: "Deal Updated",
      description: "Deal moved to LOI Sent",
    });
  };

  return (
    <div className="p-6 max-w-full overflow-x-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Deal Pipeline</h1>
          <p className="text-gray-600 mt-1">Track your real estate deals through each stage</p>
        </div>
        
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Deal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Deal</DialogTitle>
            </DialogHeader>
            <DealForm onSubmit={addDeal} />
          </DialogContent>
        </Dialog>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 min-h-[600px]">
          {DEAL_STAGES.map(stage => (
            <div key={stage.id} className="flex flex-col">
              <div className="mb-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-gray-900">{stage.title}</h2>
                  <Badge variant="outline" className={stage.color}>
                    {getDealsByStage(stage.id).length}
                  </Badge>
                </div>
              </div>
              
              <Droppable droppableId={stage.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 p-3 rounded-lg border-2 border-dashed transition-colors ${
                      snapshot.isDraggingOver 
                        ? "border-blue-400 bg-blue-50" 
                        : "border-gray-200 bg-gray-50"
                    }`}
                  >
                    {getDealsByStage(stage.id).map((deal, index) => (
                      <Draggable key={deal.id} draggableId={deal.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`mb-3 transition-transform ${
                              snapshot.isDragging ? "rotate-2 scale-105" : ""
                            }`}
                          >
                            <DealCard 
                              deal={deal} 
                              onEdit={setEditingDeal}
                              onDelete={deleteDeal}
                              getScoreBadgeColor={getScoreBadgeColor}
                              onClick={setSelectedDeal}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      {/* Edit Deal Modal */}
      <Dialog open={!!editingDeal} onOpenChange={() => setEditingDeal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Deal</DialogTitle>
          </DialogHeader>
          {editingDeal && (
            <DealForm 
              deal={editingDeal}
              onSubmit={updateDeal}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* LOI Upload Modal */}
      <Dialog open={isLoiUploadOpen} onOpenChange={handleLoiCancel}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload LOI Document</DialogTitle>
          </DialogHeader>
          <LOIUploadForm onUpload={handleLoiUpload} onCancel={handleLoiCancel} onSkip={handleLoiSkip} />
        </DialogContent>
      </Dialog>

      {/* Deal Details Modal */}
      <Dialog open={!!selectedDeal} onOpenChange={() => setSelectedDeal(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Deal Details</DialogTitle>
          </DialogHeader>
          {selectedDeal && <DealDetailsModal deal={selectedDeal} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Deal Details Modal Component
function DealDetailsModal({ deal }: { deal: Deal }) {
  return (
    <div className="space-y-6">
      {/* Property Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-900">
            {deal.title}
          </h3>
          <p className="text-slate-600 mt-1">
            {deal.address}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-slate-900">
            ${deal.price?.toLocaleString()}
          </div>
          <div className="text-sm text-slate-500">
            Score: {deal.score || 'N/A'}
          </div>
        </div>
      </div>

      {/* Deal Status and Notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="font-semibold text-slate-900 mb-2">Deal Status</h4>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-slate-600">Current Stage:</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                deal.stage === 'analyzing' ? 'bg-blue-100 text-blue-700' :
                deal.stage === 'loi_sent' ? 'bg-yellow-100 text-yellow-700' :
                deal.stage === 'under_contract' ? 'bg-orange-100 text-orange-700' :
                deal.stage === 'closed' ? 'bg-green-100 text-green-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {deal.stage?.replace('_', ' ').toUpperCase()}
              </span>
            </div>
            <div className="text-sm text-slate-600">
              Added: {new Date(deal.createdAt).toLocaleDateString()}
            </div>
            {deal.updatedAt && (
              <div className="text-sm text-slate-600">
                Updated: {new Date(deal.updatedAt).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>

        {deal.notes && (
          <div>
            <h4 className="font-semibold text-slate-900 mb-2">Notes</h4>
            <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
              {deal.notes}
            </p>
          </div>
        )}
      </div>

      {/* LOI File if uploaded */}
      {deal.loiFile && (
        <div>
          <h4 className="font-semibold text-slate-900 mb-3">Letter of Intent</h4>
          <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-slate-900">
                {deal.loiFile.name}
              </div>
              <div className="text-xs text-slate-500">
                Uploaded {new Date(deal.loiFile.uploadedAt).toLocaleDateString()}
              </div>
            </div>
            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
              View
            </Button>
          </div>
        </div>
      )}

      {/* Deal Summary */}
      <div>
        <h4 className="font-semibold text-slate-900 mb-3">Deal Summary</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-slate-50 p-3 rounded-lg">
            <div className="text-xs text-slate-500 uppercase tracking-wide">Property Price</div>
            <div className="text-lg font-semibold text-slate-900">
              ${deal.price?.toLocaleString()}
            </div>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg">
            <div className="text-xs text-slate-500 uppercase tracking-wide">Score</div>
            <div className={`text-lg font-semibold ${
              deal.score >= 70 ? 'text-green-600' : 
              deal.score >= 50 ? 'text-yellow-600' : 
              'text-red-600'
            }`}>
              {deal.score || 'N/A'}
            </div>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg">
            <div className="text-xs text-slate-500 uppercase tracking-wide">Stage</div>
            <div className="text-lg font-semibold text-slate-900 capitalize">
              {deal.stage?.replace('_', ' ')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface DealCardProps {
  deal: Deal;
  onEdit: (deal: Deal) => void;
  onDelete: (dealId: string) => void;
  getScoreBadgeColor: (score: number) => string;
  onClick: (deal: Deal) => void;
}

function DealCard({ deal, onEdit, onDelete, getScoreBadgeColor, onClick }: DealCardProps) {
  return (
    <Card 
      className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow bg-white"
      onClick={() => onClick(deal)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm font-medium text-gray-900 truncate">
              {deal.title}
            </CardTitle>
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              <Home className="w-3 h-3" />
              {deal.address}
            </p>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(deal)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDelete(deal.id)}
                className="text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-sm font-medium">
              <DollarSign className="w-4 h-4 text-green-600" />
              ${deal.price.toLocaleString()}
            </div>
            <Badge className={getScoreBadgeColor(deal.score)}>
              {deal.score}
            </Badge>
          </div>
          
          {deal.loiFile && (
            <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
              <Upload className="w-3 h-3" />
              LOI Attached: {deal.loiFile.name}
            </div>
          )}
          
          {deal.notes && (
            <p className="text-xs text-gray-600 line-clamp-2">
              {deal.notes}
            </p>
          )}
          
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Calendar className="w-3 h-3" />
            Updated {formatDistanceToNow(deal.updatedAt, { addSuffix: true })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface DealFormProps {
  deal?: Deal;
  onSubmit: (deal: any) => void;
}

function DealForm({ deal, onSubmit }: DealFormProps) {
  const [formData, setFormData] = useState({
    title: deal?.title || "",
    address: deal?.address || "",
    price: deal?.price || 0,
    score: deal?.score || 0,
    stage: deal?.stage || "analyzing" as DealStage,
    notes: deal?.notes || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.address || formData.price <= 0) {
      return;
    }

    if (deal) {
      onSubmit({ ...deal, ...formData });
    } else {
      onSubmit(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Property Name/Title</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          placeholder="e.g., Downtown Duplex Investment"
          required
        />
      </div>
      
      <div>
        <Label htmlFor="address">Address</Label>
        <Input
          id="address"
          value={formData.address}
          onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
          placeholder="e.g., 123 Main St, City, State"
          required
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="price">Price ($)</Label>
          <Input
            id="price"
            type="number"
            value={formData.price}
            onChange={(e) => setFormData(prev => ({ ...prev, price: Number(e.target.value) }))}
            placeholder="450000"
            min="0"
            required
          />
        </div>
        
        <div>
          <Label htmlFor="score">Score (0-100)</Label>
          <Input
            id="score"
            type="number"
            value={formData.score}
            onChange={(e) => setFormData(prev => ({ ...prev, score: Number(e.target.value) }))}
            placeholder="85"
            min="0"
            max="100"
            required
          />
        </div>
      </div>
      
      <div>
        <Label htmlFor="stage">Stage</Label>
        <select
          id="stage"
          value={formData.stage}
          onChange={(e) => setFormData(prev => ({ ...prev, stage: e.target.value as DealStage }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {DEAL_STAGES.map(stage => (
            <option key={stage.id} value={stage.id}>
              {stage.title}
            </option>
          ))}
        </select>
      </div>
      
      <div>
        <Label htmlFor="notes">Notes (Optional)</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Additional notes about this deal..."
          rows={3}
        />
      </div>
      
      <div className="flex justify-end gap-3">
        <Button type="submit" className="w-full">
          {deal ? "Update Deal" : "Add Deal"}
        </Button>
      </div>
    </form>
  );
}

interface LOIUploadFormProps {
  onUpload: (file: File) => void;
  onCancel: () => void;
  onSkip: () => void;
}

function LOIUploadForm({ onUpload, onCancel, onSkip }: LOIUploadFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    
    const file = event.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleSubmit = () => {
    if (selectedFile) {
      onUpload(selectedFile);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Upload the LOI document if you have it, or skip to move the deal to "LOI Sent" stage without a file.
      </p>
      
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragOver 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-900">
            Drop your LOI document here, or click to browse
          </p>
          <p className="text-xs text-gray-500">
            PDF, DOC, DOCX files only
          </p>
        </div>
        
        <input
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload"
        />
        <Label 
          htmlFor="file-upload"
          className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
        >
          Select File
        </Label>
      </div>

      {selectedFile && (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Upload className="w-4 h-4 text-blue-600" />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
              <p className="text-xs text-gray-500">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedFile(null)}
            className="text-gray-400 hover:text-gray-600"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          variant="ghost" 
          onClick={onSkip}
          className="text-gray-600 hover:text-gray-800"
        >
          Skip Upload
        </Button>
        <Button 
          onClick={handleSubmit} 
          disabled={!selectedFile}
          className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
        >
          Upload & Move to LOI Sent
        </Button>
      </div>
    </div>
  );
}