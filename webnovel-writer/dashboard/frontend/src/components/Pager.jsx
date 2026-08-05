export default function Pager({
    page,
    totalPages,
    currentStart,
    currentEnd,
    totalItems,
    onPrevious,
    onNext,
    onLatest,
    stepLabel = '50',
}) {
    if (totalItems <= 0) return null

    return (
        <div className="pager">
            <button className="page-btn" type="button" onClick={onPrevious} disabled={page <= 1}>
                ← Prev {stepLabel}
            </button>
            <span className="page-info">
                Ch {currentStart}-{currentEnd} · Page {page}/{totalPages}
            </span>
            <div className="pager-actions">
                <button className="page-btn" type="button" onClick={onNext} disabled={page >= totalPages}>
                    Next →
                </button>
                <button className="page-btn" type="button" onClick={onLatest} disabled={page >= totalPages}>
                    Jump to latest →
                </button>
            </div>
        </div>
    )
}
