"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, X } from "lucide-react";

const ACCEPTED_TYPES = ["image/png", "image/jpeg"];

type ImageUploadProps = {
  value: File[];
  onChange: (files: File[]) => void;
  maxFiles?: number;
};

export function ImageUpload({ value, onChange, maxFiles = 10 }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const atLimit = value.length >= maxFiles;

  function addFiles(fileList: FileList | null) {
    if (!fileList) return;
    const incoming = Array.from(fileList).filter((file) =>
      ACCEPTED_TYPES.includes(file.type),
    );
    onChange([...value, ...incoming].slice(0, maxFiles));
  }

  function removeAt(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          addFiles(e.dataTransfer.files);
        }}
        disabled={atLimit}
        className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-input px-4 py-8 text-center transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
      >
        <ImagePlus className="size-6 text-muted-foreground" />
        <p className="text-sm">
          <span className="font-medium text-foreground">Click to upload</span>{" "}
          <span className="text-muted-foreground">or drag and drop</span>
        </p>
        <p className="text-xs text-muted-foreground">
          PNG or JPEG, up to {maxFiles} photos
        </p>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg"
        multiple
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {value.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {value.map((file, index) => (
            <ImagePreview
              key={`${file.name}-${file.lastModified}-${file.size}`}
              file={file}
              onRemove={() => removeAt(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ImagePreview({
  file,
  onRemove,
}: {
  file: File;
  onRemove: () => void;
}) {
  // Object URLs are cheap and scoped to this tab/page; the browser reclaims
  // them on navigation, so there's no need to revoke them by hand here.
  const [url] = useState(() => URL.createObjectURL(file));

  return (
    <div className="group relative aspect-square overflow-hidden rounded-lg ring-1 ring-foreground/10">
      {/* Local blob preview: the Next.js image optimizer can't fetch a
          client-only blob URL, so this stays unoptimized. Real AVIF/WebP
          transcoding happens once these are uploaded and rendered from a
          hosted URL elsewhere. */}
      <Image
        src={url}
        alt={file.name}
        fill
        unoptimized
        sizes="(min-width: 640px) 25vw, 33vw"
        className="object-cover"
      />
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${file.name}`}
        className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm transition-colors hover:bg-destructive hover:text-destructive-foreground"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
