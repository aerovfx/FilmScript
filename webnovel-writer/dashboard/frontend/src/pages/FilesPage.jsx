import { startTransition, useEffect, useMemo, useState } from 'react'
import { useDashboardContext } from '../App.jsx'
import Badge from '../components/Badge.jsx'
import { fetchFileContent, fetchFilesTree } from '../api.js'
import { findFirstFilePath } from '../lib/files.js'

function countTreeItems(items) {
    return (items || []).reduce(
        (count, item) => count + (item.type === 'file' ? 1 : countTreeItems(item.children)),
        0,
    )
}

function TreeNodes({ items, expanded, selectedPath, onToggle, onSelect, depth = 0 }) {
    if (!Array.isArray(items) || !items.length) return null

    return items.map(item => {
        const key = item.path || `${depth}-${item.name}`
        if (item.type === 'dir') {
            const isOpen = expanded[key] ?? depth < 1
            return (
                <li key={key}>
                    <button
                        type="button"
                        className={`tree-item tree-dir ${isOpen ? 'open' : ''}`.trim()}
                        onClick={() => onToggle(key)}
                    >
                        <span className="tree-glyph" />
                        <span className="tree-name">{item.name}</span>
                    </button>
                    {isOpen ? (
                        <ul className="tree-children">
                            <TreeNodes
                                items={item.children}
                                expanded={expanded}
                                selectedPath={selectedPath}
                                onToggle={onToggle}
                                onSelect={onSelect}
                                depth={depth + 1}
                            />
                        </ul>
                    ) : null}
                </li>
            )
        }

        return (
            <li key={key}>
                <button
                    type="button"
                    className={`tree-item tree-file ${selectedPath === item.path ? 'active' : ''}`.trim()}
                    onClick={() => onSelect(item.path)}
                >
                    <span className="tree-glyph file" />
                    <span className="tree-name">{item.name}</span>
                </button>
            </li>
        )
    })
}

export default function FilesPage() {
    const { refreshToken } = useDashboardContext()
    const [tree, setTree] = useState({})
    const [expanded, setExpanded] = useState({})
    const [selectedPath, setSelectedPath] = useState(null)
    const [content, setContent] = useState('')
    const [loadingContent, setLoadingContent] = useState(false)

    useEffect(() => {
        let cancelled = false
        fetchFilesTree()
            .then(payload => {
                if (!cancelled) {
                    setTree(payload)
                    const initialPath = findFirstFilePath(payload)
                    if (initialPath) {
                        setSelectedPath(current => current || initialPath)
                    }
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setTree({})
                }
            })

        return () => {
            cancelled = true
        }
    }, [refreshToken])

    useEffect(() => {
        if (!selectedPath) return undefined

        let cancelled = false
        setLoadingContent(true)
        fetchFileContent(selectedPath)
            .then(payload => {
                if (!cancelled) {
                    setContent(payload.content || '')
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setContent('[Read failed]')
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setLoadingContent(false)
                }
            })

        return () => {
            cancelled = true
        }
    }, [selectedPath])

    const totalFiles = useMemo(() => {
        return Object.values(tree).reduce((count, items) => count + countTreeItems(items), 0)
    }, [tree])
    const lineCount = content ? content.split(/\r?\n/).length : 0

    return (
        <section className="dashboard-page">
            <header className="page-header">
                <h2>Documents</h2>
                <Badge tone="blue">{totalFiles} files</Badge>
            </header>

            <div className="content-grid files-layout">
                <article className="card files-tree-card">
                    <div className="card-header">
                        <div>
                            <div className="section-label">FILE TREE</div>
                            <div className="card-title">Directory Tree</div>
                        </div>
                        <Badge tone="cyan">Content / Outline / Settings</Badge>
                    </div>

                    <div className="folder-group-list">
                        {Object.entries(tree).map(([folder, items]) => (
                            <section key={folder} className="folder-block">
                                <div className="folder-title">
                                    <span>{folder}</span>
                                    <Badge tone="purple">{countTreeItems(items)}</Badge>
                                </div>
                                <ul className="file-tree">
                                    <TreeNodes
                                        items={items}
                                        expanded={expanded}
                                        selectedPath={selectedPath}
                                        onToggle={path => {
                                            startTransition(() => {
                                                setExpanded(current => ({ ...current, [path]: !current[path] }))
                                            })
                                        }}
                                        onSelect={setSelectedPath}
                                    />
                                </ul>
                            </section>
                        ))}
                    </div>
                </article>

                <article className="card files-preview-card">
                    <div className="card-header">
                        <div>
                            <div className="section-label">FILE PREVIEW</div>
                            <div className="card-title">Content Preview</div>
                        </div>
                        {selectedPath ? (
                            <div className="header-badges">
                                <Badge tone="amber">{lineCount} lines</Badge>
                                <Badge tone="green">{content.length} chars</Badge>
                            </div>
                        ) : null}
                    </div>

                    {selectedPath ? (
                        <>
                            <div className="selected-path">{selectedPath}</div>
                            <pre className={`file-preview ${loadingContent ? 'loading' : ''}`.trim()}>
                                {loadingContent ? 'Loading…' : content}
                            </pre>
                        </>
                    ) : (
                        <div className="empty-state">
                            <p>Select a file on the left to preview</p>
                        </div>
                    )}
                </article>
            </div>
        </section>
    )
}
