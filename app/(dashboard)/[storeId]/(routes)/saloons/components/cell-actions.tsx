// app\(dashboard)\[storeId]\(routes)\saloons\components\cell-action.tsx
"use client";
import axios from "axios";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SaloonColumn } from "./columns";
import { Button } from "@/components/ui/button";
import { Copy, Edit, MoreHorizontal, Trash, DollarSign } from "lucide-react";
import toast from "react-hot-toast";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { AlertModal } from "@/components/modals/alert-modal";
import { useStoreModal } from "@/hooks/use-store-modal";

interface CellActionProps {
  data: SaloonColumn;
}

export const CellAction: React.FC<CellActionProps> = ({ data }) => {
  const router = useRouter();
  const params = useParams();
  const storeModal = useStoreModal();

  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const onCopy = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success("Saloon ID copied to clipboard.", {
      style: {
        borderRadius: "10px",
        background: "#333",
        color: "#fff",
      },
    });
  };

  const onSetPrices = () => {
    // Navigate to pricing page for this saloon
    router.push(`/${params.storeId}/saloons/${data.id}/pricing`);
  };

  const onDelete = async () => {
    try {
      setLoading(true);
      const response = await axios.delete(`/api/${params.storeId}/saloons/${data.id}`);
      
      // Check if user has remaining salons
      if (!response.data.hasRemainingSaloons) {
        // No remaining salons, show salon creation modal
        toast.success("Saloon deleted. Please create a new salon to continue.", {
          style: {
            borderRadius: "10px",
            background: "#333",
            color: "#fff",
          },
        });
        // Close modal and navigate to salon creation page
        setOpen(false);
        setTimeout(() => {
          router.push(`/${params.storeId}/saloons/new`);
        }, 200);
      } else {
        // Has remaining salons, navigate normally
        toast.success("Saloon Deleted", {
          style: {
            borderRadius: "10px",
            background: "#333",
            color: "#fff",
          },
        });
        setOpen(false);
        setTimeout(() => {
          router.refresh();
          router.push(`/${params.storeId}/saloons`);
        }, 200);
      }
    } catch (error) {
      toast.error(
        "Failed to delete saloon. Please try again."
      );
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
          <DropdownMenuItem
            onClick={() =>
              router.push(`/${params.storeId}/saloons/${data.id}`)
            }
          >
            <Edit className="mr-2 h-4 w-4" />
            Update
          </DropdownMenuItem>
          {data.subServices.length > 0 && (
            <DropdownMenuItem onClick={onSetPrices}>
              <DollarSign className="mr-2 h-4 w-4" />
              Set Prices
            </DropdownMenuItem>
          )}
          <DropdownMenuItem 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              // Small delay to ensure dropdown closes before modal opens
              setTimeout(() => {
                setOpen(true);
              }, 50);
            }}
          >
            <Trash className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};