"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type DirtyEntry = {
  isDirty: boolean;
  onDiscard?: () => void;
};

type PendingLeave = {
  action: () => void;
  entryIds?: string[];
};

type UnsavedChangesContextValue = {
  updateEntry: (id: string, entry: DirtyEntry) => void;
  removeEntry: (id: string) => void;
  clearEntry: (id: string) => void;
  requestLeave: (action: () => void, entryIds?: string[]) => void;
};

const UnsavedChangesContext = createContext<UnsavedChangesContextValue | null>(null);

export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const entriesRef = useRef(new Map<string, DirtyEntry>());
  const pendingLeaveRef = useRef<PendingLeave | null>(null);
  const [dirtyVersion, setDirtyVersion] = useState(0);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const notifyEntriesChanged = useCallback(() => {
    setDirtyVersion((version) => version + 1);
  }, []);

  const updateEntry = useCallback((id: string, entry: DirtyEntry) => {
    const previous = entriesRef.current.get(id);
    entriesRef.current.set(id, entry);
    if (previous?.isDirty !== entry.isDirty) notifyEntriesChanged();
  }, [notifyEntriesChanged]);

  const removeEntry = useCallback((id: string) => {
    const wasDirty = entriesRef.current.get(id)?.isDirty;
    entriesRef.current.delete(id);
    if (wasDirty) notifyEntriesChanged();
  }, [notifyEntriesChanged]);

  const clearEntry = useCallback((id: string) => {
    const entry = entriesRef.current.get(id);
    if (!entry?.isDirty) return;
    entriesRef.current.set(id, { ...entry, isDirty: false });
    notifyEntriesChanged();
  }, [notifyEntriesChanged]);

  const requestLeave = useCallback((action: () => void, entryIds?: string[]) => {
    const candidates = entryIds
      ? entryIds.map((id) => [id, entriesRef.current.get(id)] as const)
      : Array.from(entriesRef.current.entries());
    const dirtyEntries = candidates.filter(([, entry]) => entry?.isDirty);

    if (dirtyEntries.length === 0) {
      action();
      return;
    }

    pendingLeaveRef.current = { action, entryIds: dirtyEntries.map(([id]) => id) };
    setIsConfirmOpen(true);
  }, []);

  const hasDirtyChanges = useMemo(
    () => Array.from(entriesRef.current.values()).some((entry) => entry.isDirty),
    [dirtyVersion],
  );

  useEffect(() => {
    if (!hasDirtyChanges) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    const handleLinkClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!target || target.target === "_blank" || target.hasAttribute("download")) return;

      const destination = new URL(target.href, window.location.href);
      const current = new URL(window.location.href);
      if (destination.origin !== current.origin || destination.href === current.href) return;

      event.preventDefault();
      event.stopPropagation();
      requestLeave(() => router.push(`${destination.pathname}${destination.search}${destination.hash}`));
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleLinkClick, true);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleLinkClick, true);
    };
  }, [hasDirtyChanges, requestLeave, router]);

  const keepEditing = () => {
    pendingLeaveRef.current = null;
    setIsConfirmOpen(false);
  };

  const leaveWithoutSaving = () => {
    const pending = pendingLeaveRef.current;
    if (!pending) return;

    const ids = pending.entryIds ?? Array.from(entriesRef.current.keys());
    ids.forEach((id) => {
      const entry = entriesRef.current.get(id);
      entry?.onDiscard?.();
      if (entry) entriesRef.current.set(id, { ...entry, isDirty: false });
    });
    notifyEntriesChanged();
    pendingLeaveRef.current = null;
    setIsConfirmOpen(false);
    window.requestAnimationFrame(pending.action);
  };

  const value = useMemo(
    () => ({ updateEntry, removeEntry, clearEntry, requestLeave }),
    [clearEntry, removeEntry, requestLeave, updateEntry],
  );

  return (
    <UnsavedChangesContext.Provider value={value}>
      {children}
      <Dialog open={isConfirmOpen} onOpenChange={(open) => { if (!open) keepEditing(); }}>
        <DialogContent className="sm:max-w-md" onEscapeKeyDown={(event) => event.preventDefault()} onPointerDownOutside={(event) => event.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Leave without saving?</DialogTitle>
            <DialogDescription>
              You have unsaved changes. If you leave now, the information you entered will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button variant="outline" onClick={keepEditing}>Keep editing</Button>
            <Button variant="destructive" onClick={leaveWithoutSaving}>Leave without saving</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </UnsavedChangesContext.Provider>
  );
}

export function useUnsavedChanges({
  isDirty,
  onDiscard,
}: {
  isDirty: boolean;
  onDiscard?: () => void;
}) {
  const context = useContext(UnsavedChangesContext);
  const id = useId();
  const onDiscardRef = useRef(onDiscard);
  onDiscardRef.current = onDiscard;

  if (!context) throw new Error("useUnsavedChanges must be used inside UnsavedChangesProvider");

  useEffect(() => {
    context.updateEntry(id, { isDirty, onDiscard: () => onDiscardRef.current?.() });
  }, [context, id, isDirty]);

  useEffect(() => () => context.removeEntry(id), [context, id]);

  return {
    clearUnsavedChanges: useCallback(() => context.clearEntry(id), [context, id]),
    confirmDiscard: useCallback((action: () => void) => context.requestLeave(action, [id]), [context, id]),
  };
}
