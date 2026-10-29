"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, ArrowRightLeft, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { API } from '@/lib/api';
import {
  reassignStoresAfterReview,
  type OngoingStoreVisit,
  type StoreReassignmentSelection,
} from '@/lib/store-reassignment';
import { getUserFacingErrorMessage } from '@/lib/user-facing-error';

type ReviewState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; visits: OngoingStoreVisit[] };

function checkinLabel(visit: OngoingStoreVisit) {
  const dateText = visit.checkinDate || visit.visitDate;
  let dateLabel = '';
  if (dateText) {
    const date = parseISO(dateText);
    dateLabel = isValid(date) ? format(date, 'dd MMM yyyy') : dateText;
  }

  const timeText = visit.checkinTime
    || (visit.checkinDate?.includes('T') ? visit.checkinDate.split('T')[1] : null);
  let timeLabel = '';
  if (timeText) {
    const time = parseISO(`2000-01-01T${timeText}`);
    timeLabel = isValid(time) ? format(time, 'h:mm a') : timeText;
  }

  if (!visit.checkinDate && !visit.checkinTime) {
    return dateLabel ? `Visit date: ${dateLabel}` : 'Check-in not provided';
  }
  return [dateLabel, timeLabel].filter(Boolean).join(' · ') || 'Check-in not provided';
}

export function StoreReassignmentDialog({
  selection,
  onCancel,
  onReassigned,
}: {
  selection: StoreReassignmentSelection;
  onCancel: () => void;
  onReassigned: (selection: StoreReassignmentSelection) => void;
}) {
  const [review, setReview] = useState<ReviewState>({ status: 'loading' });
  const [isReassigning, setIsReassigning] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reviewNotice, setReviewNotice] = useState<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const submittingRef = useRef(false);

  const getOngoingVisits = useCallback((signal?: AbortSignal) =>
    selection.storeIds.length === 1
      ? API.getStoreOngoingVisits(selection.storeIds[0], signal)
      : API.getStoresOngoingVisits(selection.storeIds, signal),
  [selection]);

  const loadReview = useCallback(async () => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setReview({ status: 'loading' });
    setActionError(null);
    setReviewNotice(null);

    try {
      const visits = await getOngoingVisits(controller.signal);
      if (!controller.signal.aborted) setReview({ status: 'ready', visits });
    } catch (error) {
      if (!controller.signal.aborted) {
        setReview({
          status: 'error',
          message: getUserFacingErrorMessage(error, 'The ongoing visits could not be checked. Please try again.'),
        });
      }
    }
  }, [getOngoingVisits]);

  useEffect(() => {
    void loadReview();
    return () => requestRef.current?.abort();
  }, [loadReview]);

  const confirmReassignment = async () => {
    if (review.status !== 'ready' || submittingRef.current) return;
    submittingRef.current = true;
    setIsReassigning(true);
    setActionError(null);
    setReviewNotice(null);

    try {
      const result = await reassignStoresAfterReview(selection, review.visits, {
        getOngoingVisits: () => getOngoingVisits(),
        reassign: (payload) => API.bulkEditStoreEmployee(payload),
      });
      if (result.status === 'review-changed') {
        setReview({ status: 'ready', visits: result.visits });
        setReviewNotice('The ongoing visits have changed. Review the updated list, then click Reassign to continue.');
      } else {
        onReassigned(selection);
      }
    } catch (error) {
      // Keep the selection and dialog available for review/retry after a failure.
      setActionError(getUserFacingErrorMessage(error, 'The stores could not be reassigned. Please try again.'));
    } finally {
      submittingRef.current = false;
      setIsReassigning(false);
    }
  };

  const storeCount = selection.storeIds.length;
  const visits = review.status === 'ready' ? review.visits : [];
  const affectedStoreCount = new Set(visits.map((visit) => visit.storeId)).size;

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !submittingRef.current) onCancel(); }}>
      <DialogContent
        className="flex max-h-[90dvh] flex-col overflow-hidden sm:max-w-2xl [&_p]:!mt-0 [&_p]:leading-5"
        showCloseButton={!isReassigning}
        onEscapeKeyDown={(event) => { if (submittingRef.current) event.preventDefault(); }}
        onInteractOutside={(event) => { if (submittingRef.current) event.preventDefault(); }}
      >
        <DialogHeader className="shrink-0 pr-5 text-left">
          <DialogTitle>Review store reassignment</DialogTitle>
          <DialogDescription>
            Move {storeCount} {storeCount === 1 ? 'store' : 'stores'} from{' '}
            <span className="font-medium text-foreground">{selection.sourceEmployeeName}</span> to{' '}
            <span className="font-medium text-foreground">{selection.targetEmployeeName}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 space-y-4 overflow-y-auto">
          {review.status === 'loading' && (
            <div role="status" className="flex items-center gap-3 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
              Checking ongoing visits for all {storeCount} selected {storeCount === 1 ? 'store' : 'stores'}...
            </div>
          )}

          {review.status === 'error' && (
            <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <p className="font-medium text-destructive">Unable to check ongoing visits</p>
              <p className="text-sm text-destructive">{review.message}</p>
              <p className="text-sm text-muted-foreground">Check the visits successfully before reassigning these stores.</p>
              <Button type="button" variant="outline" size="sm" onClick={() => void loadReview()}>
                <RefreshCw className="mr-2 h-4 w-4" /> Try again
              </Button>
            </div>
          )}

          {review.status === 'ready' && (
            <>
              {visits.length > 0 ? (
                <>
                  <div className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-400" />
                    <div className="flex flex-col gap-1 text-sm">
                      <p className="font-semibold">{visits.length} ongoing {visits.length === 1 ? 'visit' : 'visits'} across {affectedStoreCount} selected {affectedStoreCount === 1 ? 'store' : 'stores'}</p>
                      <p className="text-muted-foreground">When you click Reassign, all ongoing visits listed below will be <strong className="font-semibold text-foreground">marked as completed</strong>, and all {storeCount} selected {storeCount === 1 ? 'store' : 'stores'} will be reassigned to {selection.targetEmployeeName}.</p>
                    </div>
                  </div>
                  <div className="hidden overflow-x-auto sm:block">
                    <Table className="min-w-[500px] text-xs">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[34%]">Store</TableHead>
                          <TableHead>Field officer</TableHead>
                          <TableHead>Check-in</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {visits.map((visit) => (
                          <TableRow key={visit.visitId}>
                            <TableCell className="whitespace-normal break-words align-top">
                              <span className="block font-medium">{visit.storeName || selection.storeNames[visit.storeId] || `Store ${visit.storeId}`}</span>
                              <span className="mt-1 block text-muted-foreground">Store #{visit.storeId} · Visit #{visit.visitId}</span>
                            </TableCell>
                            <TableCell className="whitespace-normal break-words align-top">
                              {visit.employeeName || (visit.employeeId ? `Employee #${visit.employeeId}` : 'Not provided')}
                            </TableCell>
                            <TableCell className="whitespace-normal align-top">{checkinLabel(visit)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="divide-y border-y sm:hidden">
                    {visits.map((visit) => (
                      <div key={visit.visitId} className="space-y-1.5 py-3 text-xs">
                        <span className="block break-words text-sm font-medium">{visit.storeName || selection.storeNames[visit.storeId] || `Store ${visit.storeId}`}</span>
                        <span className="block text-muted-foreground">Store #{visit.storeId} · Visit #{visit.visitId}</span>
                        <span className="block break-words"><span className="text-muted-foreground">Field officer: </span>{visit.employeeName || (visit.employeeId ? `Employee #${visit.employeeId}` : 'Not provided')}</span>
                        <span className="block"><span className="text-muted-foreground">Check-in: </span>{checkinLabel(visit)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-4 text-sm">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <div className="flex flex-col gap-1">
                    <p className="font-medium">No ongoing visits for the selected stores</p>
                    <p className="text-muted-foreground">All {storeCount} selected {storeCount === 1 ? 'store will' : 'stores will'} be reassigned to {selection.targetEmployeeName}.</p>
                  </div>
                </div>
              )}
            </>
          )}

          {reviewNotice && <p role="status" className="text-sm font-medium text-amber-700 dark:text-amber-400">{reviewNotice}</p>}
          {actionError && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{actionError}</p>}
        </div>

        <DialogFooter className="shrink-0 border-t pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isReassigning}>Cancel</Button>
          <Button type="button" onClick={() => void confirmReassignment()} disabled={review.status !== 'ready' || isReassigning}>
            {isReassigning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRightLeft className="mr-2 h-4 w-4" />}
            {isReassigning ? 'Reassigning...' : 'Reassign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
