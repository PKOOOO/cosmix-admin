"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Plus, Trash, Edit, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertModal } from "@/components/modals/alert-modal";
import toast from "react-hot-toast";

interface GlobalCategory {
  id: string;
  name: string;
  isGlobal: boolean;
  createdAt: string;
  updatedAt: string;
}

export const AdminCategoriesClient = () => {
  const router = useRouter();
  const [categories, setCategories] = useState<GlobalCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [editingCategory, setEditingCategory] = useState<GlobalCategory | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [popular, setPopular] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/admin/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error("Failed to fetch categories");
    }
  };

  const handleCreate = async () => {
    if (!categoryName.trim()) {
      toast.error("Category name is required");
      return;
    }

    try {
      setLoading(true);
      await axios.post('/api/admin/categories', { name: categoryName, popular });
      toast.success("Category created successfully");
      setCategoryName("");
      setOpen(false);
      fetchCategories();
    } catch (error) {
      console.error('Error creating category:', error);
      toast.error("Failed to create category");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingCategory || !categoryName.trim()) {
      toast.error("Category name is required");
      return;
    }

    try {
      setLoading(true);
      await axios.patch(`/api/admin/categories/${editingCategory.id}`, { name: categoryName, popular });
      toast.success("Category updated successfully");
      setCategoryName("");
      setEditingCategory(null);
      setOpen(false);
      fetchCategories();
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error("Failed to update category");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      setLoading(true);
      await axios.delete(`/api/admin/categories/${deleteId}`);
      toast.success("Category deleted successfully");
      setDeleteId(null);
      setOpenDelete(false);
      fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error("Failed to delete category");
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (category: GlobalCategory) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setPopular((category as any).popular ?? false);
    setOpen(true);
  };

  const openDeleteDialog = (id: string) => {
    setDeleteId(id);
    setOpenDelete(true);
  };

  const resetForm = () => {
    setCategoryName("");
    setEditingCategory(null);
    setPopular(false);
    setOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={resetForm}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </DialogTrigger>
          <DialogContent className="w-full max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? "Edit Category" : "Create Category"}
              </DialogTitle>
              <DialogDescription>
                {editingCategory
                  ? "Update the category name below."
                  : "Add a new global category that all saloons can use."
                }
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Category Name</Label>
                <Input
                  id="name"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="Enter category name"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="popular" checked={popular} onCheckedChange={(v) => setPopular(!!v)} />
                <Label htmlFor="popular">Popular</Label>
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={resetForm} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button
                onClick={editingCategory ? handleUpdate : handleCreate}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                {editingCategory ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Categories List - Compact rows */}
      <div className="space-y-2">
        {categories.map((category) => (
          <div
            key={category.id}
            className="flex items-center justify-between p-6 border rounded-lg bg-card"
          >
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold truncate">{category.name}</h4>

            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => openEditDialog(category)}
              >
                <Edit className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => openDeleteDialog(category.id)}
              >
                <Trash className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {categories.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Package className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No global categories yet</p>
            <p className="text-xs text-muted-foreground">
              Create your first global category to get started
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
