/* 研究業績ページ：トピックバッジのクリックで業績をフィルタ表示 */
(function () {
  function initPubFilter() {
    var allTags = document.querySelectorAll(".md-typeset .ptag");
    // 業績リスト（ol内にptagを含む）が存在するページのみ有効化
    if (!document.querySelector(".md-typeset ol li .ptag")) return;

    var active = null;

    function tagKey(el) {
      var key = null;
      el.classList.forEach(function (c) {
        // "ptag--active" などの状態クラス（ptag--）は除外
        if (c.indexOf("ptag-") === 0 && c.indexOf("ptag--") !== 0) key = c;
      });
      return key;
    }

    // 「すべて表示」ボタン（凡例の直後に挿入）
    var resetBtn = document.createElement("button");
    resetBtn.className = "md-button pub-filter-reset";
    resetBtn.textContent = "✕ フィルタ解除 / Show all";
    resetBtn.style.display = "none";
    resetBtn.addEventListener("click", function () {
      active = null;
      apply();
    });
    var legendTag = document.querySelector(".md-typeset p .ptag");
    if (legendTag) legendTag.closest("p").insertAdjacentElement("afterend", resetBtn);

    function apply() {
      // 各業績エントリの表示/非表示
      document.querySelectorAll(".md-typeset ol > li").forEach(function (li) {
        if (!li.querySelector(".ptag")) return;
        var show = !active || li.querySelector("." + active);
        li.style.display = show ? "" : "none";
      });
      // 空になったセクション（見出し＋リスト）を隠す
      document.querySelectorAll(".md-typeset ol").forEach(function (ol) {
        if (ol.dataset.pubHidden === "1") return; // 年月順表示中の元リストは対象外
        var lis = Array.prototype.slice.call(ol.children);
        var hasTags = lis.some(function (li) { return li.querySelector(".ptag"); });
        var visible;
        if (hasTags) {
          visible = lis.some(function (li) {
            return li.querySelector(".ptag") && li.style.display !== "none";
          });
        } else {
          visible = !active; // バッジのないセクション（その他の受賞）はフィルタ中は隠す
        }
        ol.style.display = visible ? "" : "none";
        var prev = ol.previousElementSibling;
        while (prev && !/^H[2-4]$/.test(prev.tagName)) prev = prev.previousElementSibling;
        if (prev) prev.style.display = visible ? "" : "none";
      });
      // バッジの強調/減光
      allTags.forEach(function (t) {
        var k = tagKey(t);
        t.classList.toggle("ptag--active", !!active && k === active);
        t.classList.toggle("ptag--dimmed", !!active && k !== active);
      });
      resetBtn.style.display = active ? "" : "none";
    }

    allTags.forEach(function (t) {
      t.classList.add("ptag--clickable");
      t.addEventListener("click", function () {
        var k = tagKey(t);
        active = active === k ? null : k;
        apply();
      });
    });
  }

  /* ニュース：最新N件のみ表示し，「もっと見る」で追加表示 */
  function initNewsPagination() {
    var newsList = document.querySelector(".lab-news ul");
    if (!newsList) return;
    var items = Array.prototype.slice.call(newsList.children);
    var STEP = 6;
    if (items.length <= STEP) return;
    var shown = STEP;

    var btn = document.createElement("button");
    btn.className = "md-button news-more";

    function apply() {
      items.forEach(function (li, i) {
        li.style.display = i < shown ? "" : "none";
      });
      var remaining = items.length - shown;
      if (remaining > 0) {
        btn.textContent = "もっと見る / Show more（残り " + remaining + " 件）";
        btn.style.display = "";
      } else {
        btn.style.display = "none";
      }
    }

    btn.addEventListener("click", function () {
      shown += STEP;
      apply();
    });
    newsList.closest(".lab-news").insertAdjacentElement("afterend", btn);
    apply();
  }

  /* 研究業績ページ：セクション別⇄年月順の表示切り替え */
  function initPubSort() {
    if (!document.querySelector(".md-typeset ol li .ptag")) return;
    var content = document.querySelector(".md-typeset");

    var MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
                   jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

    // 書誌情報の末尾側にある年月（「2026年3月」または「Mar. 2026」等）を取得
    function dateKey(li) {
      var text = li.textContent;
      var best = null, bestIdx = -1, m;
      var reJa = /(\d{4})年\s*(\d{1,2})月/g;
      var reEn = /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?,?\s+(\d{4})/gi;
      while ((m = reJa.exec(text))) {
        if (m.index > bestIdx) { bestIdx = m.index; best = +m[1] * 100 + +m[2]; }
      }
      while ((m = reEn.exec(text))) {
        if (m.index > bestIdx) {
          bestIdx = m.index;
          best = +m[2] * 100 + MONTHS[m[1].slice(0, 3).toLowerCase()];
        }
      }
      return best || 0;
    }

    // 元のセクション構成（見出しとリスト，各リストの項目順）を記録
    var sections = [];
    content.querySelectorAll("ol").forEach(function (ol) {
      if (!ol.querySelector("li .ptag")) return;
      var heading = ol.previousElementSibling;
      while (heading && !/^H[2-4]$/.test(heading.tagName)) heading = heading.previousElementSibling;
      sections.push({ heading: heading, ol: ol, lis: Array.prototype.slice.call(ol.children) });
    });
    if (!sections.length) return;

    var entries = [];
    sections.forEach(function (s) {
      s.lis.forEach(function (li) { entries.push({ li: li, key: dateKey(li) }); });
    });

    // 年月順表示用のコンテナ（年ごとに見出し＋リスト）
    var dateView = document.createElement("div");
    dateView.style.display = "none";
    var sorted = entries.slice().sort(function (a, b) { return b.key - a.key; });
    var currentYear = null, currentOl = null;
    sorted.forEach(function (e) {
      var year = Math.floor(e.key / 100);
      if (year !== currentYear) {
        currentYear = year;
        var h = document.createElement("h2");
        h.textContent = year > 0 ? year + "年 / " + year : "その他 / Others";
        dateView.appendChild(h);
        currentOl = document.createElement("ol");
        dateView.appendChild(currentOl);
      }
    });
    sections[0].heading.parentNode.insertBefore(dateView, sections[0].heading);

    // 切り替えボタン
    var bar = document.createElement("div");
    bar.className = "pub-sort";
    var btnSec = document.createElement("button");
    btnSec.className = "md-button md-button--active";
    btnSec.textContent = "セクション別 / By Section";
    var btnDate = document.createElement("button");
    btnDate.className = "md-button";
    btnDate.textContent = "年月順 / By Date";
    bar.appendChild(btnSec);
    bar.appendChild(btnDate);
    sections[0].heading.parentNode.insertBefore(bar, dateView);

    function showDateView() {
      // 年ごとのリストへ項目を移動（フィルタのイベント等はそのまま生きる）
      var ols = dateView.querySelectorAll("ol");
      var idx = -1, year = null;
      sorted.forEach(function (e) {
        var y = Math.floor(e.key / 100);
        if (y !== year) { year = y; idx++; }
        ols[idx].appendChild(e.li);
      });
      sections.forEach(function (s) {
        s.ol.style.display = "none";
        s.ol.dataset.pubHidden = "1";
        if (s.heading) s.heading.style.display = "none";
      });
      dateView.style.display = "";
    }

    function showSectionView() {
      sections.forEach(function (s) {
        s.lis.forEach(function (li) { s.ol.appendChild(li); });
        s.ol.style.display = "";
        delete s.ol.dataset.pubHidden;
        if (s.heading) s.heading.style.display = "";
      });
      dateView.style.display = "none";
    }

    function setMode(byDate) {
      if (byDate) showDateView(); else showSectionView();
      btnSec.classList.toggle("md-button--active", !byDate);
      btnDate.classList.toggle("md-button--active", byDate);
    }

    btnSec.addEventListener("click", function () { setMode(false); });
    btnDate.addEventListener("click", function () { setMode(true); });
  }

  function initAll() {
    initPubFilter();
    initNewsPagination();
    initPubSort();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }
})();
