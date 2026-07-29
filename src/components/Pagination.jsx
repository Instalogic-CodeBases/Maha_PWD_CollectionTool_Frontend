// Prev / Next pagination bar. Renders nothing when there are no rows.
export default function Pagination({ page, pageCount, total, pageSize = 10, onChange }) {
  if (!total) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="pagination">
      <span className="pagination-info">Showing {from}–{to} of {total}</span>
      <div className="pagination-btns">
        <button className="btn btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>‹ Prev</button>
        <span className="pagination-page">Page {page} of {pageCount}</span>
        <button className="btn btn-sm" disabled={page >= pageCount} onClick={() => onChange(page + 1)}>Next ›</button>
      </div>
    </div>
  );
}