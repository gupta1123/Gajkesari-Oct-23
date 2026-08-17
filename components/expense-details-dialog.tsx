"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Download, ImageIcon, IndianRupee, ReceiptText } from "lucide-react";
import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface ExpensePhotoAttachment {
  fileName: string;
  fileDownloadUri: string;
  fileType: string;
  tag?: string;
  size?: number;
}

export interface ExpenseViewModel {
  id: number;
  date: string;
  category: string;
  amount: number;
  description: string;
  status: "approved" | "pending" | "rejected";
  employeeName: string;
  employeePosition: string;
  attachments: ExpensePhotoAttachment[];
}

interface ExpenseDetailsDialogProps {
  expense: ExpenseViewModel | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const imageExtensions = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic", ".heif"];

function isImageAttachment(attachment: ExpensePhotoAttachment) {
  const fileType = attachment.fileType?.toLowerCase() ?? "";
  const fileName = attachment.fileName?.toLowerCase() ?? "";

  return fileType.startsWith("image/") || imageExtensions.some((extension) => fileName.endsWith(extension));
}

function formatFileSize(size?: number) {
  if (!size || size <= 0) return null;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ExpenseDetailsDialog({
  expense,
  open,
  onOpenChange,
}: ExpenseDetailsDialogProps) {
  const photos = useMemo(
    () => (expense?.attachments ?? []).filter(isImageAttachment),
    [expense?.attachments],
  );
  const selectedPhoto = photos[0] ?? null;
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isPhotoLoading, setIsPhotoLoading] = useState(false);
  const [photoLoadFailed, setPhotoLoadFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | null = null;

    setPhotoUrl(null);
    setPhotoLoadFailed(false);
    setIsPhotoLoading(Boolean(open && expense && selectedPhoto));

    if (!open || !expense || !selectedPhoto) {
      return () => controller.abort();
    }

    const loadPhoto = async () => {
      const token = localStorage.getItem("authToken");
      if (!token) {
        setIsPhotoLoading(false);
        setPhotoLoadFailed(true);
        return;
      }

      try {
        const response = await fetch(
          `https://api.gajkesaristeels.in/expense/downloadFile/${expense.id}/expense/${encodeURIComponent(selectedPhoto.fileName)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          throw new Error(`Failed to load expense photo (${response.status}).`);
        }

        objectUrl = URL.createObjectURL(await response.blob());
        setPhotoUrl(objectUrl);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setPhotoLoadFailed(true);
        }
      } finally {
        if (!controller.signal.aborted) setIsPhotoLoading(false);
      }
    };

    loadPhoto();

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [expense, open, selectedPhoto]);

  const downloadPhoto = () => {
    if (!selectedPhoto || !photoUrl) return;

    const link = document.createElement("a");
    link.href = photoUrl;
    link.download = selectedPhoto.fileName || `expense-${expense?.id}-photo`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!expense) return null;

  const statusStyles = {
    approved: "border-green-200 bg-green-50 text-green-800",
    pending: "border-yellow-200 bg-yellow-50 text-yellow-800",
    rejected: "border-red-200 bg-red-50 text-red-800",
  } as const;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto p-0 sm:max-w-3xl">
        <DialogHeader className="border-b px-6 py-5 pr-14">
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle>Expense Details</DialogTitle>
            <Badge variant="outline" className={cn("capitalize", statusStyles[expense.status])}>
              {expense.status}
            </Badge>
          </div>
          <DialogDescription>
            Submitted by {expense.employeeName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 px-6 py-5">
          <section className="grid gap-x-8 gap-y-5 border-b pb-6 sm:grid-cols-2">
            <div className="flex gap-3">
              <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase text-muted-foreground">Expense date</p>
                <p className="mt-1 text-sm font-medium">{format(new Date(expense.date), "dd MMM yyyy")}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <IndianRupee className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase text-muted-foreground">Amount</p>
                <p className="mt-1 text-sm font-semibold">₹{(expense.amount || 0).toFixed(2)}</p>
              </div>
            </div>
            <div className="flex gap-3 sm:col-span-2">
              <ReceiptText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase text-muted-foreground">Category</p>
                <p className="mt-1 text-sm font-medium">{expense.category || "Not provided"}</p>
              </div>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs font-medium uppercase text-muted-foreground">Description</p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-6">
                {expense.description || "No description provided."}
              </p>
            </div>
          </section>

          <section aria-labelledby="expense-photo-heading" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 id="expense-photo-heading" className="text-sm font-semibold">Expense photo</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {selectedPhoto
                    ? "1 saved photo"
                    : "No photo is attached to this expense."}
                </p>
              </div>
              {selectedPhoto && photoUrl && (
                <Button type="button" variant="outline" size="sm" onClick={downloadPhoto}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              )}
            </div>

            <div className="relative flex min-h-72 items-center justify-center overflow-hidden rounded-md border bg-muted/30">
              {isPhotoLoading && <Skeleton className="absolute inset-0 h-full w-full rounded-none" />}

              {photoUrl && !photoLoadFailed ? (
                <img
                  key={photoUrl}
                  src={photoUrl}
                  alt={`Receipt for ${expense.category}`}
                  className={cn(
                    "max-h-[28rem] w-full object-contain transition-opacity",
                    isPhotoLoading ? "opacity-0" : "opacity-100",
                  )}
                  onLoad={() => setIsPhotoLoading(false)}
                  onError={() => {
                    setIsPhotoLoading(false);
                    setPhotoLoadFailed(true);
                  }}
                />
              ) : (
                <div className="flex max-w-sm flex-col items-center px-6 py-12 text-center">
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  <p className="mt-3 text-sm font-medium">
                    {photoLoadFailed ? "Unable to load expense photo" : "No expense photo saved"}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {photoLoadFailed
                      ? "The saved photo could not be retrieved. Try again after the photo API is connected."
                      : "A submitted expense photo will appear here."}
                  </p>
                </div>
              )}
            </div>

            {selectedPhoto && (
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span className="max-w-full truncate">{selectedPhoto.fileName}</span>
                {formatFileSize(selectedPhoto.size) && <span>{formatFileSize(selectedPhoto.size)}</span>}
              </div>
            )}

          </section>
        </div>

        <DialogFooter className="border-t px-6 py-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
