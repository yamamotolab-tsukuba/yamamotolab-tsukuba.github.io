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

  function initAll() {
    initPubFilter();
    initNewsPagination();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }
})();
