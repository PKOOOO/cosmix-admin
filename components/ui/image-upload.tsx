import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ImagePlus, Trash } from "lucide-react";
import Image from "next/image";
import { CldUploadWidget } from "next-cloudinary";

interface ImageUploadProps {
  disabled?: boolean;
  onChange: (value: string) => void;
  onRemove: (value: string) => void;
  value: string[];
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  disabled,
  onChange,
  onRemove,
  value,
}) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const onSuccess = (result: any) => {
    onChange(result.info.secure_url);
  }

  if (!isMounted) {
    return null;
  }

  return (
    <div>
      {/* Image Grid - Responsive layout for multiple images */}
      {value.length > 0 && (
        <div className="mb-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {value.map((url, index) => (
            <div
              key={url}
              className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 shadow-sm group"
            >
              <div className="z-10 absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  type="button"
                  onClick={() => onRemove(url)}
                  variant="destructive"
                  size="icon"
                  className="h-8 w-8"
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
              {/* First image indicator */}
              {index === 0 && (
                <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded z-10">
                  Main
                </div>
              )}
              <Image
                fill
                className="object-cover"
                alt={`Image ${index + 1}`}
                src={url}
              />
            </div>
          ))}
        </div>
      )}

      <CldUploadWidget
        onSuccess={onSuccess}
        uploadPreset="mwa8epb4"
        options={{
          multiple: true,
          maxFiles: 10,
          resourceType: "image",
        }}
      >
        {({ open }) => {
          const onClick = () => {
            // Mark widget as open and defer to next tick
            try { (window as any).__cloudinaryOpen = true; } catch { }
            setTimeout(() => open(), 0);
          }

          return (
            <Button
              type="button"
              disabled={disabled}
              variant="secondary"
              onClick={onClick}
              className="w-full sm:w-auto"
            >
              <ImagePlus className="h-4 w-4 mr-2" />
              {value.length > 0 ? "Lisää kuvia" : "Lataa kuvia"}
            </Button>
          )
        }}
      </CldUploadWidget>
      {/* {value.length > 0 && (
        <p className="text-xs text-muted-foreground mt-2">
          {value.length} {value.length === 1 ? 'kuva ladattu' : 'kuvaa ladattu'}
        </p>
      )} */}
      {/* Clear open flag when unmounting */}
      <script dangerouslySetInnerHTML={{ __html: `window.__cloudinaryOpen = false;` }} />
    </div>
  )
};

export default ImageUpload;

