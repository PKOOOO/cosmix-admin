// app/(dashboard)/dashboard/categories/components/cell-action.tsx
"use client";
import axios from "axios";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CategoryColumn } from "./columns";
import { Button } from "@/components/ui/button";
import { Copy, Edit, MoreHorizontal, Trash } from "lucide-react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { AlertModal } from "@/components/modals/alert-modal";

interface CellActionProps {
  data: CategoryColumn;
}

export const CellAction: React.FC<CellActionProps> = ({ data }) => {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const response = await axios.get('/api/admin/check');
        setIsAdmin(response.data.isAdmin);
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      }
    };
    checkAdminStatus();
  }, []);

  const onCopy = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success("Category ID copied to clipboard.", {
      style: {
        borderRadius: "10px",
        background: "#333",
        color: "#fff",
      },
    });
  };

  const onDelete = async () => {
    try {
      setLoading(true);

      // Use different API endpoint for global categories
      if (data.isGlobal) {
        await axios.delete(`/api/admin/categories/${data.id}`);
      } else {
        await axios.delete(`/api/categories/${data.id}`);
      }

      toast.success("Category deleted successfully.", {
        style: {
          borderRadius: "10px",
          background: "#333",
          color: "#fff",
        },
      });
      setOpen(false);
      setTimeout(() => {
        router.refresh();
        router.push('/dashboard/categories');
      }, 200);
    } catch (error) {
      toast.error("Failed to delete category. Please try again.");
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AlertModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={onDelete}
        loading={loading}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open Menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => onCopy(data.id)}>
            <Copy className="mr-2 h-4 w-4" />
            Copy Id
          </DropdownMenuItem>

          {/* Only show edit/delete for admin users */}
          {isAdmin && (
            <>
              <DropdownMenuItem
                onClick={() => {
                  if (data.isGlobal) {
                    // For global categories, redirect to admin panel
                    router.push('/admin');
                  } else {
                    router.push(`/dashboard/categories/${data.id}`);
                  }
                }}
              >
                <Edit className="mr-2 h-4 w-4" />
                {data.isGlobal ? "Manage in Admin" : "Update"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setTimeout(() => {
                    setOpen(true);
                  }, 50);
                }}
              >
                <Trash className="mr-2 h-4 w-4" />
                Poistaa
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};
