"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "@/lib/axios";
import { Plus, Trash, Edit, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  category: {
    id: string;
    name: string;
    isGlobal: boolean;
  };
  subServices: { id: string }[];
  createdAt: string;
  updatedAt: string;
}

export const AdminServicesClient = () => {
  const router = useRouter();
  const [services, setServices] = useState<ParentService[]>([]);
  const [parentServices, setParentServices] = useState<ParentService[]>([]);
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

      // Filter parent services for sub-service creation
      const parentServicesOnly = servicesResponse.data.filter((service: any) => !service.parentServiceId);
      setParentServices(parentServicesOnly);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error("Failed to fetch data");
    }
  };

  // Filter parent services by selected category
  const filteredParentServices = parentServices.filter((service: any) =>
    service.categoryId === selectedCategoryId
  );

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
      const isEditingSub = (editingService as any)?.parentServiceId;
      await axios.patch(`/api/admin/services/${editingService.id}`, {
        name: serviceName,
        description: serviceDescription,
        ...(isEditingSub ? { workTypes } : {})
      });

      resetForm();
      fetchData();
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
      // Extract error message from axios response
      let errorMessage = "Failed to delete service";
      if (error.response?.data) {
        // NextResponse with string body returns the string directly
        errorMessage = typeof error.response.data === 'string' 
          ? error.response.data 
          : error.response.data.message || errorMessage;
      } else if (error.message) {
        errorMessage = error.message;
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
    setSelectedCategoryId(service.category.id);
    setWorkTypes(((service as any).workTypes as WorkType[]) || []);
    // popular removed from services
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Services Management</h3>
          <p className="text-sm text-muted-foreground">
            Create parent services and sub-services that saloons can use
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => {
            setIsCreatingSubService(false);
            setOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Parent Service
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setIsCreatingSubService(true);
              setOpen(true);
            }}
            disabled={parentServices.length === 0}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Sub-Service
          </Button>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="w-full max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingService
                  ? `Edit ${(editingService as any).parentServiceId ? 'Sub-Service' : 'Parent Service'}`
                  : `Create ${isCreatingSubService ? 'Sub-Service' : 'Parent Service'}`
                }
              </DialogTitle>
              <DialogDescription>
                {editingService
                  ? "Update the service details below."
                  : isCreatingSubService
                    ? "Add a new sub-service under a parent service."
                    : "Add a new parent service that saloons can use as a template."
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
              {(isCreatingSubService || (editingService && (editingService as any).parentServiceId)) && (
                <div className="space-y-2">
                  <Label>Work Types (optional)</Label>
                  <div className="grid grid-cols-1 gap-3 text-sm">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="workTypeUudet"
                        checked={workTypes.includes('UUDET')}
                        onChange={() => toggleWorkType('UUDET')}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      Uudet
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="workTypePoisto"
                        checked={workTypes.includes('POISTO')}
                        onChange={() => toggleWorkType('POISTO')}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      Poisto
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="workTypeHuolto"
                        checked={workTypes.includes('HUOLTO')}
                        onChange={() => toggleWorkType('HUOLTO')}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      Huolto
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="workTypeEiLisakkeita"
                        checked={workTypes.includes('EI_LISAKKEITA')}
                        onChange={() => toggleWorkType('EI_LISAKKEITA')}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      Ei lisäkkeitä
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="workTypeLyhyet"
                        checked={workTypes.includes('LYHYET')}
                        onChange={() => toggleWorkType('LYHYET')}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      Lyhyet
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="workTypeKeskipitkat"
                        checked={workTypes.includes('KESKIPITKAT')}
                        onChange={() => toggleWorkType('KESKIPITKAT')}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      Keskipitkät
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="workTypePitkat"
                        checked={workTypes.includes('PITKAT')}
                        onChange={() => toggleWorkType('PITKAT')}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      Pitkät
                    </label>
                  </div>
                </div>
              )}

              {/* Popular removed from services */}

              {!editingService && (
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <select
                    id="category"
                    value={selectedCategoryId}
                    onChange={(e) => {
                      setSelectedCategoryId(e.target.value);
                      setSelectedParentServiceId(""); // Clear parent service when category changes
                    }}
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={categories.length === 0}
                  >
                    <option value="">Select a category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  {categories.length === 0 && (
                    <p className="text-sm text-red-600">
                      No global categories available. Please create global categories first.
                    </p>
                  )}
                </div>
              )}

              {isCreatingSubService && (
                <div className="space-y-2">
                  <Label htmlFor="parentService">Parent Service</Label>
                  <select
                    id="parentService"
                    value={selectedParentServiceId}
                    onChange={(e) => {
                      setSelectedParentServiceId(e.target.value);
                    }}
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                    <p className="text-sm text-red-600">
                      No parent services available in this category. Please create parent services first.
                    </p>
                  )}
                  {!selectedCategoryId && (
                    <p className="text-sm text-muted-foreground">
                      Please select a category first to see available parent services.
                    </p>
                  )}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button
                onClick={editingService ? handleUpdate : handleCreate}
                disabled={loading}
              >
                {editingService ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Services List */}
      <div className="space-y-6">
        {/* Parent Services */}
        <div>
          <h4 className="text-md font-medium mb-3 flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Parent Services ({services.filter((s: any) => !s.parentServiceId).length})
          </h4>
          <div className="grid gap-4">
            {services.filter((s: any) => !s.parentServiceId).map((service) => (
              <Card key={service.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{service.name}</CardTitle>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(service)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDeleteDialog(service.id)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p>Category: {service.category.name}</p>
                    <p>Sub-services: {service.subServices.length}</p>
                    <p>Created: {new Date(service.createdAt).toLocaleDateString()}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Sub-Services */}
        <div>
          <h4 className="text-md font-medium mb-3 flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Sub-Services ({services.filter((s: any) => s.parentServiceId).length})
          </h4>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {services.filter((s: any) => s.parentServiceId).map((service) => (
              <Card key={service.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{service.name}</CardTitle>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(service)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDeleteDialog(service.id)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="mb-2">
                    {service.description || "No description"}
                  </CardDescription>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p>Category: {service.category.name}</p>
                    <p>Parent: {(service as any).parentService?.name}</p>
                    <p>Types: {(service as any).workTypes && (service as any).workTypes.length > 0 ? (service as any).workTypes.map((t: WorkType) => ({ UUDET: 'Uudet', POISTO: 'Poisto', HUOLTO: 'Huolto', EI_LISAKKEITA: 'Ei lisäkkeitä', LYHYET: 'Lyhyet', KESKIPITKAT: 'Keskipitkät', PITKAT: 'Pitkät' } as const)[t]).join(', ') : '—'}</p>
                    <p>Created: {new Date(service.createdAt).toLocaleDateString()}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {services.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Settings className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No services yet</p>
            <p className="text-xs text-muted-foreground">
              Create your first parent service to get started
            </p>
          </CardContent>
        </Card>
      )}

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
