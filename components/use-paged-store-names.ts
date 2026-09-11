'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { InputActionMeta } from 'react-select';
import { API, type StoreNameDto } from '@/lib/api';

interface UsePagedStoreNamesOptions {
  enabled: boolean;
  employeeId?: number;
  allowUnscoped?: boolean;
  debounceMs?: number;
  pageSize?: number;
}

const mergeUniqueStores = (current: StoreNameDto[], incoming: StoreNameDto[]) => {
  const storesById = new Map(current.map((store) => [store.id, store]));
  incoming.forEach((store) => storesById.set(store.id, store));
  return Array.from(storesById.values());
};

export const usePagedStoreNames = ({
  enabled,
  employeeId,
  allowUnscoped = false,
  debounceMs = 350,
  pageSize = 100,
}: UsePagedStoreNamesOptions) => {
  const [stores, setStores] = useState<StoreNameDto[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestVersionRef = useRef(0);
  const nextPageRef = useRef(1);
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    const requestVersion = ++requestVersionRef.current;
    nextPageRef.current = 1;
    loadingMoreRef.current = false;
    setStores([]);
    setHasMore(false);
    setIsLoadingMore(false);
    setError(null);

    if (!enabled || (!employeeId && !allowUnscoped)) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await API.getStoreNamesPage(employeeId, searchInput, 0, pageSize);
        if (requestVersionRef.current !== requestVersion) return;

        setStores(response.content);
        nextPageRef.current = 1;
        setHasMore(!response.last && response.totalPages > 1);
      } catch (loadError) {
        if (requestVersionRef.current !== requestVersion) return;
        console.error('Error fetching employee stores:', loadError);
        setError('Failed to load stores');
      } finally {
        if (requestVersionRef.current === requestVersion) {
          setIsLoading(false);
        }
      }
    }, debounceMs);

    return () => window.clearTimeout(timeoutId);
  }, [allowUnscoped, debounceMs, employeeId, enabled, pageSize, searchInput]);

  const loadMore = useCallback(async () => {
    if (!enabled || (!employeeId && !allowUnscoped) || !hasMore || isLoading || loadingMoreRef.current) return;

    const requestVersion = requestVersionRef.current;
    const page = nextPageRef.current;
    loadingMoreRef.current = true;
    setIsLoadingMore(true);

    try {
      const response = await API.getStoreNamesPage(employeeId, searchInput, page, pageSize);
      if (requestVersionRef.current !== requestVersion) return;

      setStores((current) => mergeUniqueStores(current, response.content));
      nextPageRef.current = page + 1;
      setHasMore(!response.last && page + 1 < response.totalPages);
    } catch (loadError) {
      if (requestVersionRef.current !== requestVersion) return;
      console.error('Error fetching more employee stores:', loadError);
      setError('Failed to load more stores');
    } finally {
      loadingMoreRef.current = false;
      if (requestVersionRef.current === requestVersion) {
        setIsLoadingMore(false);
      }
    }
  }, [allowUnscoped, employeeId, enabled, hasMore, isLoading, pageSize, searchInput]);

  const onInputChange = useCallback((inputValue: string, actionMeta: InputActionMeta) => {
    if (actionMeta.action === 'input-change' || actionMeta.action === 'set-value') {
      setSearchInput(inputValue);
    }
    return inputValue;
  }, []);

  const reset = useCallback(() => {
    requestVersionRef.current += 1;
    nextPageRef.current = 1;
    loadingMoreRef.current = false;
    setStores([]);
    setSearchInput('');
    setIsLoading(false);
    setIsLoadingMore(false);
    setHasMore(false);
    setError(null);
  }, []);

  return {
    stores,
    searchInput,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    loadMore,
    onInputChange,
    reset,
  };
};
