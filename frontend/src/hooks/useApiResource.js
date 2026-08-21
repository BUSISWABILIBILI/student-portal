import { useCallback, useEffect, useState } from "react";

import api, { getErrorMessage } from "../lib/api";

export function useApiResource(path, fallbackValue, options = {}) {
  const { enabled = true } = options;
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [state, setState] = useState({
    data: fallbackValue,
    error: "",
    isLoading: true,
  });

  useEffect(() => {
    if (!enabled || !path) {
      setState({
        data: fallbackValue,
        error: "",
        isLoading: false,
      });

      return undefined;
    }

    let cancelled = false;

    const loadResource = async () => {
      setState({
        data: fallbackValue,
        error: "",
        isLoading: true,
      });

      try {
        const response = await api.get(path);

        if (!cancelled) {
          setState({
            data: response.data.data,
            error: "",
            isLoading: false,
          });
        }
      } catch (requestError) {
        if (!cancelled) {
          setState({
            data: fallbackValue,
            error: getErrorMessage(requestError),
            isLoading: false,
          });
        }
      }
    };

    loadResource();

    return () => {
      cancelled = true;
    };
  }, [enabled, fallbackValue, path, refreshIndex]);

  const refetch = useCallback(() => {
    setRefreshIndex((current) => current + 1);
  }, []);

  return {
    ...state,
    refetch,
  };
}
