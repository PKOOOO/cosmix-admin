"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import axios from "@/lib/axios";
import { Plus, Trash, Edit, Settings, ChevronRight, Check, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertModal } from "@/components/modals/alert-modal";
import toast from "react-hot-toast";

type WorkType = 'UUDET' | 'POISTO' | 'HUOLTO' | 'EI_LISAKKEITA' | 'LYHYET' | 'KESKIPITKAT' | 'PITKAT';

interface GlobalCategory {
  id: string;
  name: string;
  isGlobal: boolean;
}

interface ParentService {
  id: string;
  name: string;
  description?: string;
  workTypes?: WorkType[];
  categoryId: string;
  category: {
    id: string;
    name: string;
    isGlobal: boolean;
  };
  subServices: { id: string; name: string; description?: string; workTypes?: WorkType[] }[];
  parentServiceId?: string;
  parentService?: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

const WORK_TYPE_LABELS: Record<WorkType, string> = {
  UUDET: 'Uudet',
  POISTO: 'Poisto',
  HUOLTO: 'Huolto',
  EI_LISAKKEITA: 'Ei lisäkkeitä',
  LYHYET: 'Lyhyet',
  KESKIPITKAT: 'Keskipitkät',
  PITKAT: 'Pitkät'
};

export const AdminServicesClient = () => {
  const router = useRouter();
  const [services, setServices] = useState<ParentService[]>([]);
  const [categories, setCategories] = useState<GlobalCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [editingService, setEditingService] = useState<ParentService | null>(null);
  const [serviceName, setServiceName] = useState("");
  const [serviceDescription, setServiceDescription] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedParentServiceId, setSelectedParentServiceId] = useState("");
  const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
  const [isCreatingSubService, setIsCreatingSubService] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // UI State
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedParentId, setExpandedParentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [servicesResponse, categoriesResponse] = await Promise.all([
        axios.get('/api/admin/services'),
        axios.get('/api/admin/categories')
      ]);
      setServices(servicesResponse.data);
      setCategories(categoriesResponse.data);

      // Set first category as selected
      if (categoriesResponse.data.length > 0 && !selectedCategory) {
        setSelectedCategory(categoriesResponse.data[0].id);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error("Failed to fetch data");
    }
  };

  // Group services by category and parent
  const groupedData = useMemo(() => {
    const parentServices = services.filter(s => !s.parentServiceId);
    const subServices = services.filter(s => s.parentServiceId);

    // Group parent services by category
    const byCategory: Record<string, ParentService[]> = {};
    parentServices.forEach(service => {
      const catId = service.categoryId || service.category?.id;
      if (!byCategory[catId]) {
        byCategory[catId] = [];
      }
      byCategory[catId].push(service);
    });

    // Attach sub-services to their parents
    const withSubs = Object.entries(byCategory).reduce((acc, [catId, parents]) => {
      acc[catId] = parents.map(parent => ({
        ...parent,
        subServices: subServices.filter(sub => sub.parentServiceId === parent.id)
      }));
      return acc;
    }, {} as Record<string, ParentService[]>);

    return withSubs;
  }, [services]);

  // Get parent services for selected category
  const parentServicesInCategory = useMemo(() => {
    if (!selectedCategory) return [];
    let parents = groupedData[selectedCategory] || [];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      parents = parents.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.subServices?.some(s => s.name.toLowerCase().includes(query))
      );
    }

    return parents;
  }, [selectedCategory, groupedData, searchQuery]);

  // Filter parent services for sub-service creation
  const filteredParentServices = useMemo(() => {
    return services.filter(s => !s.parentServiceId && s.categoryId === selectedCategoryId);
  }, [services, selectedCategoryId]);

  const handleCreate = async () => {
    if (!serviceName.trim()) {
      toast.error("Service name is required");
      return;
    }

    if (!selectedCategoryId) {
      toast.error("Please select a category");
      return;
    }

    if (isCreatingSubService && !selectedParentServiceId) {
      toast.error("Please select a parent service");
      return;
    }

    try {
      setLoading(true);
      const payload: any = {
        name: serviceName,
        categoryId: selectedCategoryId,
        description: serviceDescription,
      };
      if (isCreatingSubService) {
        payload.parentServiceId = selectedParentServiceId;
        payload.workTypes = workTypes;
      }

      await axios.post('/api/admin/services', payload);
      toast.success(`${isCreatingSubService ? 'Sub-service' : 'Parent service'} created successfully`);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error('Error creating service:', error);
      toast.error(`Failed to create service: ${error.response?.data || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingService || !serviceName.trim()) {
      toast.error("Service name is required");
      return;
    }

    try {
      setLoading(true);
      const isEditingSub = editingService?.parentServiceId;
      await axios.patch(`/api/admin/services/${editingService.id}`, {
        name: serviceName,
        description: serviceDescription,
        ...(isEditingSub ? { workTypes } : {})
      });

      resetForm();
      fetchData();
      toast.success("Service updated successfully");
    } catch (error) {
      console.error('Error updating service:', error);
      toast.error("Failed to update service");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      setLoading(true);
      await axios.delete(`/api/admin/services/${deleteId}`);
      toast.success("Service deleted successfully");
      setDeleteId(null);
      setOpenDelete(false);
      fetchData();
    } catch (error: any) {
      console.error('Error deleting service:', error);
      let errorMessage = "Failed to delete service";
      if (error.response?.data) {
        errorMessage = typeof error.response.data === 'string'
          ? error.response.data
          : error.response.data.message || errorMessage;
      }
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const toggleWorkType = (value: WorkType) => {
    setWorkTypes((prev) => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
  };

  const openEditModal = (service: ParentService) => {
    setEditingService(service);
    setServiceName(service.name);
    setServiceDescription(service.description || "");
    setSelectedCategoryId(service.category?.id || service.categoryId);
    setWorkTypes((service.workTypes as WorkType[]) || []);
    setOpen(true);
  };

  const openDeleteDialog = (id: string) => {
    setDeleteId(id);
    setOpenDelete(true);
  };

  const resetForm = () => {
    setServiceName("");
    setServiceDescription("");
    setSelectedCategoryId("");
    setSelectedParentServiceId("");
    setWorkTypes([]);
    setIsCreatingSubService(false);
    setEditingService(null);
    setOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Header with Buttons */}
      <div className="flex flex-col gap-3">
        <div>
          <h3 className="text-lg font-medium">Services</h3>
          <p className="text-xs text-muted-foreground">
            Manage parent services and sub-services
          </p>
        </div>

        {/* Buttons - Stack on mobile */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            size="sm"
            className="w-full sm:w-auto"
            onClick={() => {
              setIsCreatingSubService(false);
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Parent Service
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => {
              setIsCreatingSubService(true);
              setOpen(true);
            }}
            disabled={services.filter(s => !s.parentServiceId).length === 0}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Sub-Service
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search services..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Category Pills */}
      {categories.length > 0 && (
        <div className="flex gap-3 overflow-x-auto no-scrollbar py-2">
          {categories.map((category) => {
            const isSelected = selectedCategory === category.id;
            const count = (groupedData[category.id] || []).length;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => {
                  setSelectedCategory(category.id);
                  setExpandedParentId(null);
                }}
                className={`
                  whitespace-nowrap px-4 py-2.5 rounded-full text-sm font-medium transition-all flex items-center gap-2
                  ${isSelected
                    ? 'bg-[#423120] text-white shadow-md'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  }
                `}
              >
                {category.name}
                {count > 0 && (
                  <span className={`text-xs ${isSelected ? 'text-white/70' : 'text-muted-foreground'}`}>
                    ({count})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Services List - Hierarchical */}
      <div className="space-y-3">
        {parentServicesInCategory.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <Settings className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? "No services match your search" : "No services in this category"}
              </p>
            </CardContent>
          </Card>
        ) : (
          parentServicesInCategory.map((parent) => {
            const isExpanded = expandedParentId === parent.id;
            const subCount = parent.subServices?.length || 0;

            return (
              <div key={parent.id} className="space-y-2">
                {/* Parent Service Card */}
                <div
                  className={`
                    flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-all
                    ${isExpanded ? 'bg-[#423120]/5 border-[#423120]/30' : 'bg-card border-border hover:border-[#423120]/30'}
                  `}
                  onClick={() => setExpandedParentId(isExpanded ? null : parent.id)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`} />
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold truncate">{parent.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        {subCount} {subCount === 1 ? 'sub-service' : 'sub-services'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={(e) => { e.stopPropagation(); openEditModal(parent); }}
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={(e) => { e.stopPropagation(); openDeleteDialog(parent.id); }}
                    >
                      <Trash className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Sub-Services (Expandable) */}
                {isExpanded && parent.subServices && parent.subServices.length > 0 && (
                  <div className="ml-6 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    {parent.subServices.map((sub: any) => (
                      <div
                        key={sub.id}
                        className="flex items-center justify-between p-2.5 bg-muted/30 rounded-lg border border-border/50"
                      >
                        <div className="min-w-0 flex-1">
                          <h5 className="text-sm font-medium truncate">{sub.name}</h5>
                          {sub.workTypes && sub.workTypes.length > 0 && (
                            <p className="text-[10px] text-muted-foreground">
                              {sub.workTypes.map((t: WorkType) => WORK_TYPE_LABELS[t]).join(', ')}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => openEditModal(sub)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => openDeleteDialog(sub.id)}
                          >
                            <Trash className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* No sub-services message */}
                {isExpanded && (!parent.subServices || parent.subServices.length === 0) && (
                  <div className="ml-6 p-3 bg-muted/30 rounded-lg text-center">
                    <p className="text-xs text-muted-foreground">No sub-services yet</p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingService
                ? `Edit ${editingService.parentServiceId ? 'Sub-Service' : 'Parent Service'}`
                : `Create ${isCreatingSubService ? 'Sub-Service' : 'Parent Service'}`
              }
            </DialogTitle>
            <DialogDescription>
              {editingService
                ? "Update the service details below."
                : isCreatingSubService
                  ? "Add a new sub-service under a parent service."
                  : "Add a new parent service that saloons can use."
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Service Name</Label>
              <Input
                id="name"
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                placeholder="Enter service name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <textarea
                id="description"
                value={serviceDescription}
                onChange={(e) => setServiceDescription(e.target.value)}
                placeholder="Enter service description"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            {/* Work types for sub-services */}
            {(isCreatingSubService || (editingService && editingService.parentServiceId)) && (
              <div className="space-y-2">
                <Label>Work Types (optional)</Label>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {(Object.keys(WORK_TYPE_LABELS) as WorkType[]).map((wt) => (
                    <label key={wt} className="flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-muted/50">
                      <input
                        type="checkbox"
                        checked={workTypes.includes(wt)}
                        onChange={() => toggleWorkType(wt)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <span className="text-xs">{WORK_TYPE_LABELS[wt]}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {!editingService && (
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  value={selectedCategoryId}
                  onChange={(e) => {
                    setSelectedCategoryId(e.target.value);
                    setSelectedParentServiceId("");
                  }}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  disabled={categories.length === 0}
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {isCreatingSubService && (
              <div className="space-y-2">
                <Label htmlFor="parentService">Parent Service</Label>
                <select
                  id="parentService"
                  value={selectedParentServiceId}
                  onChange={(e) => setSelectedParentServiceId(e.target.value)}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  disabled={filteredParentServices.length === 0}
                >
                  <option value="">Select a parent service</option>
                  {filteredParentServices.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
                {filteredParentServices.length === 0 && selectedCategoryId && (
                  <p className="text-xs text-red-600">
                    No parent services in this category. Create one first.
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={resetForm} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button
              onClick={editingService ? handleUpdate : handleCreate}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              {editingService ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <AlertModal
        isOpen={openDelete}
        onClose={() => setOpenDelete(false)}
        onConfirm={handleDelete}
        loading={loading}
      />
    </div>
  );
};
