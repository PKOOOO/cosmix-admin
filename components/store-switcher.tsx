"use client";

import {
  Check,
  ChevronsUpDown,
  PlusCircle,
  Store as StoreIcon,
} from "lucide-react";
import { useState } from "react";
import { Store } from "@prisma/client";
import { useParams, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useStoreModal } from "@/hooks/use-store-modal";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

type PopoverTriggerProps = React.ComponentPropsWithoutRef<
  typeof PopoverTrigger
>;

interface StoreSwitcherProps extends PopoverTriggerProps {
  items: Store[];
}

export default function StoreSwitcher({
  className,
  items = [],
}: StoreSwitcherProps) {
  const storeModal = useStoreModal();
  const params = useParams();
  const router = useRouter();

  const formattedItems = items.map((item) => ({
    label: item.name,
    value: item.id,
  }));

  const currentStore = formattedItems.find(
    (item) => item.value === params.storeId
  );

  const [open, setOpen] = useState(false);

  const onStoreSelect = (store: { value: string; label: string }) => {
    setOpen(false);
    router.push(`/${store.value}`);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          role="combobox"
          aria-expanded={open}
          aria-label="Select a store"
          className={cn("w-full md:w-[200px] justify-between h-10 md:h-8 text-sm md:text-xs", className)}
        >
          <StoreIcon className="mr-2 h-4 w-4" />
          <span className="truncate">{currentStore?.label}</span>
          <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] md:w-[200px] p-0">
        <Command>
          <CommandList>
            <CommandInput placeholder="Search store..." className="h-9 md:h-8" />
            {formattedItems.length === 0 && <CommandEmpty>No store found</CommandEmpty>}
            <CommandGroup heading="Stores">
              {formattedItems.map((store) => (
                <div
                  key={store.value}
                  className="text-sm cursor-pointer flex items-center p-3 md:p-2 hover:bg-gray-100 min-h-[44px] md:min-h-0"
                  onClick={() => onStoreSelect(store)}
                >
                  <StoreIcon className="mr-3 md:mr-2 h-4 w-4" />
                  <span className="flex-1 truncate">{store.label}</span>
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      currentStore?.value === store.value
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                </div>
              ))}
            </CommandGroup>
          </CommandList>

          <CommandSeparator />
          <CommandList>
            <CommandGroup>
              <div
                className="flex items-center cursor-pointer p-3 md:p-2 hover:bg-gray-100 min-h-[44px] md:min-h-0"
                onClick={() => {
                  setOpen(false);
                  storeModal.onOpen();
                }}
              >
                <PlusCircle className="mr-3 md:mr-2 h-5 w-5" />
                <span>Create Store</span>
              </div>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
