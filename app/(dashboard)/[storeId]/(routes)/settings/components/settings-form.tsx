"use client";
import * as z from "zod";

import { Store } from "@prisma/client";
import { Trash } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import axios from "axios";

import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import toast from "react-hot-toast";
import { useParams, useRouter } from "next/navigation";
import { AlertModal } from "@/components/modals/alert-modal";
import { ApiAlert } from "@/components/ui/api-alert";
import { useOrigin } from "@/hooks/use-origin";

interface SettingsFormProps {
  initialData: Store;
}

const formSchema = z.object({
  name: z.string().min(1),
});

type SettingsFormValues = z.infer<typeof formSchema>;

export const SettingsForm: React.FC<SettingsFormProps> = ({ initialData }) => {
  const params = useParams();
  const router = useRouter();
  const origin = useOrigin();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData,
  });

  const onSubmit = async (data: SettingsFormValues) => {
    try {
      setLoading(true);
      await axios.patch(`/api/stores/${params.storeId}`, data);
      router.refresh();
      toast.success('Store updated.',
      {
        style: {
          borderRadius: '10px',
          background: '#333',
          color: '#fff',
        },
      }
    )
    } catch (error) {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async () => {
    try {
      setLoading(true);
      await axios.delete(`/api/stores/${params.storeId}`);
      router.refresh();
      router.push("/");
      toast.success("Store deleted.");
    } catch (error) {
      toast.error("Make sure to remove all products and categories first.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <AlertModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={onDelete}
        loading={loading}
      />
      
      {/* Header Section - Optimized for mobile */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <Heading 
          title="Settings"
        />
        <Button
          disabled={loading}
          variant="destructive"
          size="sm"
          onClick={() => setOpen(true)}
          className="w-full sm:w-auto order-last sm:order-none"
        >
          <Trash className="h-4 w-4 mr-2" />
          Delete Store
        </Button>
      </div>
      
      <Separator className="mb-6" />
      
      {/* Main content container with proper bottom padding for mobile */}
      <div className="pb-20 md:pb-0">
        <Form {...form}>
          <form
            id="settings-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6 w-full"
          >
            {/* Form Fields - Mobile first approach */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2 lg:col-span-1">
                    <FormLabel>Store Name</FormLabel>
                    <FormControl>
                      <Input
                        disabled={loading}
                        placeholder="Enter store name"
                        {...field}
                        className="w-full"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Desktop Submit Button */}
            <div className="flex justify-end">
              <Button 
                disabled={loading} 
                className="hidden md:flex w-full md:w-auto" 
                type="submit"
              >
                Save changes
              </Button>
            </div>
          </form>
        </Form>
        
        <Separator className="my-6" />
        
        {/* API Alert - Mobile responsive with overflow handling */}
        <div className="w-full overflow-hidden">
          <div className="max-w-full break-all">
            <ApiAlert 
              title="NEXT_PUBLIC_API_URL" 
              description={`${origin}/api/${params.storeId}`} 
              variant="public" 
            />
          </div>
        </div>
      </div>
      
      {/* Mobile Sticky Bottom Button - Fixed positioning */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-t border-gray-200 p-4 shadow-lg safe-area-padding-bottom">
        <Button 
          disabled={loading} 
          className="w-full h-12 text-base font-medium" 
          type="submit" 
          form="settings-form"
        >
          Save changes
        </Button>
      </div>
    </div>
  );
};