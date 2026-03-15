import { useQuery } from "@apollo/client";
import { CATEGORIES_QUERY } from "./graphql";
import type { Category } from "../../types";

export function useCategories() {
  const { data, loading, error } = useQuery<{ categories: Category[] }>(
    CATEGORIES_QUERY
  );

  return {
    categories: data?.categories ?? [],
    loading,
    error,
  };
}
