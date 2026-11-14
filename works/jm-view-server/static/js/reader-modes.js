// ---------- 阅读模式、点击翻页与键盘快捷键 ----------
var readerPageNavigation = null;
function cancelReaderPageNavigation() {
  if (!readerPageNavigation) return;
  readerPageNavigation.timers.forEach(clearTimeout);
  readerPageNavigation = null;
}
['pointerdown', 'wheel', 'keydown', 'blur', 'pagehide'].forEach(function(name) {
  window.addEventListener(name, cancelReaderPageNavigation, {capture: true, passive: true});
});
function navigateDoublePage(index) {
  cancelReaderPageNavigation();
  var navigation = {index: index, timers: []};
  readerPageNavigation = navigation;
  function align() {
    if (readerPageNavigation !== navigation || readerMode !== 'double' || !pages[index]) return;
    setActiveDoubleGroup(findDoubleGroupIndex(index), index, false);
    var rect = pages[index].getBoundingClientRect();
    window.scrollBy(0, rect.top + rect.height / 2 - window.innerHeight / 2);
  }
  align();
  [80, 180, 350, 700, 1200, 2000].forEach(function(delay) {
    navigation.timers.push(setTimeout(align, delay));
  });
  navigation.timers.push(setTimeout(function() { if (readerPageNavigation === navigation) cancelReaderPageNavigation(); }, 2100));
}
function inEditable(t) {
  if (!t) return false;
  var tag = t.tagName;
  return tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || t.isContentEditable;
}

function ensurePageLoaded(idx) {
  if (idx < 0 || idx >= pages.length) return;
  var img = pages[idx].querySelector('.page-img');
  if (!img) return;
  if (window.JmvImageLoader) { JmvImageLoader.load(img); return; }
  var source = img.getAttribute('data-src');
  if (source && img.classList.contains('lazyload')) {
    img.src = source;
    img.classList.remove('lazyload');
  }
}

function isPagedMode() {
  return readerMode === 'single';
}

var doubleWideBannerDismissed = false;

function computeImageWideFlag(img, loadedImage) {
  loadedImage = loadedImage || img;
  if (!img || !loadedImage || !loadedImage.naturalHeight) return '';
  var rot = Math.abs(parseInt(img.dataset.rotate || '0', 10) || 0) % 180;
  var w = rot !== 0 ? loadedImage.naturalHeight : loadedImage.naturalWidth;
  var h = rot !== 0 ? loadedImage.naturalWidth : loadedImage.naturalHeight;
  return w / h >= 1.2 ? '1' : '0';
}

function isNaturalWidePage(idx) {
  if (idx < 0 || idx >= pages.length) return false;
  var img = pages[idx].querySelector('.page-img');
  if (!img) return false;
  var rot = Math.abs(parseInt(img.dataset.rotate || '0', 10) || 0) % 180;
  if (rot === 0) {
    if (img.dataset.readerWide === '1') return true;
    if (img.dataset.readerWide === '0') return false;
  }
  if (img.complete && img.naturalHeight && (!img.currentSrc || img.currentSrc.indexOf('data:image/') !== 0)) {
    return computeImageWideFlag(img, img) === '1';
  }
  return img.dataset.readerWide === '1';
}

function isWidePage(idx) {
  if (typeof doubleWideLayout !== 'undefined' && doubleWideLayout === 'pair') return false;
  return isNaturalWidePage(idx);
}

function getAlbumRangesForGrouping() {
  if (typeof ALBUM_RANGES !== 'undefined' && ALBUM_RANGES && ALBUM_RANGES.length) return ALBUM_RANGES;
  return pages.length ? [{ start: 0, end: pages.length - 1 }] : [];
}

function pushDoublePair(groups, firstIdx, secondIdx, meta) {
  var physicalSlots = readingDirection === 'rtl' ? [secondIdx, firstIdx] : [firstIdx, secondIdx];
  var pageList = [];
  if (typeof firstIdx === 'number') pageList.push(firstIdx);
  if (typeof secondIdx === 'number') pageList.push(secondIdx);
  var anchorIdx = typeof firstIdx === 'number' ? firstIdx : (typeof secondIdx === 'number' ? secondIdx : 0);
  groups.push({
    pages: pageList,
    slots: physicalSlots,
    anchor: anchorIdx,
    kind: (firstIdx === null || secondIdx === null) ? 'single' : 'pair',
    insertedSlots: (meta && meta.insertedSlots) || [],
    beforePage: meta && meta.beforePage
  });
}

function buildDoubleGroups() {
  var groups = [];
  var seq = (typeof pageSequence !== 'undefined' && pageSequence && pageSequence.length) ?
            pageSequence :
            Array.from(pages).map(function(p, i) { return { type: 'page', pageIndex: i }; });
  if (!seq.length) return groups;

  var cursor = 0;
  var end = seq.length - 1;

  // 封面判定：第一项若为常规非宽图单页（且第一项不是空白插页），作为单页封面
  var firstItem = seq[cursor];
  if (firstItem.type === 'page' && !isNaturalWidePage(firstItem.pageIndex)) {
    groups.push({
      pages: [firstItem.pageIndex],
      slots: readingDirection === 'rtl' ? [firstItem.pageIndex, null] : [null, firstItem.pageIndex],
      anchor: firstItem.pageIndex,
      kind: 'cover',
      insertedSlots: [],
      beforePage: null
    });
    cursor += 1;
  }

  var pendingItem = null;

  for (; cursor <= end; cursor++) {
    var item = seq[cursor];

    if (item.type === 'page' && isWidePage(item.pageIndex)) {
      if (pendingItem !== null) {
        if (pendingItem.type === 'page') {
          pushDoublePair(groups, pendingItem.pageIndex, null);
        } else {
          var pairMeta = { insertedSlots: [readingDirection === 'rtl' ? 1 : 0], beforePage: item.pageIndex };
          pushDoublePair(groups, null, null, pairMeta);
        }
        pendingItem = null;
      }
      groups.push({ pages: [item.pageIndex], slots: [item.pageIndex, item.pageIndex], anchor: item.pageIndex, kind: 'wide' });
      continue;
    }

    if (pendingItem === null) {
      pendingItem = item;
    } else {
      var first = pendingItem;
      var second = item;
      var firstIdx = first.type === 'page' ? first.pageIndex : null;
      var secondIdx = second.type === 'page' ? second.pageIndex : null;

      var insertedSlots = [];
      var nextRealPage = null;
      if (first.type === 'blank') {
        insertedSlots.push(readingDirection === 'rtl' ? 1 : 0);
        if (second.type === 'page') nextRealPage = second.pageIndex;
      }
      if (second.type === 'blank') {
        insertedSlots.push(readingDirection === 'rtl' ? 0 : 1);
        if (nextRealPage === null) {
          for (var k = cursor + 1; k <= end; k++) {
            if (seq[k].type === 'page') { nextRealPage = seq[k].pageIndex; break; }
          }
        }
      }

      var pairMeta = { insertedSlots: insertedSlots, beforePage: nextRealPage };
      pushDoublePair(groups, firstIdx, secondIdx, pairMeta);
      pendingItem = null;
    }
  }

  if (pendingItem !== null) {
    if (pendingItem.type === 'page') {
      pushDoublePair(groups, pendingItem.pageIndex, null);
    } else {
      var pairMeta = { insertedSlots: [readingDirection === 'rtl' ? 1 : 0], beforePage: null };
      pushDoublePair(groups, null, null, pairMeta);
    }
  }

  return groups;
}

function findDoubleGroupIndex(pageIdx) {
  for (var i = 0; i < doubleGroups.length; i++) {
    if (doubleGroups[i].pages.indexOf(pageIdx) !== -1) return i;
  }
  return Math.max(0, Math.min(doubleGroups.length - 1, activeDoubleGroupIndex));
}

function clearDoublePageState(page) {
  page.classList.remove('is-double-active', 'is-double-current', 'is-double-left', 'is-double-right', 'is-double-wide', 'is-double-wide-spread', 'is-double-cover', 'is-wide-page');
  page.removeAttribute('data-double-slot');
  page.removeAttribute('data-double-group');
  page.removeAttribute('data-wide-badge');
  page.style.removeProperty('--reader-double-column');
  page.style.removeProperty('--reader-double-row');
  page.style.removeProperty('grid-column');
  page.style.removeProperty('grid-row');
}

function removeDoubleBlankSlots() {
  doubleBlankSlots.forEach(function(slot) {
    if (slot.parentNode) slot.parentNode.removeChild(slot);
  });
  doubleBlankSlots = [];
}

function createDoubleBlankSlot(groupIndex, slot, isInserted, beforePage, isEmptySpread) {
  var blankSlot = document.createElement('div');
  blankSlot.className = 'reader-double-blank' + (isInserted ? ' is-inserted' : '');
  if (isEmptySpread) blankSlot.classList.add('is-empty-spread');
  blankSlot.dataset.doubleGroup = String(groupIndex);
  blankSlot.dataset.doubleSlot = slot;
  blankSlot.style.setProperty('--reader-double-column', slot === 'left' ? '1' : '2');
  blankSlot.style.setProperty('--reader-double-row', String(groupIndex + 1));
  blankSlot.style.gridColumn = slot === 'left' ? '1' : '2';
  blankSlot.style.gridRow = String(groupIndex + 1);

  if (isInserted) {
    blankSlot.setAttribute('role', 'region');
    blankSlot.setAttribute('aria-label', '已插入空白页');

    var iconEl = document.createElement('div');
    iconEl.className = 'reader-double-blank-icon';
    iconEl.innerHTML = icon('insertPage') || icon('file');

    var labelEl = document.createElement('div');
    labelEl.className = 'reader-double-blank-label';
    labelEl.textContent = '已插入空白页';

    var subEl = document.createElement('div');
    subEl.className = 'reader-double-blank-sub';
    subEl.textContent = typeof beforePage === 'number' ? ('第 ' + (beforePage + 1) + ' 页前') : '对齐调整';

    var removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'reader-double-blank-remove';
    removeBtn.textContent = '✕ 移除插页';
    removeBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      var foundIdx = -1;
      for (var i = 0; i < pageSequence.length; i++) {
        if (pageSequence[i].type === 'blank') {
          if (typeof beforePage === 'number') {
            for (var j = i + 1; j < pageSequence.length; j++) {
              if (pageSequence[j].type === 'page') {
                if (pageSequence[j].pageIndex === beforePage) foundIdx = i;
                break;
              }
            }
            if (foundIdx !== -1) break;
          } else {
            foundIdx = i;
            break;
          }
        }
      }
      if (foundIdx !== -1) {
        pageSequence.splice(foundIdx, 1);
        saveSequenceState();
        applySequenceToDOM();
        rebuildReaderGrid();
        if (window.toast) toast('已移除插页', 'info');
      }
    });

    var content = document.createElement('div');
    content.className = 'reader-double-blank-content';
    content.appendChild(iconEl);
    content.appendChild(labelEl);
    content.appendChild(subEl);
    content.appendChild(removeBtn);
    blankSlot.appendChild(content);
  } else {
    blankSlot.setAttribute('aria-hidden', 'true');
  }

  stream.appendChild(blankSlot);
  doubleBlankSlots.push(blankSlot);
}

function setDoubleContinuousLayout(enabled) {
  if (enabled) {
    if (!doubleLayoutOriginalStyles) {
      doubleLayoutOriginalStyles = {
        bodyOverflow: document.body.style.overflow,
        streamHeight: stream.style.height,
        streamMinHeight: stream.style.minHeight,
        streamOverflow: stream.style.overflow,
        streamGridTemplateRows: stream.style.gridTemplateRows,
        streamGridAutoRows: stream.style.gridAutoRows,
        streamRowGap: stream.style.rowGap,
        streamDirection: stream.style.direction
      };
    }
    document.body.style.overflow = 'auto';
    stream.style.height = 'auto';
    stream.style.minHeight = '100vh';
    stream.style.overflow = 'visible';
    stream.style.gridTemplateRows = 'none';
    stream.style.gridAutoRows = 'auto';
    stream.style.rowGap = '0px';
    stream.style.direction = 'ltr';
  } else {
    var original = doubleLayoutOriginalStyles || {};
    document.body.style.overflow = original.bodyOverflow || '';
    stream.style.height = original.streamHeight || '';
    stream.style.minHeight = original.streamMinHeight || '';
    stream.style.overflow = original.streamOverflow || '';
    stream.style.gridTemplateRows = original.streamGridTemplateRows || '';
    stream.style.gridAutoRows = original.streamGridAutoRows || '';
    stream.style.rowGap = original.streamRowGap || '';
    stream.style.direction = original.streamDirection || '';
    doubleLayoutOriginalStyles = null;
  }
}

function renderDoubleGroups() {
  removeDoubleBlankSlots();
  pages.forEach(function(page) {
    page.classList.remove('is-active');
    clearDoublePageState(page);
  });

  doubleGroups.forEach(function(group, groupIndex) {
    group.pages.forEach(function(pageIdx) {
      var page = pages[pageIdx];
      if (!page) return;
      page.classList.add('is-double-active');
      page.dataset.doubleGroup = String(groupIndex);
      page.style.setProperty('--reader-double-row', String(groupIndex + 1));
      page.style.gridRow = String(groupIndex + 1);
      if (group.kind === 'wide') {
        page.classList.add('is-double-wide', 'is-wide-page', 'is-double-wide-spread');
        page.dataset.wideBadge = '宽幅跨页';
        page.style.gridColumn = '1 / -1';
        return;
      }
      if (group.kind === 'cover') page.classList.add('is-double-cover');
      var slot = group.slots[0] === pageIdx ? 'left' : 'right';
      page.dataset.doubleSlot = slot;
      page.style.setProperty('--reader-double-column', slot === 'left' ? '1' : '2');
      page.style.gridColumn = slot === 'left' ? '1' : '2';
      page.classList.add(slot === 'left' ? 'is-double-left' : 'is-double-right');
    });

    if (group.kind !== 'wide') {
      [0, 1].forEach(function(slotIdx) {
        if (group.slots[slotIdx] === null) {
          var side = slotIdx === 0 ? 'left' : 'right';
          var isInserted = group.insertedSlots && group.insertedSlots.indexOf(slotIdx) !== -1;
          createDoubleBlankSlot(groupIndex, side, isInserted, group.beforePage, group.pages.length === 0);
        }
      });
    }
  });
}

function preloadDoubleGroups(groupIndex) {
  [groupIndex, groupIndex - 1, groupIndex + 1].forEach(function(idx) {
    var preloadGroup = doubleGroups[idx];
    if (!preloadGroup) return;
    preloadGroup.pages.forEach(ensurePageLoaded);
  });
}

function setActiveDoubleGroup(groupIndex, preferredPageIdx, persist) {
  if (!doubleGroups.length) return;
  activeDoubleGroupIndex = Math.max(0, Math.min(doubleGroups.length - 1, groupIndex));
  var group = doubleGroups[activeDoubleGroupIndex];
  activePageIndex = group.pages.indexOf(preferredPageIdx) !== -1 ? preferredPageIdx : group.anchor;
  pages.forEach(function(page) { page.classList.remove('is-double-current'); });
  group.pages.forEach(function(pageIdx) {
    if (pages[pageIdx]) pages[pageIdx].classList.add('is-double-current');
  });
  preloadDoubleGroups(activeDoubleGroupIndex);
  updateProgress(activePageIndex);
  updateGridCurrentPage();
  updateInsertPageButtonState();
  if (persist !== false) saveCurrentProgress(activePageIndex);
}

function doubleGroupElement(groupIndex) {
  var group = doubleGroups[groupIndex];
  return group && pages[group.pages[0]] ? pages[group.pages[0]] : null;
}

function scrollToDoubleGroup(groupIndex, behavior) {
  var target = doubleGroupElement(groupIndex);
  if (!target) return;
  target.scrollIntoView({ behavior: behavior || 'smooth', block: 'center' });
}

function updateDoubleGroupFromScroll() {
  if (readerMode !== 'double' || !doubleGroups.length) return;
  if (readerPageNavigation) return;
  var viewportCenter = window.innerHeight / 2;
  var bestGroupIndex = activeDoubleGroupIndex;
  var bestDistance = Infinity;
  doubleGroups.forEach(function(group, groupIndex) {
    var element = doubleGroupElement(groupIndex);
    if (!element) return;
    var rect = element.getBoundingClientRect();
    var top = rect.top, bottom = rect.bottom;
    group.pages.forEach(function(index) {
      var other = pages[index].getBoundingClientRect();
      top = Math.min(top, other.top); bottom = Math.max(bottom, other.bottom);
    });
    var distance = Math.abs((top + bottom) / 2 - viewportCenter);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestGroupIndex = groupIndex;
    }
  });
  if (bestGroupIndex !== activeDoubleGroupIndex) {
    setActiveDoubleGroup(bestGroupIndex, doubleGroups[bestGroupIndex].anchor, false);
  }
}

function getWidePageStats() {
  var total = pages.length;
  var loadedCount = 0;
  var wideCount = 0;
  for (var i = 0; i < total; i++) {
    var img = pages[i] && pages[i].querySelector('.page-img');
    if (!img) continue;
    var rot = Math.abs(parseInt(img.dataset.rotate || '0', 10) || 0) % 180;
    var flag = rot === 0 ? img.dataset.readerWide : '';
    if (flag !== '1' && flag !== '0') {
      if (img.complete && img.naturalHeight && (!img.currentSrc || img.currentSrc.indexOf('data:image/') !== 0)) {
        flag = computeImageWideFlag(img, img);
      }
    }
    if (flag === '1' || flag === '0') {
      loadedCount++;
      if (flag === '1') wideCount++;
    }
  }
  return { total: total, loadedCount: loadedCount, wideCount: wideCount };
}

function syncDoubleWideUI() {
  var layout = typeof doubleWideLayout !== 'undefined' && doubleWideLayout === 'pair' ? 'pair' : 'spread';
  if (stream) stream.dataset.doubleWideLayout = layout;

  var ctrl = document.getElementById('doubleWideControl');
  if (ctrl) ctrl.hidden = readerMode !== 'double';
  var spreadBtn = document.getElementById('wideModeSpread');
  var pairBtn = document.getElementById('wideModePair');
  if (spreadBtn) spreadBtn.classList.toggle('active', layout === 'spread');
  if (pairBtn) pairBtn.classList.toggle('active', layout === 'pair');

  var banner = document.getElementById('doubleWideBanner');
  if (!banner) return;

  var stats = getWidePageStats();
  if (readerMode !== 'double' || doubleWideBannerDismissed || (stats.wideCount === 0 && (layout === 'spread' || stats.loadedCount === 0))) {
    banner.hidden = true;
    return;
  }

  var badgeEl = document.getElementById('doubleWideBannerBadge');
  var textEl = document.getElementById('doubleWideBannerText');
  var toggleBtn = document.getElementById('doubleWideToggleBtn');
  var singleBtn = document.getElementById('doubleWideSingleBtn');
  var isAllWide = stats.loadedCount > 0 && stats.wideCount === stats.loadedCount;

  if (isAllWide) {
    if (layout === 'spread') {
      if (badgeEl) badgeEl.textContent = '宽幅跨页模式';
      if (textEl) {
        textEl.textContent = stats.loadedCount === stats.total
          ? ('本画册共 ' + stats.total + ' 页均为宽幅横图，双页模式下默认自动跨双栏通栏展示（每行 1 张）。')
          : '当前画册页面均为宽幅横图，双页模式下默认自动跨双栏通栏展示（每行 1 张）。';
      }
      if (toggleBtn) toggleBtn.textContent = '改为双栏并排';
    } else {
      if (badgeEl) badgeEl.textContent = '双栏并排模式';
      if (textEl) textEl.textContent = '已切换为「双栏并排」：宽幅横图按每行 2 张左右并排展示，可按 D 键切换翻阅方向。';
      if (toggleBtn) toggleBtn.textContent = '恢复自动跨页';
    }
    if (singleBtn) singleBtn.hidden = false;
  } else if (stats.wideCount > 0) {
    if (layout === 'spread') {
      if (badgeEl) badgeEl.textContent = '含宽幅跨页';
      if (textEl) textEl.textContent = '画册内含宽幅横图，双页模式下横图自动跨双栏通栏展示，竖图保持左右并排。';
      if (toggleBtn) toggleBtn.textContent = '强制双栏并排';
    } else {
      if (badgeEl) badgeEl.textContent = '双栏并排模式';
      if (textEl) textEl.textContent = '已开启「强制双栏并排」：宽幅横图与竖图均按双栏并排展示。';
      if (toggleBtn) toggleBtn.textContent = '恢复自动跨页';
    }
    if (singleBtn) singleBtn.hidden = true;
  } else {
    if (badgeEl) badgeEl.textContent = '双栏并排模式';
    if (textEl) textEl.textContent = '已开启「双栏并排」：若画册含宽幅横图也将按双栏并排展示。';
    if (toggleBtn) toggleBtn.textContent = '恢复自动跨页';
    if (singleBtn) singleBtn.hidden = true;
  }

  banner.dataset.wideLayout = layout;
  banner.hidden = false;
}

function applyDoubleWideLayout(layout, persist) {
  doubleWideLayout = layout === 'pair' ? 'pair' : 'spread';
  if (persist !== false) doubleWideBannerDismissed = false;
  if (readerMode === 'double') rebuildDoubleGroups(activePageIndex, { scroll: false });
  if (typeof readerGridOverlay !== 'undefined' && readerGridOverlay && readerGridOverlay.classList.contains('show')) {
    rebuildReaderGrid();
  }
  syncDoubleWideUI();
  if (persist) {
    if (window.JmvPrefs) JmvPrefs.set('doubleWideLayout', doubleWideLayout);
    else try { localStorage.setItem('jmv-double-wide-layout', doubleWideLayout); } catch (e) {}
  }
}

function rebuildDoubleGroups(preferredPageIdx, options) {
  options = options || {};
  var keepIndex = typeof preferredPageIdx === 'number' ? preferredPageIdx : activePageIndex;
  var anchorElement = readerMode === 'double' ? pages[keepIndex] : null;
  var anchorTop = anchorElement ? anchorElement.getBoundingClientRect().top : null;
  doubleGroups = buildDoubleGroups();
  activeDoubleGroupIndex = findDoubleGroupIndex(keepIndex);
  syncDoubleWideUI();
  if (readerMode !== 'double') return;
  setDoubleContinuousLayout(true);
  renderDoubleGroups();
  setActiveDoubleGroup(activeDoubleGroupIndex, keepIndex, false);
  if (options.scroll !== false) {
    requestAnimationFrame(function() {
      scrollToDoubleGroup(activeDoubleGroupIndex, options.behavior || 'auto');
    });
  } else if (anchorTop !== null && pages[keepIndex]) {
    requestAnimationFrame(function() {
      var newTop = pages[keepIndex].getBoundingClientRect().top;
      window.scrollBy(0, newTop - anchorTop);
    });
  }
}

function cleanupDoubleLayout() {
  removeDoubleBlankSlots();
  setDoubleContinuousLayout(false);
  pages.forEach(function(page) {
    page.classList.remove('is-active');
    clearDoublePageState(page);
  });
}

function applyDoubleGroup(groupIndex, preferredPageIdx) {
  if (!doubleGroups.length) return;
  setActiveDoubleGroup(groupIndex, preferredPageIdx, true);
  navigateDoublePage(activePageIndex);
}

function scheduleDoubleGroupRebuild() {
  // Cached images can finish before the remaining reader modules are available.
  // Initial mode setup consumes their classifications after all controls exist.
  if (!readerInitialized) return;
  clearTimeout(doubleRebuildTimer);
  doubleRebuildTimer = setTimeout(function() {
    rebuildDoubleGroups(activePageIndex, { scroll: false });
  }, 0);
}

function updateImagePageType(img, loadedImage) {
  loadedImage = loadedImage || img;
  if (!img || !loadedImage || !loadedImage.naturalHeight) return;
  if (loadedImage.currentSrc && loadedImage.currentSrc.indexOf('data:image/') === 0) return;
  var wide = computeImageWideFlag(img, loadedImage);
  if (!wide) return;
  if (img.dataset.readerWide === wide) {
    syncDoubleWideUI();
    return;
  }
  var wasWide = img.dataset.readerWide === '1';
  img.dataset.readerWide = wide;
  scheduleDoubleGroupRebuild();
  syncDoubleWideUI();
  if (wasWide !== (wide === '1') && typeof requestReaderGridTypeRefresh === 'function') {
    requestReaderGridTypeRefresh();
  }
}

stream.addEventListener('load', function(e) {
  // A timeout replacement keeps the previous page shape while its GIF is shown.
  if (e.target && e.target.currentSrc && e.target.currentSrc.indexOf('data:image/') === 0) return;
  if (e.target && e.target.classList && e.target.classList.contains('page-img')) {
    if (typeof updateImageRotationFit === 'function') updateImageRotationFit(e.target);
    updateImagePageType(e.target);
  }
}, true);
pages.forEach(function(page) {
  var img = page.querySelector('.page-img');
  if (img && img.complete && img.currentSrc.indexOf('data:image/') !== 0) updateImagePageType(img);
});

function saveCurrentProgress(idx) {
  if (!ALBUM_RANGES) return;
  for (var i = 0; i < ALBUM_RANGES.length; i++) {
    var range = ALBUM_RANGES[i];
    if (idx >= range.start && idx <= range.end) {
      try { localStorage.setItem(range.key, String(idx - range.start)); } catch (e) {}
      if (window.JmvReaderMemory && !readerConfig.favorites && readerHasInteracted) JmvReaderMemory.progress(range.path || readerConfig.albumPath, pages[idx].querySelector('.page-img'));
      return;
    }
  }
}

function showSingleReaderTip() {
  try {
    if (localStorage.getItem('jmv-onboarding-single-v1') === '1') return;
    localStorage.setItem('jmv-onboarding-single-v1', '1');
  } catch (e) {}
  if (window.toast) toast('单页模式：点击图片左右翻页，按方向键翻页，按 ? 查看帮助', 'success');
}

function setReaderMode(mode, options) {
  options = options || {};
  cancelReaderPageNavigation();
  var nextMode = mode === 'single' || mode === 'double' ? mode : 'scroll';
  var keepIndex = currentPageIdx();
  var previousMode = readerMode;
  readerMode = nextMode;
  activePageIndex = Math.max(0, Math.min(pages.length - 1, keepIndex));
  document.body.classList.toggle('reader-single', readerMode === 'single');
  document.body.classList.toggle('reader-double', readerMode === 'double');
  stream.classList.toggle('reader-single-mode', readerMode === 'single');
  stream.classList.toggle('reader-double-mode', readerMode === 'double');
  var modeScroll = document.getElementById('modeScroll');
  var modeSingle = document.getElementById('modeSingle');
  var modeDouble = document.getElementById('modeDouble');
  if (modeScroll) modeScroll.classList.toggle('active', readerMode === 'scroll');
  if (modeSingle) modeSingle.classList.toggle('active', readerMode === 'single');
  if (modeDouble) modeDouble.classList.toggle('active', readerMode === 'double');
  if (window.JmvPrefs && readerMode !== 'double') {
    applyImageSize(JmvPrefs.get(readerMode === 'scroll' ? 'scrollImageSize' : 'imageSize'), true);
  }
  applySingleFit(singleFit, false);
  if (previousMode === 'double' && readerMode !== 'double') cleanupDoubleLayout();
  pages.forEach(function(page, idx) {
    page.classList.toggle('is-active', readerMode === 'single' && idx === activePageIndex);
    if (readerMode !== 'double') clearDoublePageState(page);
  });

  if (readerMode === 'single') {
    window.scrollTo(0, 0);
    ensurePageLoaded(activePageIndex);
    ensurePageLoaded(activePageIndex - 1);
    ensurePageLoaded(activePageIndex + 1);
    updateProgress(activePageIndex);
    if (!options.initial) saveCurrentProgress(activePageIndex);
    if (!options.initial) showSingleReaderTip();
  } else if (readerMode === 'double') {
    rebuildDoubleGroups(activePageIndex, { behavior: options.initial ? 'auto' : 'smooth' });
  } else {
    requestAnimationFrame(function() {
      var target = pages[activePageIndex];
      if (target) target.scrollIntoView({ behavior: options.initial ? 'auto' : 'smooth', block: 'start' });
      updateProgress(activePageIndex);
    });
  }

  if (options.persist !== false) {
    if (window.JmvPrefs) JmvPrefs.set('readerMode', readerMode);
    else try { localStorage.setItem('jmv-reader-mode', readerMode); } catch (e) {}
  }
  updateInsertPageButtonState();
  updateDocumentScrollProgress(false);
  syncDoubleWideUI();
  if (previousMode !== 'double' && readerMode === 'double' && !options.initial && doubleWideLayout === 'spread' && window.scrollY > 160) {
    var wideStats = getWidePageStats();
    if (wideStats.loadedCount > 0 && wideStats.wideCount === wideStats.loadedCount && window.toast) {
      toast('宽幅横图默认跨双栏单张通栏展示，可在顶部或更多菜单切换「双栏并排」');
    }
  }
}

function gotoPage(idx) {
  if (idx >= pages.length) {
    if (isPagedMode() && isAutoNext && NEXT_DIR_PATH) showJumpCountdown();
    else if (isPagedMode() && window.toast) toast('已经是最后一页');
    return;
  }
  idx = Math.max(0, idx);
  var target = pages[idx];
  if (!target) return;
  activePageIndex = idx;
  if (readerMode === 'single') {
    pages.forEach(function(page, pageIdx) { page.classList.toggle('is-active', pageIdx === idx); });
    ensurePageLoaded(idx);
    ensurePageLoaded(idx - 1);
    ensurePageLoaded(idx + 1);
    target.scrollTop = 0;
    updateGridCurrentPage();
  } else if (readerMode === 'double') {
    if (!doubleGroups.length) rebuildDoubleGroups(idx);
    applyDoubleGroup(findDoubleGroupIndex(idx), idx);
    return;
  } else {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  updateProgress(idx);
  saveCurrentProgress(idx);
}

function scrollActiveSinglePage(direction) {
  if (readerMode !== 'single' || singleFit !== 'custom') return false;
  var page = pages[activePageIndex];
  if (!page || page.scrollHeight <= page.clientHeight + 4) return false;
  var maxScroll = page.scrollHeight - page.clientHeight;
  if (direction > 0 && page.scrollTop < maxScroll - 4) {
    page.scrollBy({ top: Math.max(160, page.clientHeight * .82), behavior: 'smooth' });
    return true;
  }
  if (direction < 0 && page.scrollTop > 4) {
    page.scrollBy({ top: -Math.max(160, page.clientHeight * .82), behavior: 'smooth' });
    return true;
  }
  return false;
}

function applyReadingDirection(direction, persist) {
  readingDirection = direction === 'rtl' ? 'rtl' : 'ltr';
  document.body.dataset.readingDirection = readingDirection;
  stream.dataset.readingDirection = readingDirection;
  var dirLtrBtn = document.getElementById('dirLtr');
  var dirRtlBtn = document.getElementById('dirRtl');
  if (dirLtrBtn) dirLtrBtn.classList.toggle('active', readingDirection === 'ltr');
  if (dirRtlBtn) dirRtlBtn.classList.toggle('active', readingDirection === 'rtl');
  if (readerMode === 'double') rebuildDoubleGroups(activePageIndex, { scroll: false });
  if (readerGridOverlay && readerGridOverlay.classList.contains('show')) rebuildReaderGrid();
  if (persist) {
    if (window.JmvPrefs) JmvPrefs.set('readingDirection', readingDirection);
    else try { localStorage.setItem('jmv-reading-direction', readingDirection); } catch (e) {}
  }
}

(function bindDoubleWideControls() {
  var toggleBtn = document.getElementById('doubleWideToggleBtn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', function() {
      var nextLayout = doubleWideLayout === 'pair' ? 'spread' : 'pair';
      applyDoubleWideLayout(nextLayout, true);
      if (window.toast) toast(nextLayout === 'pair' ? '已切换为双栏并排' : '已恢复宽幅自动跨页');
    });
  }
  var singleBtn = document.getElementById('doubleWideSingleBtn');
  if (singleBtn) {
    singleBtn.addEventListener('click', function() {
      setReaderMode('single');
    });
  }
  var dismissBtn = document.getElementById('doubleWideDismissBtn');
  if (dismissBtn) {
    dismissBtn.addEventListener('click', function() {
      doubleWideBannerDismissed = true;
      syncDoubleWideUI();
    });
  }
  [['wideModeSpread', 'spread'], ['wideModePair', 'pair']].forEach(function(item) {
    var btn = document.getElementById(item[0]);
    if (!btn) return;
    btn.addEventListener('click', function() {
      applyDoubleWideLayout(item[1], true);
      if (window.toast) toast(item[1] === 'pair' ? '宽幅横图：双栏并排' : '宽幅横图：自动跨页');
    });
  });
})();
