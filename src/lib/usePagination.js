import { useEffect, useMemo, useState } from 'react';

// Small client-side pagination helper.
// - `rows`: the already-filtered array to paginate.
// - `pageSize`: records per page (default 10).
// - `resetKey`: when this value changes (e.g. the search query), jump back to page 1.
export function usePagination(rows, pageSize = 10, resetKey) {
  const [page, setPage] = useState(1);

  // Reset to the first page whenever the underlying filter changes.
  useEffect(() => { setPage(1); }, [resetKey]);

  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  // Clamp the page if the row count shrank below the current page.
  useEffect(() => { if (page > pageCount) setPage(pageCount); }, [pageCount, page]);

  const start = (page - 1) * pageSize;
  const pageRows = useMemo(() => rows.slice(start, start + pageSize), [rows, start, pageSize]);

  return { page, setPage, pageCount, total, pageSize, start, pageRows };
}