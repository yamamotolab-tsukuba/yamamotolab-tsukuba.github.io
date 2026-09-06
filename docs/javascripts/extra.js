/* 山本研究室サイト：業績フィルタ・表示順・ニュース・補足説明 */
(function () {
  "use strict";

  var nextId = 0;

  function uniqueId(prefix) {
    nextId += 1;
    return prefix + "-" + nextId;
  }

  function directListItems(list) {
    return Array.prototype.filter.call(list.children, function (child) {
      return child.tagName === "LI";
    });
  }

  function previousHeading(element) {
    var sibling = element.previousElementSibling;
    while (sibling && !/^H[2-4]$/.test(sibling.tagName)) {
      sibling = sibling.previousElementSibling;
    }
    return sibling;
  }

  function topicKey(element) {
    var key = null;
    element.classList.forEach(function (className) {
      if (className.indexOf("ptag-") === 0 && className.indexOf("ptag--") !== 0) {
        key = className;
      }
    });
    return key;
  }

  function topicKeys(element) {
    var keys = [];
    element.querySelectorAll(".ptag").forEach(function (tag) {
      var key = topicKey(tag);
      if (key && keys.indexOf(key) === -1) keys.push(key);
    });
    return keys;
  }

  function buttonFromTag(tag) {
    if (tag.tagName === "BUTTON") {
      tag.type = "button";
      return tag;
    }

    var button = document.createElement("button");
    Array.prototype.forEach.call(tag.attributes, function (attribute) {
      button.setAttribute(attribute.name, attribute.value);
    });
    button.type = "button";
    while (tag.firstChild) button.appendChild(tag.firstChild);
    tag.parentNode.replaceChild(button, tag);
    return button;
  }

  function makeButton(label, className) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = label;
    return button;
  }

  /* 業績ページ：フィルタと表示順を一つの状態から描画する。 */
  function initPublicationControls() {
    var content = document.querySelector(".md-typeset");
    if (!content || content.dataset.pubControlsInitialized === "true") return;

    var sections = [];
    content.querySelectorAll("ol").forEach(function (list) {
      var items = directListItems(list);
      if (!items.some(function (item) { return item.querySelector(".ptag"); })) return;
      sections.push({
        heading: previousHeading(list),
        list: list,
        items: items
      });
    });
    if (!sections.length || !sections[0].heading) return;
    content.dataset.pubControlsInitialized = "true";

    var MONTHS = {
      jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
      jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
    };

    function dateKey(item) {
      var text = item.textContent;
      var best = 0;
      var bestIndex = -1;
      var match;
      var japaneseDate = /(\d{4})年\s*(\d{1,2})月/g;
      var englishDate = /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?,?\s+(\d{4})/gi;

      while ((match = japaneseDate.exec(text))) {
        if (match.index > bestIndex) {
          bestIndex = match.index;
          best = Number(match[1]) * 100 + Number(match[2]);
        }
      }
      while ((match = englishDate.exec(text))) {
        if (match.index > bestIndex) {
          bestIndex = match.index;
          best = Number(match[2]) * 100 + MONTHS[match[1].slice(0, 3).toLowerCase()];
        }
      }
      return best;
    }

    var entries = [];
    sections.forEach(function (section) {
      section.items.forEach(function (item) {
        entries.push({
          item: item,
          section: section,
          originalIndex: entries.length,
          topics: topicKeys(item),
          date: dateKey(item)
        });
      });
    });

    /*
     * 凡例だけを操作ボタンにする。各業績内のタグまでボタンにすると、
     * 同じ操作が数百個のTab停止点になってしまうため、そこは読み取り専用のラベルとする。
     */
    var filterButtons = [];
    content.querySelectorAll(".ptag").forEach(function (tag) {
      var key = topicKey(tag);
      if (!key || tag.closest("ol")) return;
      var button = buttonFromTag(tag);
      button.classList.add("ptag--clickable");
      button.dataset.pubFilter = key;
      button.dataset.pubFilterLabel = button.textContent.trim();
      button.setAttribute("aria-pressed", "false");
      filterButtons.push(button);
    });

    var allTopicTags = Array.prototype.slice.call(content.querySelectorAll(".ptag"));

    var legendButton = filterButtons.find(function (button) {
      return !button.closest("ol");
    });
    var legend = legendButton && legendButton.closest("p");
    if (legend) {
      legend.classList.add("pub-filter-options");
      legend.setAttribute("role", "group");
      legend.setAttribute("aria-label", "研究トピックで絞り込む / Filter by research topic");
    }

    var dateView = document.createElement("div");
    dateView.className = "pub-date-view";
    dateView.id = uniqueId("pub-date-view");
    dateView.setAttribute("role", "region");
    dateView.setAttribute("aria-label", "年月順の研究業績 / Publications by date");
    dateView.hidden = true;

    var sortedEntries = entries.slice().sort(function (left, right) {
      return right.date - left.date || left.originalIndex - right.originalIndex;
    });
    var groups = [];
    sortedEntries.forEach(function (entry) {
      var year = entry.date ? Math.floor(entry.date / 100) : 0;
      var group = groups[groups.length - 1];
      if (!group || group.year !== year) {
        var heading = document.createElement("h2");
        var list = document.createElement("ol");
        var headingId = uniqueId(year ? "publications-year-" + year : "publications-other");
        heading.id = headingId;
        heading.textContent = year ? year + "年 / " + year : "その他 / Others";
        list.setAttribute("aria-labelledby", headingId);
        dateView.appendChild(heading);
        dateView.appendChild(list);
        group = { year: year, heading: heading, list: list, entries: [] };
        groups.push(group);
      }
      group.entries.push(entry);
    });

    var sortControls = document.createElement("div");
    sortControls.className = "pub-sort";
    sortControls.setAttribute("role", "group");
    sortControls.setAttribute("aria-label", "業績の表示順 / Publication view");

    var sectionButton = makeButton("セクション別 / By Section", "md-button md-button--active");
    var dateButton = makeButton("年月順 / By Date", "md-button");
    sectionButton.setAttribute("aria-pressed", "true");
    dateButton.setAttribute("aria-pressed", "false");
    sortControls.appendChild(sectionButton);
    sortControls.appendChild(dateButton);

    var resetButton = makeButton("✕ フィルタ解除 / Show all", "md-button pub-filter-reset");
    resetButton.disabled = true;

    var status = document.createElement("p");
    status.className = "pub-status";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    status.setAttribute("aria-atomic", "true");

    var firstHeading = sections[0].heading;
    var parent = firstHeading.parentNode;
    if (legend) legend.insertAdjacentElement("afterend", resetButton);
    else parent.insertBefore(resetButton, firstHeading);
    parent.insertBefore(sortControls, firstHeading);
    parent.insertBefore(status, firstHeading);
    parent.insertBefore(dateView, firstHeading);

    var activeTopic = null;
    var mode = "section";

    function matches(entry) {
      return !activeTopic || entry.topics.indexOf(activeTopic) !== -1;
    }

    function activeLabel() {
      var control = filterButtons.find(function (button) {
        return button.dataset.pubFilter === activeTopic && !button.closest("ol");
      }) || filterButtons.find(function (button) {
        return button.dataset.pubFilter === activeTopic;
      });
      return control ? control.dataset.pubFilterLabel : "";
    }

    function render() {
      entries.forEach(function (entry) {
        entry.item.hidden = !matches(entry);
      });

      if (mode === "date") {
        sections.forEach(function (section) {
          section.list.hidden = true;
          if (section.heading) section.heading.hidden = true;
        });
        groups.forEach(function (group) {
          group.entries.forEach(function (entry) { group.list.appendChild(entry.item); });
          var hasVisibleEntries = group.entries.some(matches);
          group.heading.hidden = !hasVisibleEntries;
          group.list.hidden = !hasVisibleEntries;
        });
        dateView.hidden = false;
      } else {
        sections.forEach(function (section) {
          section.items.forEach(function (item) { section.list.appendChild(item); });
          var hasVisibleItems = section.items.some(function (item) { return !item.hidden; });
          section.list.hidden = !hasVisibleItems;
          if (section.heading) section.heading.hidden = !hasVisibleItems;
        });
        dateView.hidden = true;
      }

      allTopicTags.forEach(function (tag) {
        var selected = !!activeTopic && topicKey(tag) === activeTopic;
        if (tag.tagName === "BUTTON") {
          tag.setAttribute("aria-pressed", selected ? "true" : "false");
        }
        tag.classList.toggle("ptag--active", selected);
        tag.classList.toggle("ptag--dimmed", !!activeTopic && !selected);
      });

      var byDate = mode === "date";
      sectionButton.setAttribute("aria-pressed", byDate ? "false" : "true");
      dateButton.setAttribute("aria-pressed", byDate ? "true" : "false");
      sectionButton.classList.toggle("md-button--active", !byDate);
      dateButton.classList.toggle("md-button--active", byDate);
      resetButton.disabled = !activeTopic;

      var shown = entries.filter(matches).length;
      var viewJa = byDate ? "年月順" : "セクション別";
      var viewEn = byDate ? "by date" : "by section";
      if (activeTopic) {
        status.textContent = "表示中: " + shown + "件（" + activeLabel() + "、" + viewJa + "） / Showing " + shown + " publications, " + viewEn + ".";
      } else {
        status.textContent = "表示中: 全" + shown + "件（" + viewJa + "） / Showing all " + shown + " publications, " + viewEn + ".";
      }
    }

    filterButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        var requestedTopic = button.dataset.pubFilter;
        activeTopic = activeTopic === requestedTopic ? null : requestedTopic;
        render();
      });
    });
    resetButton.addEventListener("click", function () {
      activeTopic = null;
      render();
      if (legendButton) legendButton.focus();
    });
    sectionButton.addEventListener("click", function () {
      mode = "section";
      render();
    });
    dateButton.addEventListener("click", function () {
      mode = "date";
      render();
    });

    render();
  }

  /* ニュース：最新N件のみ表示し、「もっと見る」で追加表示する。 */
  function initNewsPagination() {
    var newsList = document.querySelector(".lab-news ul");
    if (!newsList || newsList.dataset.paginationInitialized === "true") return;
    newsList.dataset.paginationInitialized = "true";

    var items = directListItems(newsList);
    var STEP = 6;
    if (items.length <= STEP) return;
    var shown = STEP;

    if (!newsList.id) newsList.id = uniqueId("lab-news-list");
    var button = makeButton("", "md-button news-more");
    button.setAttribute("aria-controls", newsList.id);
    button.setAttribute("aria-expanded", "false");

    var status = document.createElement("span");
    status.className = "lab-visually-hidden";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    status.setAttribute("aria-atomic", "true");

    function render(announce) {
      items.forEach(function (item, index) {
        item.hidden = index >= shown;
      });
      var visible = Math.min(shown, items.length);
      var remaining = items.length - visible;
      button.setAttribute("aria-expanded", remaining ? "false" : "true");
      if (remaining) {
        button.textContent = "もっと見る / Show more（残り " + remaining + " 件）";
      } else {
        button.textContent = "表示を減らす / Show fewer";
      }
      if (announce) {
        status.textContent = visible + "件のニュースを表示中です / Showing " + visible + " news items.";
      }
    }

    button.addEventListener("click", function () {
      shown = shown >= items.length ? STEP : items.length;
      render(true);
    });
    newsList.closest(".lab-news").insertAdjacentElement("afterend", button);
    button.insertAdjacentElement("afterend", status);
    render(false);
  }

  /* title 属性だけに依存せず、キーボード・タッチでも説明を読めるようにする。 */
  function initAccessibleTooltips() {
    var openTooltip = null;

    function closeTooltip() {
      if (!openTooltip) return;
      if (openTooltip.cancelHide) openTooltip.cancelHide();
      openTooltip.tooltip.hidden = true;
      openTooltip = null;
    }

    function positionTooltip(trigger, tooltip) {
      var margin = 12;
      var gap = 8;
      var triggerRect = trigger.getBoundingClientRect();
      tooltip.style.maxWidth = Math.max(160, Math.min(352, window.innerWidth - margin * 2)) + "px";
      tooltip.style.left = "0px";
      tooltip.style.top = "0px";
      var tooltipRect = tooltip.getBoundingClientRect();
      var left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
      left = Math.max(margin, Math.min(left, window.innerWidth - tooltipRect.width - margin));
      var top = triggerRect.top - tooltipRect.height - gap;
      if (top < margin) top = triggerRect.bottom + gap;
      top = Math.max(margin, Math.min(top, window.innerHeight - tooltipRect.height - margin));
      tooltip.style.left = Math.round(left) + "px";
      tooltip.style.top = Math.round(top) + "px";
    }

    document.querySelectorAll(".md-typeset .ptag[title], .md-typeset .award-badge[title]").forEach(function (trigger) {
      if (trigger.dataset.tooltipInitialized === "true") return;
      var description = trigger.getAttribute("title");
      if (!description) return;

      trigger.dataset.tooltipInitialized = "true";
      trigger.removeAttribute("title");
      trigger.classList.add("lab-tooltip-trigger");
      if (!trigger.matches("a[href], button, input, select, textarea, [tabindex]")) {
        trigger.tabIndex = 0;
      }

      var tooltip = document.createElement("span");
      tooltip.className = "lab-tooltip";
      tooltip.id = uniqueId("lab-tooltip");
      tooltip.setAttribute("role", "tooltip");
      tooltip.textContent = description;
      tooltip.hidden = true;
      document.body.appendChild(tooltip);
      trigger.setAttribute("aria-describedby", tooltip.id);
      var triggerHovered = false;
      var tooltipHovered = false;
      var hideTimer = null;

      function cancelHide() {
        if (hideTimer !== null) {
          window.clearTimeout(hideTimer);
          hideTimer = null;
        }
      }

      function showTooltip() {
        if (openTooltip && openTooltip.tooltip !== tooltip) closeTooltip();
        cancelHide();
        tooltip.hidden = false;
        openTooltip = {
          trigger: trigger,
          tooltip: tooltip,
          cancelHide: cancelHide
        };
        window.requestAnimationFrame(function () {
          if (!tooltip.hidden) positionTooltip(trigger, tooltip);
        });
      }

      function hideTooltip() {
        if (openTooltip && openTooltip.tooltip === tooltip) closeTooltip();
      }

      function scheduleHide() {
        cancelHide();
        hideTimer = window.setTimeout(function () {
          hideTimer = null;
          if (!triggerHovered && !tooltipHovered && document.activeElement !== trigger) {
            hideTooltip();
          }
        }, 150);
      }

      trigger.addEventListener("mouseenter", function () {
        triggerHovered = true;
        showTooltip();
      });
      trigger.addEventListener("mouseleave", function () {
        triggerHovered = false;
        scheduleHide();
      });
      trigger.addEventListener("focus", showTooltip);
      trigger.addEventListener("blur", scheduleHide);
      trigger.addEventListener("click", showTooltip);
      tooltip.addEventListener("mouseenter", function () {
        tooltipHovered = true;
        cancelHide();
      });
      tooltip.addEventListener("mouseleave", function () {
        tooltipHovered = false;
        scheduleHide();
      });
    });

    document.addEventListener("pointerdown", function (event) {
      if (
        openTooltip &&
        !openTooltip.trigger.contains(event.target) &&
        !openTooltip.tooltip.contains(event.target)
      ) {
        closeTooltip();
      }
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeTooltip();
    });
    window.addEventListener("resize", closeTooltip);
    window.addEventListener("scroll", closeTooltip, true);
  }

  function initAll() {
    initPublicationControls();
    initNewsPagination();
    initAccessibleTooltips();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }
})();
