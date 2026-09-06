# 山本研究室ウェブサイト / Yamamoto Laboratory Website

筑波大学 山本研究室（行動データ分析・モデリング研究室）の公式ウェブサイトです．日本語と英語は，更新箇所を一つに保つため同じページに併記しています．

This repository contains the official website of the Yamamoto Laboratory at the University of Tsukuba. Japanese and English are intentionally presented on the same pages so that each item has a single source to maintain.

公開URL / Published site: <https://yamamotolab-tsukuba.github.io/>

## ローカル環境 / Local Setup

Python 3.12以降を推奨します．仮想環境を作成し，固定済みの依存関係をインストールしてください．

Python 3.12 or later is recommended. Create a virtual environment and install the pinned dependencies.

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

## 編集と確認 / Edit and Verify

コンテンツは `docs/`，ナビゲーションとテーマ設定は `mkdocs.yml`，追加スタイルと動作は `docs/stylesheets/` と `docs/javascripts/` にあります．生成物の `site/` は編集しません．

Source content lives in `docs/`; navigation and theme settings are in `mkdocs.yml`; custom styles and behavior are in `docs/stylesheets/` and `docs/javascripts/`. Do not edit generated files under `site/`.

```bash
mkdocs serve
mkdocs build --strict
python scripts/check_internal_links.py site
```

更新時は，日英両方の本文，ページ先頭の `description`，内部リンク，画像の代替テキストを確認してください．研究図を差し替える場合は，JPEGの原画像に加えて同名のWebP（幅1672px）と `-960.webp`（幅960px）も更新します．

When updating content, check both languages, the page-level `description`, internal links, and image alternative text. When replacing a research figure, update the source JPEG together with the matching full-width WebP and `-960.webp` variant.

## 公開 / Deployment

Pull requestでは厳格ビルドと内部リンク検査を行います．`main` ブランチへの反映後は，同じ検査に合格した場合のみGitHub Pagesへ公開されます．GitHub Actions上のログで公開結果を確認してください．

Pull requests run a strict build and internal-link check. After changes reach `main`, the site is deployed to GitHub Pages only if the same checks pass. Confirm the result in the GitHub Actions log.
