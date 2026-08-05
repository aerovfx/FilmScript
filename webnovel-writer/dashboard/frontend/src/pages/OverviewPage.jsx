// OverviewPage: dashboard overview UI for project metrics and visualizations.
// Translated UI labels and added brief English comments for maintainability.
import { useEffect, useMemo, useState } from 'react'
import { useDashboardContext } from '../App.jsx'
import { fetchChapterTrend, fetchChapters, fetchStoryRuntimeHealth } from '../api.js'
import Badge from '../components/Badge.jsx'
import ChartWrapper from '../components/ChartWrapper.jsx'
import DataTable from '../components/DataTable.jsx'
import Pager from '../components/Pager.jsx'
import { STRAND_COLORS } from '../lib/charts.js'
import { buildForeshadowingRecords, summarizeForeshadowing } from '../lib/foreshadowing.js'
import {
    average,
    formatChapterLabel,
    formatNumber,
    formatPercent,
    formatShortNumber,
} from '../lib/format.js'
import { groupChaptersByVolume } from '../lib/story.js'

const WINDOW_SIZE = 50

const FORESHADOW_PRIORITY = {
    overdue: 4,
    urgent: 3,
    active: 2,
    resolved: 1,
}

function toneForForeshadowing(level) {
    if (level === 'overdue') return 'red'
    if (level === 'urgent') return 'amber'
    if (level === 'resolved') return 'green'
    return 'blue'
}

function toneForHookStrength(strength) {
    if (strength === 'strong') return 'green'
    if (strength === 'medium') return 'amber'
    if (strength === 'weak') return 'red'
    return 'blue'
}

function toneForUrgencyBadge(level) {
    if (level === 'critical') return 'red'
    if (level === 'high') return 'amber'
    if (level === 'medium') return 'amber'
    if (level === 'resolved') return 'green'
    return 'blue'
}

function formatRuntimeText(runtimeHealth) {
    if (!runtimeHealth) return 'Runtime not loaded'
    const fallback = Array.isArray(runtimeHealth.fallback_sources) && runtimeHealth.fallback_sources.length
        ? runtimeHealth.fallback_sources.join(' / ')
        : 'none'
    return `${runtimeHealth.latest_commit_status || 'missing'} · fallback ${fallback}`
}

function buildReviewOption(items) {
    const scores = items
        .map(item => Number(item.review_score))
        .filter(score => Number.isFinite(score))
    const averageScore = average(scores)

    return {
        tooltip: { trigger: 'axis' },
        grid: { left: 52, right: 24, top: 36, bottom: 46 },
        xAxis: {
            type: 'category',
            data: items.map(item => item.chapter),
            axisLabel: { interval: 9, formatter: value => `${value}` },
        },
        yAxis: {
            type: 'value',
            min: 0,
            max: Math.max(100, ...scores, 0),
        },
        series: [
            {
                type: 'line',
                name: 'Review Score',
                data: items.map(item => item.review_score ?? null),
                symbol: 'rect',
                symbolSize: 8,
                lineStyle: { width: 3, color: '#26a8ff' },
                itemStyle: {
                    color: '#26a8ff',
                    borderColor: '#2a220f',
                    borderWidth: 2,
                },
                connectNulls: false,
                markLine: averageScore
                    ? {
                        symbol: 'none',
                        lineStyle: { color: '#f5a524', width: 2, type: 'dashed' },
                        label: { formatter: `Avg ${formatShortNumber(averageScore)}` },
                        data: [{ yAxis: Number(averageScore.toFixed(2)) }],
                    }
                    : undefined,
            },
        ],
    }
}

function buildVolumeOption(groups) {
    return {
        tooltip: { trigger: 'axis' },
        xAxis: {
            type: 'category',
            data: groups.map(group => group.label),
        },
        yAxis: {
            type: 'value',
                axisLabel: {
                // display as thousands (K) for readability
                formatter: value => `${formatShortNumber(Number(value) / 1000)}K`,
            },
        },
        series: [
            {
                type: 'bar',
                data: groups.map(group => group.totalWords),
                barWidth: '56%',
                itemStyle: {
                    color: '#7f5af0',
                    borderColor: '#2a220f',
                    borderWidth: 2,
                },
                label: {
                    show: true,
                    position: 'top',
                    formatter: params => formatNumber(params.value),
                    color: '#5d5035',
                    fontSize: 12,
                },
            },
        ],
    }
}

function buildStrandOption(entries) {
    return {
        tooltip: { trigger: 'item' },
        legend: { bottom: 0 },
        series: [
            {
                type: 'pie',
                radius: ['42%', '68%'],
                avoidLabelOverlap: false,
                itemStyle: {
                    borderColor: '#2a220f',
                    borderWidth: 2,
                },
                label: {
                    show: true,
                    formatter: '{b}\n{d}%',
                    color: '#5d5035',
                    fontSize: 12,
                    fontWeight: 600,
                },
                data: entries,
            },
        ],
    }
}

function StatCard({ label, value, sub, tone = 'accent', progress }) {
    return (
            <article className="card stat-card">
                <span className="stat-label">{label}</span>
            <span className={`stat-value ${tone === 'plain' ? 'plain' : ''}`.trim()}>{value}</span>
                <span className="stat-sub">{sub}</span>
                {progress !== undefined ? (
                <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
                </div>
            ) : null}
        </article>
    )
}

function RecentSummaryCard({ item }) {
    return (
        <article className="summary-card">
            <div className="summary-card-header">
                <span className="summary-chapter">{formatChapterLabel(item.chapter)}</span>
                <div className="summary-badges">
                    <Badge tone={toneForHookStrength(item.hook_strength)}>
                        {item.hook_strength || 'No hook'}
                    </Badge>
                    {item.review_score ? <Badge tone="purple">{item.review_score} pts</Badge> : null}
                </div>
            </div>
            <h3>{item.title || 'Untitled Chapter'}</h3>
            <p>{item.summary || 'No chapter summary.'}</p>
            <div className="summary-meta">
                <span>{item.location || 'Unknown location'}</span>
                <span>{formatNumber(item.word_count)} words</span>
                <span>{(item.characters || []).join(', ') || 'No characters recorded'}</span>
            </div>
        </article>
    )
}

export default function OverviewPage() {
    const { projectInfo, refreshToken } = useDashboardContext()
    const [runtimeHealth, setRuntimeHealth] = useState(null)
    const [allChapters, setAllChapters] = useState([])
    const [trendWindow, setTrendWindow] = useState({ items: [], total: 0, latest_chapter: 0 })
    const [latestWindow, setLatestWindow] = useState({ items: [], total: 0, latest_chapter: 0 })
    const [windowIndex, setWindowIndex] = useState(0)
    const [loadingTrend, setLoadingTrend] = useState(true)

    useEffect(() => {
        setWindowIndex(0)
    }, [refreshToken])

    useEffect(() => {
        let cancelled = false

        Promise.allSettled([
            fetchStoryRuntimeHealth(),
            fetchChapters(),
            fetchChapterTrend({ limit: WINDOW_SIZE, offset: 0 }),
        ]).then(results => {
            if (cancelled) return

            setRuntimeHealth(results[0].status === 'fulfilled' ? results[0].value : null)
            setAllChapters(results[1].status === 'fulfilled' ? results[1].value : [])

            const latest = results[2].status === 'fulfilled'
                ? results[2].value
                : { items: [], total: 0, latest_chapter: 0 }
            setLatestWindow(latest)
            setTrendWindow(latest)
            setLoadingTrend(false)
        })

        return () => {
            cancelled = true
        }
    }, [refreshToken])

    useEffect(() => {
        if (windowIndex === 0) {
            setTrendWindow(latestWindow)
            return
        }

        let cancelled = false
        setLoadingTrend(true)

        fetchChapterTrend({ limit: WINDOW_SIZE, offset: windowIndex * WINDOW_SIZE })
            .then(payload => {
                if (!cancelled) {
                    setTrendWindow(payload)
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setTrendWindow({ items: [], total: latestWindow.total || 0, latest_chapter: latestWindow.latest_chapter || 0 })
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setLoadingTrend(false)
                }
            })

        return () => {
            cancelled = true
        }
    }, [latestWindow, refreshToken, windowIndex])

    const info = projectInfo?.project_info || {}
    const progress = projectInfo?.progress || {}

    const windowItems = trendWindow.items || []
    const totalPages = Math.max(1, Math.ceil((trendWindow.total || latestWindow.total || 0) / WINDOW_SIZE))
    const displayPage = Math.max(1, totalPages - windowIndex)
    const currentStart = windowItems[0]?.chapter || 0
    const currentEnd = windowItems[windowItems.length - 1]?.chapter || 0

    const volumeGroups = useMemo(
        () => groupChaptersByVolume(allChapters, projectInfo),
        [allChapters, projectInfo],
    )

    const foreshadowRecords = useMemo(
        () => buildForeshadowingRecords(projectInfo),
        [projectInfo],
    )
    const foreshadowSummary = useMemo(
        () => summarizeForeshadowing(foreshadowRecords),
        [foreshadowRecords],
    )

    const urgentRows = useMemo(() => {
        return [...foreshadowRecords]
            .sort((left, right) => {
                const priority = (FORESHADOW_PRIORITY[right.level] || 0) - (FORESHADOW_PRIORITY[left.level] || 0)
                if (priority !== 0) return priority
                return (right.urgencyScore || 0) - (left.urgencyScore || 0)
            })
            .slice(0, 5)
    }, [foreshadowRecords])

    const latestReviewAverage = useMemo(() => {
        return average((latestWindow.items || []).map(item => item.review_score))
    }, [latestWindow.items])

    const recentSummaries = useMemo(() => {
        return [...(latestWindow.items || [])].slice(-3).reverse()
    }, [latestWindow.items])

    const strandEntries = useMemo(() => {
        const history = Array.isArray(projectInfo?.strand_tracker?.history)
            ? projectInfo.strand_tracker.history
            : []
        const counts = new Map([
            ['quest', 0],
            ['fire', 0],
            ['constellation', 0],
        ])

        history.forEach(item => {
            const key = String(item?.strand || item?.dominant || '').toLowerCase()
            if (counts.has(key)) {
                counts.set(key, counts.get(key) + 1)
            }
        })

        return [...counts.entries()]
            .filter(([, value]) => value > 0)
            .map(([key, value]) => ({
                name: key,
                value,
                itemStyle: {
                    color: STRAND_COLORS[key] || '#00b8d4',
                    borderColor: '#2a220f',
                    borderWidth: 2,
                },
            }))
    }, [projectInfo?.strand_tracker?.history])

    const totalWords = Number(progress.total_words || 0)
    const targetWords = Number(info.target_words || 0)
    const progressPercent = targetWords > 0 ? (totalWords / targetWords) * 100 : 0

    return (
        <section className="dashboard-page">
            <header className="page-header">
                <h2>Overview</h2>
                <Badge tone="blue">{info.genre || 'Unknown Genre'}</Badge>
            </header>

            <div className="stat-grid">
                <StatCard
                    label="Total Words"
                    value={formatNumber(totalWords)}
                    sub={`Target ${formatNumber(targetWords || 0)} words · ${formatPercent(progressPercent)}`}
                    progress={progressPercent}
                />
                <StatCard
                    label="Current Chapter"
                    value={formatChapterLabel(progress.current_chapter)}
                    sub={`Target ${info.target_chapters || '—'} ch · Vol ${progress.current_volume || '—'}`}
                />
                <StatCard
                    label="Story Runtime"
                    value={runtimeHealth?.mainline_ready ? 'Mainline' : 'Fallback'}
                    sub={formatRuntimeText(runtimeHealth)}
                    tone="plain"
                />
                <StatCard
                    label="Review Avg"
                    value={latestReviewAverage ? formatShortNumber(latestReviewAverage) : '—'}
                    sub="Average over last 50 chapters"
                />
                <StatCard
                    label="Urgent Foreshadowing"
                    value={String(foreshadowSummary.attention)}
                    sub={`Total ${foreshadowSummary.total} foreshadowing items`}
                />
            </div>

            <article className="card">
                <div className="card-header">
                    <div>
                        <div className="section-label">REVIEW TREND</div>
                        <div className="card-title">Review Score Trend</div>
                    </div>
                    <Badge tone="green">
                        {currentStart && currentEnd ? `${formatChapterLabel(currentStart)} - ${formatChapterLabel(currentEnd)}` : 'Latest window'}
                    </Badge>
                </div>
                {windowItems.length ? (
                    <>
                        <ChartWrapper option={buildReviewOption(windowItems)} loading={loadingTrend} />
                        <Pager
                            page={displayPage}
                            totalPages={totalPages}
                            currentStart={currentStart}
                            currentEnd={currentEnd}
                            totalItems={trendWindow.total || latestWindow.total || 0}
                            onPrevious={() => setWindowIndex(current => Math.min(totalPages - 1, current + 1))}
                            onNext={() => setWindowIndex(current => Math.max(0, current - 1))}
                            onLatest={() => setWindowIndex(0)}
                            stepLabel={String(WINDOW_SIZE)}
                        />
                    </>
                ) : (
                    <div className="empty-state">
                        <p>No chapter trend data</p>
                    </div>
                )}
            </article>

            <div className="content-grid two-columns">
                <article className="card">
                    <div className="card-header">
                        <div>
                            <div className="section-label">WORD DISTRIBUTION</div>
                            <div className="card-title">Word distribution (by volume)</div>
                        </div>
                        <Badge tone="purple">{volumeGroups.length} vols</Badge>
                    </div>
                    {volumeGroups.length ? (
                        <ChartWrapper option={buildVolumeOption(volumeGroups)} />
                    ) : (
                        <div className="empty-state">
                            <p>No chapter word data</p>
                        </div>
                    )}
                </article>

                <article className="card">
                    <div className="card-header">
                        <div>
                            <div className="section-label">STRAND OVERVIEW</div>
                            <div className="card-title">Strand Weave Distribution</div>
                        </div>
                        <Badge tone="purple">{projectInfo?.strand_tracker?.current_dominant || 'unknown'}</Badge>
                    </div>
                    {strandEntries.length ? (
                        <ChartWrapper option={buildStrandOption(strandEntries)} height={260} />
                    ) : (
                        <div className="empty-state">
                            <p>No strand history</p>
                        </div>
                    )}
                </article>
            </div>

            <div className="content-grid two-columns">
                <article className="card">
                    <div className="card-header">
                        <div>
                            <div className="section-label">FORESHADOWING</div>
                            <div className="card-title">Top 5 Urgent Foreshadowing</div>
                        </div>
                        <Badge tone="amber">Sorted by urgency</Badge>
                    </div>
                    <DataTable
                        columns={[
                            { key: 'content', label: 'Content' },
                            {
                                key: 'statusText',
                                label: 'Status',
                                render: row => <Badge tone={toneForForeshadowing(row.level)}>{row.statusText}</Badge>,
                            },
                            {
                                key: 'plantedChapter',
                                label: 'Planted Chapter',
                                render: row => formatChapterLabel(row.plantedChapter),
                            },
                            {
                                key: 'targetChapter',
                                label: 'Target Chapter',
                                render: row => formatChapterLabel(row.targetChapter),
                            },
                            {
                                key: 'urgencyText',
                                label: 'Urgency',
                                render: row => <Badge tone={toneForUrgencyBadge(row.urgencyText)}>{row.urgencyText}</Badge>,
                            },
                        ]}
                        rows={urgentRows}
                        rowKey="id"
                        pageSize={5}
                        emptyText="No foreshadowing data"
                        minWidth={680}
                    />
                </article>

                <article className="card">
                    <div className="card-header">
                        <div>
                            <div className="section-label">LATEST CHAPTERS</div>
                            <div className="card-title">Latest 3 Chapter Summaries</div>
                        </div>
                        <Badge tone="cyan">{recentSummaries.length} items</Badge>
                    </div>
                    {recentSummaries.length ? (
                        <div className="summary-card-list">
                            {recentSummaries.map(item => (
                                <RecentSummaryCard key={item.chapter} item={item} />
                            ))}
                        </div>
                    ) : (
                        <div className="empty-state">
                            <p>No latest chapter summaries</p>
                        </div>
                    )}
                </article>
            </div>
        </section>
    )
}
