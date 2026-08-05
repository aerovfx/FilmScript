import { useMemo, useState } from 'react'
import { useDashboardContext } from '../App.jsx'
import Badge from '../components/Badge.jsx'
import ChartWrapper from '../components/ChartWrapper.jsx'
import DataTable from '../components/DataTable.jsx'
import { FORESHADOWING_COLORS } from '../lib/charts.js'
import { buildForeshadowingRecords, summarizeForeshadowing } from '../lib/foreshadowing.js'
import { formatChapterLabel, formatShortNumber } from '../lib/format.js'

const LEVEL_ORDER = {
    overdue: 4,
    urgent: 3,
    active: 2,
    resolved: 1,
}

function statusTone(level) {
    if (level === 'overdue') return 'red'
    if (level === 'urgent') return 'amber'
    if (level === 'resolved') return 'green'
    return 'blue'
}

function urgencyTone(level) {
    if (level === 'critical') return 'red'
    if (level === 'high') return 'amber'
    if (level === 'medium') return 'amber'
    if (level === 'resolved') return 'green'
    return 'blue'
}

function sortForeshadowing(left, right) {
    const order = (LEVEL_ORDER[right.level] || 0) - (LEVEL_ORDER[left.level] || 0)
    if (order !== 0) return order
    if ((left.targetChapter || 0) !== (right.targetChapter || 0)) {
        return (left.targetChapter || Number.MAX_SAFE_INTEGER) - (right.targetChapter || Number.MAX_SAFE_INTEGER)
    }
    return (right.urgencyScore || 0) - (left.urgencyScore || 0)
}

function buildGanttOption(rows, currentChapter) {
    const chapters = rows.flatMap(row => [
        row.plantedChapter || currentChapter,
        row.targetChapter || row.resolvedChapter || currentChapter,
        currentChapter,
    ])
    const minChapter = Math.max(1, Math.min(...chapters) - 5)
    const maxChapter = Math.max(...chapters) + 5

    return {
        tooltip: {
            formatter: params => {
                const rowIndex = Array.isArray(params.value) ? params.value[0] : params.dataIndex
                const row = rows[rowIndex]
                if (!row) return 'Foreshadowing'
                return `${row.content}<br/>${row.statusText} · ${formatChapterLabel(row.plantedChapter)} → ${formatChapterLabel(row.targetChapter || row.resolvedChapter)}`
            },
        },
        grid: { left: 160, right: 28, top: 12, bottom: 44 },
        xAxis: {
            type: 'value',
            min: minChapter,
            max: maxChapter,
            axisLabel: {
                formatter: value => `Chapter ${value}`,
            },
        },
        yAxis: {
            type: 'category',
            inverse: true,
            data: rows.map(row => row.content),
            axisLabel: {
                fontSize: 12,
                fontWeight: 600,
                color: '#5d5035',
            },
        },
        series: [
            {
                type: 'custom',
                renderItem(params, api) {
                    const categoryIndex = api.value(0)
                    const start = api.coord([api.value(1), categoryIndex])
                    const end = api.coord([api.value(2), categoryIndex])
                    const height = api.size([0, 1])[1] * 0.55
                    return {
                        type: 'rect',
                        shape: {
                            x: start[0],
                            y: start[1] - height / 2,
                            width: end[0] - start[0],
                            height,
                        },
                        style: {
                            fill: api.value(3),
                            stroke: '#2a220f',
                            lineWidth: 2,
                        },
                    }
                },
                encode: { x: [1, 2], y: 0 },
                data: rows.map((row, index) => [
                    index,
                    row.plantedChapter || currentChapter,
                    row.targetChapter || row.resolvedChapter || currentChapter,
                    FORESHADOWING_COLORS[row.level] || '#26a8ff',
                ]),
            },
            {
                type: 'line',
                data: [],
                markLine: {
                    silent: true,
                    symbol: 'none',
                    lineStyle: {
                        color: '#26a8ff',
                        width: 3,
                    },
                    label: {
                        formatter: `Current chapter ${currentChapter}`,
                        position: 'end',
                        color: '#26a8ff',
                        fontSize: 11,
                        fontWeight: 700,
                    },
                    data: [{ xAxis: currentChapter }],
                },
            },
        ],
    }
}

function StatCard({ label, value, tone = 'plain' }) {
    return (
        <article className="card stat-card">
            <span className="stat-label">{label}</span>
            <span className={`stat-value ${tone === 'plain' ? 'plain' : ''}`.trim()}>{value}</span>
        </article>
    )
}

export default function ForeshadowingPage() {
    const { projectInfo } = useDashboardContext()
    const [filter, setFilter] = useState('all')

    const currentChapter = Number(projectInfo?.progress?.current_chapter || 0)
    const records = useMemo(() => {
        return buildForeshadowingRecords(projectInfo).sort(sortForeshadowing)
    }, [projectInfo])

    const summary = useMemo(() => summarizeForeshadowing(records), [records])

    const chartRows = useMemo(() => {
        if (filter === 'attention') {
            return records.filter(row => row.level === 'urgent' || row.level === 'overdue')
        }
        if (filter === 'active') {
            return records.filter(row => row.level === 'active')
        }
        if (filter === 'resolved') {
            return records.filter(row => row.level === 'resolved')
        }
        return records.filter(row => row.level !== 'resolved')
    }, [filter, records])

    const tableRows = useMemo(() => {
        if (filter === 'attention') {
            return records.filter(row => row.level === 'urgent' || row.level === 'overdue')
        }
        if (filter === 'active') {
            return records.filter(row => row.level === 'active')
        }
        if (filter === 'resolved') {
            return records.filter(row => row.level === 'resolved')
        }
        return records
    }, [filter, records])

    return (
        <section className="dashboard-page">
            <header className="page-header">
                <h2>Foreshadowing</h2>
                <Badge tone="cyan">{formatChapterLabel(currentChapter)}</Badge>
            </header>

            <div className="stat-grid">
                <StatCard label="Total Foreshadowing" value={String(summary.total)} />
                <StatCard label="Active" value={String(summary.active)} tone="accent" />
                <StatCard label="Resolved" value={String(summary.resolved)} tone="accent" />
                <StatCard label="Urgent / Overdue" value={String(summary.attention)} tone="accent" />
            </div>

            <div className="filter-group">
                <button type="button" className={`filter-btn ${filter === 'all' ? 'active' : ''}`.trim()} onClick={() => setFilter('all')}>All</button>
                <button type="button" className={`filter-btn ${filter === 'attention' ? 'active' : ''}`.trim()} onClick={() => setFilter('attention')}>Urgent</button>
                <button type="button" className={`filter-btn ${filter === 'active' ? 'active' : ''}`.trim()} onClick={() => setFilter('active')}>Active</button>
                <button type="button" className={`filter-btn ${filter === 'resolved' ? 'active' : ''}`.trim()} onClick={() => setFilter('resolved')}>Resolved</button>
            </div>

            <article className="card">
                <div className="card-header">
                    <div>
                        <div className="section-label">FORESHADOW GANTT</div>
                        <div className="card-title">Foreshadowing Timeline</div>
                    </div>
                    {filter === 'all' ? <Badge tone="purple">Resolved collapsed by default</Badge> : <Badge tone="blue">Filtered view</Badge>}
                </div>
                {chartRows.length ? (
                    <ChartWrapper
                        className="gantt"
                        height={380}
                        option={buildGanttOption(chartRows, currentChapter)}
                    />
                ) : (
                    <div className="empty-state">
                        <p>No foreshadowing records for current filter</p>
                    </div>
                )}
            </article>

            <article className="card">
                <div className="card-header">
                    <div>
                        <div className="section-label">FORESHADOW LIST</div>
                        <div className="card-title">Full Foreshadowing List</div>
                    </div>
                    <Badge tone="amber">{tableRows.length} items</Badge>
                </div>
                <DataTable
                    columns={[
                        { key: 'content', label: 'Content' },
                        {
                            key: 'statusText',
                            label: 'Status',
                            render: row => <Badge tone={statusTone(row.level)}>{row.statusText}</Badge>,
                        },
                        {
                            key: 'plantedChapter',
                            label: 'Planted Chapter',
                            render: row => formatChapterLabel(row.plantedChapter),
                        },
                        {
                            key: 'targetChapter',
                            label: 'Target Chapter',
                            render: row => formatChapterLabel(row.targetChapter || row.resolvedChapter),
                        },
                        {
                            key: 'urgencyText',
                            label: 'Urgency',
                            render: row => (
                                row.urgencyText === 'resolved'
                                    ? '—'
                                    : <Badge tone={urgencyTone(row.urgencyText)}>{row.urgencyText}</Badge>
                            ),
                        },
                        {
                            key: 'urgencyScore',
                            label: 'Score',
                            render: row => row.urgencyScore ? formatShortNumber(row.urgencyScore) : '—',
                        },
                    ]}
                    rows={tableRows}
                    rowKey="id"
                    pageSize={10}
                    emptyText="No foreshadowing data"
                    minWidth={760}
                />
            </article>
        </section>
    )
}
