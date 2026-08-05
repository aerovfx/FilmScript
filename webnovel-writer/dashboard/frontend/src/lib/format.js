export function formatNumber(value) {
    const number = Number(value || 0)
    if (!Number.isFinite(number)) return '—'
    if (Math.abs(number) >= 10000) {
        return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(number / 1000)}K`
    }
    return new Intl.NumberFormat('en-US').format(number)
}

export function formatShortNumber(value) {
    const number = Number(value || 0)
    if (!Number.isFinite(number)) return '—'
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(number)
}

export function formatPercent(value, fractionDigits = 1) {
    const number = Number(value)
    if (!Number.isFinite(number)) return '—'
    return `${number.toFixed(fractionDigits)}%`
}

export function formatChapterLabel(chapter) {
    const number = Number(chapter || 0)
    if (!Number.isFinite(number) || number <= 0) return '—'
    return `Ch ${number}`
}

export function formatDateTime(value) {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return String(value)
    return date.toLocaleString('en-US', {
        hour12: false,
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    })
}

export function formatJSONText(value) {
    if (value === null || value === undefined || value === '') return ''
    if (typeof value === 'object') {
        return JSON.stringify(value, null, 2)
    }
    if (typeof value !== 'string') {
        return String(value)
    }
    try {
        return JSON.stringify(JSON.parse(value), null, 2)
    } catch {
        return value
    }
}

export function average(values) {
    const valid = values
        .map(item => Number(item))
        .filter(item => Number.isFinite(item))
    if (!valid.length) return null
    return valid.reduce((sum, item) => sum + item, 0) / valid.length
}

export function formatTableValue(value) {
    if (value === null || value === undefined || value === '') return '—'
    if (Array.isArray(value)) {
        return value.length ? value.join(', ') : '—'
    }
    if (typeof value === 'object') {
        return JSON.stringify(value, null, 2)
    }
    if (typeof value === 'boolean') {
        return value ? 'Yes' : 'No'
    }
    return String(value)
}
