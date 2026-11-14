/* Synchronous DOM hydration for jm-view-server static preview pages */
(function () {
  'use strict';

  var mock = window.JmvMock;
  if (!mock) return;

  var FOLDER_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>';
  var FILE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>';
  var EYE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.1 12.35a1 1 0 0 1 0-.7C3.5 8.1 6.9 5.5 12 5.5s8.5 2.6 9.9 6.15a1 1 0 0 1 0 .7C20.5 15.9 17.1 18.5 12 18.5s-8.5-2.6-9.9-6.15Z"/><circle cx="12" cy="12" r="3"/></svg>';
  var MORE_SVG = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>';
  var FOLDER_BADGE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"/></svg>';

  function escHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escAttr(value) {
    return escHtml(value);
  }

  function escJsArg(value) {
    var jsEscaped = String(value == null ? '' : value)
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\r/g, '\\r')
      .replace(/\n/g, '\\n');
    return escHtml(jsEscaped);
  }

  function encodeQuoted(raw) {
    return encodeURIComponent(String(raw == null ? '' : raw)).replace(/'/g, '%27');
  }

  function currentPageName() {
    var path = window.location.pathname || '';
    if (path.endsWith('/')) return 'index.html';
    var parts = path.split('/');
    return (parts[parts.length - 1] || 'index.html').toLowerCase();
  }

  function bootstrapIndex() {
    var params = new URLSearchParams(window.location.search);
    var requestedPath = params.get('path') || '/works';
    var listing = mock.listDirectory(requestedPath, false);
    var curPath = listing.path;
    var defaultPath = '/works';

    var curText = document.getElementById('currentPathText');
    if (curText) {
      curText.setAttribute('data-path', curPath);
      curText.textContent = curPath.replace(/^[\\/]+|[\\/]+$/g, '');
    }

    var crumbsHome = document.getElementById('crumbs-home');
    if (crumbsHome) {
      crumbsHome.setAttribute('onclick', "changeDir('" + escJsArg(defaultPath) + "'); event.stopPropagation();");
    }

    var addrText = document.getElementById('addrText');
    if (addrText) addrText.textContent = window.location.host || 'localhost';
    var addrPill = document.querySelector('.addr-pill');
    if (addrPill) addrPill.setAttribute('onclick', "copyAddr('" + escJsArg(window.location.origin) + "')");

    var homeBtn = document.querySelector('button[aria-label="回到共享目录"]');
    if (homeBtn) homeBtn.setAttribute('onclick', "changeDir('" + escJsArg(defaultPath) + "')");

    var uploadLink = document.getElementById('uploadLink');
    if (uploadLink) uploadLink.setAttribute('href', './upload.html?path=' + encodeURIComponent(curPath));

    var columnView = document.getElementById('columnView');
    if (columnView) {
      columnView.setAttribute('data-initial-path', curPath);
      columnView.setAttribute('data-root-path', defaultPath);
    }

    var cfgEl = document.getElementById('browserConfig');
    if (cfgEl) cfgEl.textContent = JSON.stringify({ defaultPath: defaultPath });

    var driversRow = document.querySelector('.drivers-row');
    if (driversRow) {
      driversRow.innerHTML = '<span>驱动器:</span>' + listing.drivers.map(function (drv) {
        return '<a href="javascript:" class="driver-pill" location="' + escAttr(drv) + '">' + escHtml(drv) + '</a>';
      }).join('');
    }

    var listBody = document.querySelector('.file-list-body');
    if (listBody) {
      listBody.innerHTML = listing.files.map(function (file, idx) {
        var isDir = file.type === 'dir';
        var canRead = Boolean(file.jm_view && (isDir || mock.isImageName(file.name)));
        var hasPreview = Boolean(file.first_img_url && (file.first_img_url.data_thumb || file.first_img_url.data_original));
        var qPath = encodeQuoted(file.path);
        var mqPath = encodeQuoted(file.path);
        var thumbUrl = hasPreview ? (file.first_img_url.data_thumb || file.first_img_url.data_original) : '';
        var previewAttr = idx < 4 ? 'src' : 'data-thumb-src';

        return '' +
          '<div class="file-item' + (hasPreview ? ' has-preview' : '') + '"' +
          ' data-type="' + (isDir ? 'dir' : 'file') + '"' +
          ' type="' + (file.jm_view ? 'True' : 'False') + '"' +
          ' onclick="handleFileItemClick(event, this)">' +
            '<div class="file-name-col ' + escAttr(file.type) + '">' +
              '<input type="checkbox" class="row-select" style="display:none" data-path="' + escAttr(mqPath) + '" data-name="' + escAttr(file.name) + '">' +
              '<div class="file-icon" id="fileIcon' + (idx + 1) + '" data-browser-icon="' + (isDir ? 'folder' : 'auto') + '" data-file-name="' + escAttr(file.name) + '">' +
                (isDir ? FOLDER_SVG : FILE_SVG) +
              '</div>' +
              '<div class="file-entry-text">' +
                '<a href="' + escAttr(file.href) + '" class="file-link" dirname="' + escAttr(file.name) + '" path="' + escAttr(qPath) + '">' + escHtml(file.name) + '</a>' +
              '</div>' +
            '</div>' +
            '<div class="text-sm size-col"><a href="javascript:" class="size-text" onclick="openDir(\'' + escJsArg(qPath) + '\')">' + escHtml(file.size) + '</a></div>' +
            '<div class="text-sm date-col">' + escHtml(file.ctime) + '</div>' +
            '<div class="file-action-col">' +
              (canRead ? '<a href="javascript:" class="action-btn" onclick="openJmView(\'' + escJsArg(qPath) + '\', \'' + escJsArg(file.type) + '\')"><span class="eye-ico">' + EYE_SVG + '</span> 看本</a>' : '') +
              '<div class="more-menu">' +
                '<button class="more-btn" title="更多操作" onclick="toggleMoreMenu(event, this)"><span class="more-ico">' + MORE_SVG + '</span></button>' +
                '<div class="more-dropdown">' +
                  (canRead && isDir ? '<a href="javascript:" class="more-item" onclick="downloadZip(\'' + escJsArg(qPath) + '\')">打包下载</a>' : '') +
                  '<a href="javascript:" class="more-item" onclick="renameItem(\'' + escJsArg(mqPath) + '\', \'' + escJsArg(file.name) + '\')">重命名</a>' +
                  '<a href="javascript:" class="more-item" onclick="moveItem(\'' + escJsArg(mqPath) + '\', \'' + escJsArg(file.name) + '\')">移动到…</a>' +
                  '<a href="javascript:" class="more-item" onclick="openDir(\'' + escJsArg(qPath) + '\')">在文件管理器中显示</a>' +
                  '<a href="javascript:" class="more-item more-item-danger" onclick="deleteItem(event, \'' + escJsArg(mqPath) + '\', \'' + escJsArg(file.name) + '\')">移入回收站</a>' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div class="preview-col">' +
              (hasPreview ? '<img ' + previewAttr + '="' + escAttr(thumbUrl) + '" class="preview-img" loading="lazy" alt="" decoding="async">' : '') +
            '</div>' +
          '</div>';
      }).join('');
    }

    var gridView = document.querySelector('.grid-view');
    if (gridView) {
      var cardsHtml = listing.files.map(function (file, idx) {
        var isDir = file.type === 'dir';
        var canRead = Boolean(file.jm_view && (isDir || mock.isImageName(file.name)));
        var hasPreview = Boolean(file.first_img_url && (file.first_img_url.data_thumb || file.first_img_url.data_original));
        var qPath = encodeQuoted(file.path);
        var mqPath = encodeQuoted(file.path);
        var thumbUrl = hasPreview ? (file.first_img_url.data_thumb || file.first_img_url.data_original) : '';

        return '' +
          '<div class="card-item file-item rise" data-type="' + (isDir ? 'dir' : 'file') + '" type="' + (file.jm_view ? 'True' : 'False') + '" style="animation-delay:' + (idx * 0.03).toFixed(2) + 's; cursor:pointer;" onclick="handleFileItemClick(event, this)">' +
            '<div class="card-cover">' +
              '<input type="checkbox" class="row-select" style="display:none; position:absolute; top:8px; left:8px; z-index:10; width:18px; height:18px; cursor:pointer; accent-color:var(--brand);" data-path="' + escAttr(mqPath) + '" data-name="' + escAttr(file.name) + '" onclick="event.stopPropagation()">' +
              (hasPreview
                ? '<img data-thumb-src="' + escAttr(thumbUrl) + '" alt="" loading="lazy" decoding="async">' +
                  (isDir ? '<div class="card-type-badge folder-badge" title="文件夹">' + FOLDER_BADGE_SVG + '</div>' : '')
                : '<span class="folder-ico" id="cardFolderIco' + (idx + 1) + '" data-browser-icon="' + (isDir ? 'folder' : 'auto') + '" data-file-name="' + escAttr(file.name) + '"></span>') +
              '<button class="card-delete-btn delete-btn" title="移入回收站" onclick="deleteItem(event, \'' + escJsArg(mqPath) + '\', \'' + escJsArg(file.name) + '\')"></button>' +
            '</div>' +
            '<div class="card-meta">' +
              '<div class="name" title="' + escAttr(file.name) + '">' +
                '<div class="file-name-col ' + escAttr(file.type) + '" style="display:none">' +
                  '<a href="' + escAttr(file.href) + '" class="file-link" dirname="' + escAttr(file.name) + '" path="' + escAttr(qPath) + '">' + escHtml(file.name) + '</a>' +
                '</div>' +
                '<a href="' + escAttr(file.href) + '" class="card-name-link" title="' + escAttr(file.name) + '" ' +
                  (isDir ? 'onclick="event.preventDefault();changeDir(decodeURIComponent(\'' + escJsArg(qPath) + '\'))"' : '') +
                  ' path="' + escAttr(qPath) + '" dirname="' + escAttr(file.name) + '">' +
                  '<span class="grid-icon" id="gridIcon' + (idx + 1) + '" data-browser-icon="' + (isDir ? 'folder' : 'auto') + '" data-file-name="' + escAttr(file.name) + '" style="display: inline-flex; align-items: center; vertical-align: middle; margin-right: 4px; color: var(--text-secondary); opacity: 0.85;"></span>' +
                  '<span style="vertical-align: middle;">' + escHtml(file.name) + '</span>' +
                '</a>' +
              '</div>' +
              '<div class="info">' +
                '<span class="size-col" style="display:none">' + escHtml(file.size) + '</span>' +
                '<span class="date-col" style="display:none">' + escHtml(file.ctime) + '</span>' +
                '<span>' + escHtml(file.size) + '</span>' +
                '<span>' + escHtml(file.ctime) + '</span>' +
              '</div>' +
            '</div>' +
            (canRead
              ? '<div class="card-jmview-btn"><a href="javascript:" class="action-btn" onclick="event.stopPropagation();openJmView(\'' + escJsArg(qPath) + '\', \'' + escJsArg(file.type) + '\')">看本</a></div>'
              : '') +
          '</div>';
      }).join('');
      gridView.innerHTML = cardsHtml + '<div class="filter-empty" id="filterEmptyGrid">没有匹配的文件或文件夹</div>';
    }

    if (!listing.files.length) {
      ['filterEmptyList', 'filterEmptyGrid'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) {
          el.textContent = '当前目录没有文件或文件夹';
          el.style.display = 'block';
        }
      });
    }

    document.addEventListener('DOMContentLoaded', function () {
      document.querySelectorAll('[data-jmv-upload-link]').forEach(function (a) {
        a.href = './upload.html?path=' + encodeURIComponent(curPath);
      });
    });

    mock.hydrateBlobMedia(document);
  }

  function bootstrapReader() {
    var params = new URLSearchParams(window.location.search);
    var isFav = params.get('favorites') === '1';
    var reqPath = params.get('path') || '/works/sakura-outfit-guide/assets/men-youth';
    var album = mock.getAlbumPayload(reqPath, { favorites: isFav });
    var openFrom = params.get('openFromDir') || (isFav ? '/works' : mock.parentPath(album.full_path));
    var backHref = isFav ? './favorites.html' : './index.html?path=' + encodeURIComponent(openFrom);

    document.title = '看本 · ' + album.title;

    var backBtn = document.getElementById('backBtn');
    if (backBtn) backBtn.setAttribute('href', backHref);
    var toolBack = document.querySelector('.reader-tools-main a[title="原路返回"]');
    if (toolBack) toolBack.setAttribute('href', backHref);

    var titleEl = document.querySelector('.reader-title b');
    if (titleEl) {
      titleEl.setAttribute('title', album.full_path);
      titleEl.textContent = album.full_path;
    }

    var searchLink = document.querySelector('.reader-tools-main a[title="搜原本"]');
    if (searchLink) {
      searchLink.setAttribute('href', 'https://18comic.vip/search/photos?main_tag=0&search_query=' + encodeURIComponent(album.title));
    }

    var total = album.images.length;
    var stats = document.getElementById('readerGridStats');
    if (stats) stats.textContent = '共 ' + total + ' 页';

    var stream = document.getElementById('stream');
    if (stream) {
      stream.innerHTML = album.images.map(function (img, idx) {
        return '<div class="center scramble-page" id="page_' + idx + '" data-page="' + idx + '">' +
          '<img class="lazyload page-img"' +
          ' src="' + mock.PLACEHOLDER_GIF + '"' +
          ' data-src="' + escAttr(img.data_original) + '"' +
          ' data-original="' + escAttr(img.data_original) + '"' +
          ' alt="第 ' + (idx + 1) + ' 页">' +
          '</div>';
      }).join('');
    }

    var jumpSelect = document.getElementById('jumpSelect');
    if (jumpSelect) {
      jumpSelect.innerHTML = album.images.map(function (_, idx) {
        return '<option value="' + idx + '">第 ' + (idx + 1) + ' / ' + total + ' 页</option>';
      }).join('');
    }

    var pageSelect = document.getElementById('pageselect');
    if (pageSelect) {
      pageSelect.innerHTML = album.images.map(function (_, idx) {
        return '<option value="' + idx + '">' + (idx + 1) + '/' + total + '</option>';
      }).join('');
    }

    var cfg = document.getElementById('readerConfig');
    if (cfg) {
      cfg.textContent = JSON.stringify({
        albumId: album.title,
        albumPath: album.full_path,
        nextDirPath: album.next_dir_path || '',
        openFromDir: openFrom,
        favorites: Boolean(isFav)
      });
    }

    if (album.initialPage > 0) {
      window.addEventListener('DOMContentLoaded', function () {
        window.setTimeout(function () {
          var sel = document.getElementById('jumpSelect') || document.getElementById('pageselect');
          if (sel) {
            sel.value = String(album.initialPage);
            sel.dispatchEvent(new Event('change'));
          }
        }, 60);
      });
    }
  }

  function toEpochSeconds(val) {
    if (val == null || val === '') return '';
    var num = Number(val);
    if (!isNaN(num) && isFinite(num) && num > 0) return String(Math.floor(num));
    var parsed = Date.parse(String(val).trim().replace(' ', 'T'));
    if (!isNaN(parsed) && parsed > 0) return String(Math.floor(parsed / 1000));
    return '';
  }

  function bootstrapFavorites() {
    var favs = mock.loadFavorites().images || [];
    var vfs = mock.loadVfs();
    var availableCount = 0;

    var grid = document.querySelector('.favorites-grid');
    if (grid) {
      grid.innerHTML = favs.map(function (item) {
        var fPath = mock.normalizePath(item.path);
        var node = vfs.nodes[fPath];
        var available = Boolean(node && node.type === 'file');
        if (available) availableCount++;
        var name = node ? node.name : mock.baseName(fPath);
        var parentDir = mock.parentPath(fPath);
        var sizeLabel = node ? mock.formatBytes(node.size) : '不可用';
        var thumbUrl = available ? mock.buildThumbUrl(fPath, node) : '';
        var mtime = node && node.mtime ? node.mtime : '';
        var createdSec = toEpochSeconds(item.created_at);
        var mtimeSec = toEpochSeconds(mtime);

        return '<article class="favorite-card" data-path="' + escAttr(fPath) + '" data-available="' + (available ? '1' : '0') + '">' +
          (available
            ? '<a class="favorite-preview" href="' + escAttr(thumbUrl) + '" target="_blank" rel="noopener" aria-label="查看 ' + escAttr(name) + '">' +
                '<img src="' + escAttr(thumbUrl) + '" loading="lazy" alt="' + escAttr(name) + '">' +
              '</a>'
            : '<div class="favorite-preview favorite-missing"><span data-favorite-icon="alert" aria-hidden="true"></span>原图已移动或删除</div>') +
          '<div class="favorite-details">' +
            '<div class="favorite-caption"><span data-favorite-icon="images" aria-hidden="true"></span><h3 title="' + escAttr(name) + '">' + escHtml(name) + '</h3><span class="favorite-size">' + escHtml(sizeLabel) + '</span></div>' +
            '<div class="favorite-source"><span data-favorite-icon="folder" aria-hidden="true"></span><span title="' + escAttr(fPath) + '">' + escHtml(fPath) + '</span></div>' +
            '<dl class="favorite-metadata"><div><dt>收藏时间</dt><dd><time data-favorite-time="' + escAttr(createdSec) + '"></time></dd></div><div><dt>文件修改</dt><dd>' +
              (mtimeSec ? '<time data-favorite-time="' + escAttr(mtimeSec) + '"></time>' : '不可用') +
            '</dd></div></dl>' +
            '<div class="favorite-actions" role="group" aria-label="图片操作">' +
              '<a class="btn btn-ghost favorite-icon-button" href="./index.html?path=' + encodeURIComponent(parentDir) + '" aria-label="打开来源目录" title="打开来源目录"><span data-favorite-icon="folder" aria-hidden="true"></span></a>' +
              '<button class="btn btn-ghost favorite-icon-button" type="button" data-favorite-action="copy-path" aria-label="复制原图路径" title="复制原图路径"><span data-favorite-icon="copy" aria-hidden="true"></span></button>' +
              '<button class="btn btn-ghost favorite-icon-button favorite-remove" type="button" aria-label="取消收藏" title="取消收藏"><span data-favorite-icon="favoriteImages" aria-hidden="true"></span></button>' +
            '</div>' +
          '</div>' +
        '</article>';
      }).join('');
    }

    var totalEl = document.getElementById('favoriteTotalCount');
    if (totalEl) totalEl.textContent = String(favs.length);
    var availEl = document.getElementById('favoriteAvailableCount');
    if (availEl) availEl.textContent = String(availableCount);
    var readBtn = document.getElementById('readFavorites');
    if (readBtn) readBtn.hidden = favs.length === 0;
    var emptyEl = document.getElementById('favoritesEmpty');
    if (emptyEl) emptyEl.hidden = favs.length > 0;

    mock.hydrateBlobMedia(document);
  }

  function bootstrapUpload() {
    var params = new URLSearchParams(window.location.search);
    var target = mock.normalizePath(params.get('path') || '/works');
    var vfs = mock.loadVfs();
    if (!vfs.nodes[target] || vfs.nodes[target].type !== 'dir') {
      target = '/works';
    }
    var targetEl = document.getElementById('uploadTarget');
    if (targetEl) targetEl.textContent = target;
    var backBtn = document.getElementById('uploadBackBtn');
    if (backBtn) {
      backBtn.setAttribute('href', './index.html?path=' + encodeURIComponent(target));
    }
  }

  function bootstrapMessage() {
    var addrText = document.getElementById('addrText');
    if (addrText) addrText.textContent = window.location.host || 'localhost';
    var nickInput = document.getElementById('nicknameInput');
    if (nickInput && !nickInput.value) nickInput.value = '访客';
    var cfg = document.getElementById('messageConfig');
    if (cfg) cfg.textContent = JSON.stringify({ isLocalHost: true });
  }

  function bootstrapLogin() {
    var params = new URLSearchParams(window.location.search);
    if (params.get('logout') === '1') {
      try { localStorage.removeItem(mock.AUTH_KEY); } catch (e) {}
    }
    var form = document.querySelector('form[action="/login"], form');
    if (form) {
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        try { localStorage.setItem(mock.AUTH_KEY, '1'); } catch (e) {}
        window.location.href = './index.html?path=%2Fworks';
      });
    }
  }

  var page = currentPageName();
  if (page === 'index.html' || page === '') bootstrapIndex();
  else if (page === 'jm_view.html') bootstrapReader();
  else if (page === 'favorites.html') bootstrapFavorites();
  else if (page === 'upload.html') bootstrapUpload();
  else if (page === 'message.html') bootstrapMessage();
  else if (page === 'login.html') bootstrapLogin();
})();
