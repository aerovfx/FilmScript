# Genre Template Guide

## Overview

The system has 37 built-in webnovel genre templates (in `templates/genres/`), covering mainstream webnovel genres.
Supports single genres and composite genres (up to 2).

## Supported Genre Categories

### Xuanhuan / Cultivation

Cultivation, system-flow, high-martial, western-fantasy, infinite-flow, apocalypse, sci-fi

### Urban / Modern

Urban-supernatural, urban-daily, urban-brainhole, realistic, esports, livestream

### Romance

Ancient-romance, palace-intrigue, youth-sweet, wealthy-CEO, workplace-marriage, republican-era-romance, fantasy-romance, modern-brainhole, female-suspense, farming, period

### Other Genres

Rules-mystery, suspense-brainhole, suspense-supernatural, Cthulhu, dog-blood-romance, substitute-romance, Zhihu-short, etc.

## Genre Aliases

The system auto-recognizes common aliases, for example:

| Input | Auto-mapped to |
|------|-----------|
| 玄幻, 修真, 玄幻修仙 | Cultivation |
| 都市修真 | Urban-supernatural |
| 游戏电竞, 电竞文 | Esports |
| 直播, 主播, 直播带货 | Livestream |
| 克系, 克系悬疑 | Cthulhu |

## Composite Genre Rules

- Connect two genres with `+` (e.g. `urban-brainhole+rules-myster`), also supports `/`, `、`, `与` separators
- Combine at most 2 genres
- Suggested main/secondary ratio 7:3: the mainline follows the primary genre's logic, the secondary genre provides hooks/rules/payoff

Examples:

- `urban-brainhole+rules-myster`
- `cultivation+system-flow`
- `ancient-romance+palace-intrigue`

## Genre Template Artifacts

When initializing a project, the specified genre template content is auto-injected into the "Reference Genre Templates" section of `设定集/世界观.md`.

Additionally, there are 6 fine-tuned genre config directories (`genres/`) that provide more granular writing guidance for specific genres:

- `xuanhuan` (玄幻 / Cultivation)
- `dog-blood-romance` (狗血言情 / Dog-blood romance)
- `period-drama` (年代 / Period)
- `realistic` (现实题材 / Realistic)
- `rules-mystery` (规则怪谈 / Rules mystery)
- `zhihu-short` (知乎短篇 / Zhihu short)
