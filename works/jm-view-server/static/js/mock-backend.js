/* In-browser Virtual File System & Flask API mock for jm-view-server static preview */
(function () {
  'use strict';

  var VFS_KEY = 'jmv-mock-vfs-v1';
  var FAV_KEY = 'jmv-mock-favorites-v1';
  var MSG_KEY = 'jmv-mock-messages-v1';
  var SYNC_KEY = 'jmv-mock-sync-v1';
  var AUTH_KEY = 'jmv-mock-auth-v1';
  var BG_ID_KEY = 'jmv-mock-bg-blob-v1';
  var IDB_NAME = 'jmv_mock_db';
  var IDB_STORE = 'blobs';

  var IMAGE_EXT_RE = /\.(avif|bmp|gif|jpe?g|png|webp)$/i;
  var MIME_MAP = {
    avif: 'image/avif',
    bmp: 'image/bmp',
    css: 'text/css; charset=utf-8',
    gif: 'image/gif',
    html: 'text/html; charset=utf-8',
    ico: 'image/x-icon',
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    js: 'application/javascript; charset=utf-8',
    json: 'application/json; charset=utf-8',
    md: 'text/markdown; charset=utf-8',
    png: 'image/png',
    svg: 'image/svg+xml',
    txt: 'text/plain; charset=utf-8',
    webp: 'image/webp',
    woff2: 'font/woff2'
  };
  var DEFAULT_SCOPES = {
    bookmarks: true,
    progress: true,
    sequence: true,
    readerMode: true,
    readingDirection: true,
    doubleWidthScale: true,
    eyeCare: true,
    headerHidden: true,
    progressHidden: true,
    autoNext: true
  };
  var PLACEHOLDER_GIF = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

  var dbPromise = null;
  var blobUrlCache = new Map();
  var syncBlobUrlMap = new Map();

  function getSeed() {
    return window.JMV_VFS_SEED || { version: 1, defaultPath: '/works', drivers: ['/', '/works'], nodes: { '/': { type: 'dir', name: '', ctime: '2026-01-01 00:00:00', mtime: '2026-01-01 00:00:00' }, '/works': { type: 'dir', name: 'works', ctime: '2026-01-01 00:00:00', mtime: '2026-01-01 00:00:00' } } };
  }

  function cloneJson(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function safeDecode(raw) {
    var text = String(raw == null ? '' : raw);
    try {
      return decodeURIComponent(text);
    } catch (e) {
      return text;
    }
  }

  function normalizePath(raw) {
    var text = String(raw == null ? '' : raw).trim().replace(/\\/g, '/');
    if (!text) return '/';
    var parts = text.split('/');
    var stack = [];
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i];
      if (!part || part === '.') continue;
      if (part === '..') {
        if (stack.length) stack.pop();
        continue;
      }
      stack.push(part);
    }
    return '/' + stack.join('/');
  }

  function parentPath(vpath) {
    var norm = normalizePath(vpath);
    if (norm === '/') return '/';
    var idx = norm.lastIndexOf('/');
    return idx <= 0 ? '/' : norm.slice(0, idx);
  }

  function baseName(vpath) {
    var norm = normalizePath(vpath);
    if (norm === '/') return '';
    var idx = norm.lastIndexOf('/');
    return norm.slice(idx + 1);
  }

  function joinPath(dirPath, name) {
    var cleanDir = normalizePath(dirPath);
    var cleanName = String(name || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
    if (!cleanName) return cleanDir;
    return cleanDir === '/' ? '/' + cleanName : cleanDir + '/' + cleanName;
  }

  function isInvalidSegment(name) {
    return !name || name === '.' || name === '..' || /[\\/]/.test(name);
  }

  function isImageName(name) {
    return IMAGE_EXT_RE.test(String(name || ''));
  }

  function guessMime(name, fallback) {
    var lower = String(name || '').toLowerCase();
    var dot = lower.lastIndexOf('.');
    var ext = dot >= 0 ? lower.slice(dot + 1) : '';
    return MIME_MAP[ext] || fallback || 'application/octet-stream';
  }

  function naturalCompare(a, b) {
    return String(a || '').localeCompare(String(b || ''), undefined, { numeric: true, sensitivity: 'base' });
  }

  function formatBytes(bytes) {
    var num = Number(bytes) || 0;
    if (num < 1024) return num + ' B';
    if (num < 1024 * 1024) return (num / 1024).toFixed(2) + ' KB';
    if (num < 1024 * 1024 * 1024) return (num / (1024 * 1024)).toFixed(2) + ' MB';
    return (num / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }

  function pad2(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function nowTimestamp() {
    var d = new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + ' ' +
      pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds());
  }

  function loadVfs() {
    var seed = getSeed();
    var targetDrivers = Array.isArray(seed.drivers) ? seed.drivers.slice() : ['/', '/works'];
    try {
      var raw = localStorage.getItem(VFS_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.nodes && parsed.nodes['/']) {
          if (JSON.stringify(parsed.drivers) !== JSON.stringify(targetDrivers)) {
            parsed.drivers = targetDrivers;
            saveVfs(parsed);
          }
          return parsed;
        }
      }
    } catch (e) {
      /* ignore corrupt storage and reseed below */
    }
    var fresh = {
      version: seed.version || 1,
      defaultPath: seed.defaultPath || '/works',
      drivers: targetDrivers,
      nodes: cloneJson(seed.nodes || {})
    };
    saveVfs(fresh);
    return fresh;
  }

  function saveVfs(vfs) {
    localStorage.setItem(VFS_KEY, JSON.stringify(vfs));
  }

  function getDirectChildren(vfs, dirPath) {
    var normDir = normalizePath(dirPath);
    var prefix = normDir === '/' ? '/' : normDir + '/';
    var items = [];
    Object.keys(vfs.nodes).forEach(function (vpath) {
      if (vpath === normDir || vpath.indexOf(prefix) !== 0) return;
      var rest = vpath.slice(prefix.length);
      if (!rest || rest.indexOf('/') !== -1) return;
      items.push({ path: vpath, node: vfs.nodes[vpath] });
    });
    return items;
  }

  function getDirectImageEntries(vfs, dirPath) {
    return getDirectChildren(vfs, dirPath)
      .filter(function (entry) { return entry.node.type === 'file' && isImageName(entry.node.name); })
      .sort(function (a, b) { return naturalCompare(a.node.name, b.node.name); });
  }

  function buildThumbUrl(vpath, node) {
    if (node && node.blobId) {
      if (syncBlobUrlMap.has(node.blobId)) return syncBlobUrlMap.get(node.blobId);
      return PLACEHOLDER_GIF + '#jmv-blob=' + encodeURIComponent(node.blobId);
    }
    if (node && node.sitePath) {
      return '../../' + String(node.sitePath).replace(/^\/+/, '');
    }
    return PLACEHOLDER_GIF;
  }

  function buildOriginalUrl(vpath, node) {
    if (node && node.blobId) {
      return './__jmv_blob__?id=' + encodeURIComponent(node.blobId) + '&path=' + encodeURIComponent(vpath);
    }
    if (node && node.sitePath) {
      return '../../' + String(node.sitePath).replace(/^\/+/, '') + '?path=' + encodeURIComponent(vpath);
    }
    return './__jmv_missing__?path=' + encodeURIComponent(vpath);
  }

  function buildFileItem(vfs, vpath, node) {
    var quoted = encodeURIComponent(vpath);
    var isDir = node.type === 'dir';
    var isImgFile = !isDir && isImageName(node.name);
    var directImages = isDir ? getDirectImageEntries(vfs, vpath) : [];
    var hasImages = directImages.length > 0;
    var firstImg = '';
    if (hasImages) {
      var firstEntry = directImages[0];
      firstImg = {
        filename: firstEntry.node.name,
        data_original: buildOriginalUrl(firstEntry.path, firstEntry.node),
        data_thumb: buildThumbUrl(firstEntry.path, firstEntry.node)
      };
    } else if (isImgFile) {
      firstImg = {
        filename: node.name,
        data_original: buildOriginalUrl(vpath, node),
        data_thumb: buildThumbUrl(vpath, node)
      };
    }
    var href = isDir
      ? './index.html?path=' + quoted
      : buildThumbUrl(vpath, node);
    return {
      name: node.name,
      path: vpath,
      quoted_path: quoted,
      manage_quoted_path: quoted,
      href: href,
      size: isDir ? '<DIR>' : formatBytes(node.size),
      ctime: node.ctime || nowTimestamp(),
      mtime: node.mtime || nowTimestamp(),
      type: node.type,
      target_type: node.type,
      is_link: false,
      link_broken: false,
      link_path: '',
      target_path: '',
      jm_view: hasImages || isImgFile,
      first_img_url: firstImg
    };
  }

  function resolveExistingDir(vfs, requestedPath) {
    var target = normalizePath(requestedPath || vfs.defaultPath || '/works');
    while (target !== '/' && (!vfs.nodes[target] || vfs.nodes[target].type !== 'dir')) {
      target = parentPath(target);
    }
    return target;
  }

  function listDirectory(rawPath, strict) {
    var vfs = loadVfs();
    var target = normalizePath(rawPath || vfs.defaultPath || '/works');
    if (!vfs.nodes[target] || vfs.nodes[target].type !== 'dir') {
      if (strict) return null;
      target = resolveExistingDir(vfs, target);
    }
    var entries = getDirectChildren(vfs, target);
    entries.sort(function (a, b) {
      if (a.node.type !== b.node.type) return a.node.type === 'dir' ? -1 : 1;
      var mtimeCmp = String(b.node.mtime || '').localeCompare(String(a.node.mtime || ''));
      if (mtimeCmp !== 0) return mtimeCmp;
      return naturalCompare(a.node.name, b.node.name);
    });
    var files = entries.map(function (entry) {
      return buildFileItem(vfs, entry.path, entry.node);
    });
    var activeDrivers = (vfs.drivers || ['/', '/works']).filter(function (d) {
      var node = vfs.nodes[d];
      return node && node.type === 'dir';
    });
    return {
      path: target,
      quoted_path: encodeURIComponent(target),
      parent_path: parentPath(target),
      files: files,
      drivers: activeDrivers.length ? activeDrivers : ['/']
    };
  }

  function getNextAlbumDir(vfs, curDir) {
    var normDir = normalizePath(curDir);
    if (normDir === '/') return '';
    var parent = parentPath(normDir);
    var siblingDirs = getDirectChildren(vfs, parent)
      .filter(function (entry) { return entry.node.type === 'dir'; })
      .sort(function (a, b) { return naturalCompare(a.node.name, b.node.name); });
    var idx = siblingDirs.findIndex(function (entry) { return entry.path === normDir; });
    if (idx === -1) return '';
    for (var i = idx + 1; i < siblingDirs.length; i++) {
      if (getDirectImageEntries(vfs, siblingDirs[i].path).length > 0) {
        return siblingDirs[i].path;
      }
    }
    return '';
  }

  function getAlbumPayload(rawPath, options) {
    var vfs = loadVfs();
    if (options && options.favorites) {
      var favImages = [];
      loadFavorites().images.forEach(function (item) {
        var fPath = normalizePath(item.path);
        var fNode = vfs.nodes[fPath];
        if (!fNode || fNode.type !== 'file') return;
        favImages.push({
          filename: fNode.name,
          path: fPath,
          data_original: buildOriginalUrl(fPath, fNode),
          data_thumb: buildThumbUrl(fPath, fNode)
        });
      });
      return {
        status: 'ok',
        title: '收藏图片',
        full_path: '收藏图片',
        images: favImages,
        next_dir_path: '',
        favorites: true,
        initialPage: 0
      };
    }

    var norm = normalizePath(rawPath || vfs.defaultPath || '/works');
    var pickedNode = vfs.nodes[norm];
    var targetFile = (pickedNode && pickedNode.type === 'file') ? norm : '';
    var dirPath = targetFile ? parentPath(targetFile) : resolveExistingDir(vfs, norm);
    var imgEntries = getDirectImageEntries(vfs, dirPath);
    var initialPage = 0;
    if (targetFile) {
      var foundIdx = imgEntries.findIndex(function (entry) { return entry.path === targetFile; });
      if (foundIdx >= 0) initialPage = foundIdx;
    }
    var images = imgEntries.map(function (entry) {
      var mediaUrl = buildOriginalUrl(entry.path, entry.node);
      return {
        filename: entry.node.name,
        path: entry.path,
        data_original: mediaUrl,
        data_thumb: buildThumbUrl(entry.path, entry.node)
      };
    });
    var nextDir = getNextAlbumDir(vfs, dirPath);
    return {
      status: 'ok',
      title: baseName(dirPath) || '根目录',
      full_path: dirPath,
      images: images,
      next_dir_path: nextDir ? encodeURIComponent(nextDir) : '',
      favorites: false,
      initialPage: initialPage
    };
  }

  /* ---- IndexedDB Blob Store ---- */
  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      if (!window.indexedDB) {
        reject(new Error('IndexedDB unavailable'));
        return;
      }
      var req = window.indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE, { keyPath: 'id' });
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error || new Error('IndexedDB open failed')); };
    });
    return dbPromise;
  }

  function putBlobRecord(id, blob, meta) {
    var objectUrl = URL.createObjectURL(blob);
    blobUrlCache.set(id, Promise.resolve(objectUrl));
    syncBlobUrlMap.set(id, objectUrl);
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(IDB_STORE, 'readwrite');
        var store = tx.objectStore(IDB_STORE);
        store.put({
          id: id,
          blob: blob,
          mime: (meta && meta.mime) || blob.type || 'application/octet-stream',
          name: (meta && meta.name) || id
        });
        tx.oncomplete = function () { resolve(objectUrl); };
        tx.onerror = function () { reject(tx.error || new Error('IndexedDB write failed')); };
      });
    });
  }

  function getBlobRecord(id) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(IDB_STORE, 'readonly');
        var req = tx.objectStore(IDB_STORE).get(id);
        req.onsuccess = function () { resolve(req.result || null); };
        req.onerror = function () { reject(req.error || new Error('IndexedDB read failed')); };
      });
    });
  }

  function getBlobObjectUrl(id) {
    if (syncBlobUrlMap.has(id)) return Promise.resolve(syncBlobUrlMap.get(id));
    if (blobUrlCache.has(id)) return blobUrlCache.get(id);
    var p = getBlobRecord(id).then(function (rec) {
      if (!rec || !rec.blob) return '';
      var url = URL.createObjectURL(rec.blob);
      syncBlobUrlMap.set(id, url);
      return url;
    }).catch(function () { return ''; });
    blobUrlCache.set(id, p);
    return p;
  }

  function deleteBlobRecord(id) {
    syncBlobUrlMap.delete(id);
    blobUrlCache.delete(id);
    return openDb().then(function (db) {
      return new Promise(function (resolve) {
        var tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).delete(id);
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { resolve(); };
      });
    }).catch(function () {});
  }

  function preloadAllBlobs() {
    return openDb().then(function (db) {
      return new Promise(function (resolve) {
        var tx = db.transaction(IDB_STORE, 'readonly');
        var req = tx.objectStore(IDB_STORE).getAll();
        req.onsuccess = function () {
          var records = Array.isArray(req.result) ? req.result : [];
          records.forEach(function (rec) {
            if (rec && rec.id && rec.blob && !syncBlobUrlMap.has(rec.id)) {
              var url = URL.createObjectURL(rec.blob);
              syncBlobUrlMap.set(rec.id, url);
              blobUrlCache.set(rec.id, Promise.resolve(url));
            }
          });
          resolve();
        };
        req.onerror = function () { resolve(); };
      });
    }).catch(function () {});
  }

  function extractBlobFragment(raw) {
    var str = String(raw || '');
    var match = str.match(/#jmv-blob=([^&]+)/);
    return match ? safeDecode(match[1]) : '';
  }

  function resolveBlobIdFromValue(val) {
    var blobId = extractBlobFragment(val);
    if (!blobId && val.indexOf('__jmv_blob__?') !== -1) {
      try {
        blobId = new URL(val, window.location.origin).searchParams.get('id') || '';
      } catch (e) {
        blobId = '';
      }
    }
    return blobId;
  }

  function hydrateElement(el) {
    if (!el || el.nodeType !== 1) return;
    var attrs = el.tagName === 'IMG' ? ['src', 'data-thumb-src'] : el.tagName === 'A' ? ['href'] : [];
    attrs.forEach(function (attr) {
      var val = el.getAttribute(attr) || '';
      if (!val) return;
      var blobId = resolveBlobIdFromValue(val);
      if (!blobId) return;
      getBlobObjectUrl(blobId).then(function (url) {
        if (!url) return;
        if (el.getAttribute(attr) !== url) el.setAttribute(attr, url);
      });
    });
  }

  function hydrateBlobMedia(root) {
    var scope = root || document;
    if (!scope || !scope.querySelectorAll) return;
    scope.querySelectorAll(
      'img[src*="#jmv-blob="], img[src*="__jmv_blob__"], img[data-thumb-src*="#jmv-blob="], img[data-thumb-src*="__jmv_blob__"], a[href*="#jmv-blob="], a[href*="__jmv_blob__"]'
    ).forEach(hydrateElement);
  }

  function startBlobObserver() {
    if (!window.MutationObserver) return;
    var target = document.documentElement;
    if (!target) return;
    var obs = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var m = mutations[i];
        if (m.type === 'attributes') {
          hydrateElement(m.target);
        } else if (m.addedNodes) {
          for (var j = 0; j < m.addedNodes.length; j++) {
            var n = m.addedNodes[j];
            if (n.nodeType !== 1) continue;
            hydrateElement(n);
            hydrateBlobMedia(n);
          }
        }
      }
    });
    obs.observe(target, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'href', 'data-thumb-src'] });
  }

  /* ---- Favorites Helpers ---- */
  function loadFavorites() {
    try {
      var raw = localStorage.getItem(FAV_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.images)) return parsed;
      }
    } catch (e) {
      /* reset corrupt favorites */
    }
    return { images: [] };
  }

  function saveFavorites(data) {
    localStorage.setItem(FAV_KEY, JSON.stringify({ images: data.images || [] }));
  }

  function remapFavoritesPrefix(oldPrefix, newPrefix) {
    var favs = loadFavorites();
    var changed = false;
    favs.images = favs.images.map(function (item) {
      var p = normalizePath(item.path);
      if (p === oldPrefix || p.indexOf(oldPrefix + '/') === 0) {
        changed = true;
        return {
          path: newPrefix === '' ? '' : newPrefix + p.slice(oldPrefix.length),
          created_at: item.created_at
        };
      }
      return item;
    }).filter(function (item) { return Boolean(item.path); });
    if (changed) saveFavorites(favs);
  }

  function collectUnreferencedBlobs(vfs, candidateBlobIds) {
    if (!candidateBlobIds.length) return;
    var used = {};
    Object.keys(vfs.nodes).forEach(function (k) {
      var b = vfs.nodes[k].blobId;
      if (b) used[b] = true;
    });
    var bgId = localStorage.getItem(BG_ID_KEY);
    if (bgId) used[bgId] = true;
    candidateBlobIds.forEach(function (id) {
      if (!used[id]) deleteBlobRecord(id);
    });
  }

  /* ---- VFS Mutations ---- */
  function splitCollisionName(fileName) {
    var dot = fileName.lastIndexOf('.');
    if (dot <= 0) return { stem: fileName, ext: '' };
    return { stem: fileName.slice(0, dot), ext: fileName.slice(dot) };
  }

  function uniqueNameInDir(vfs, dirPath, desiredName) {
    if (!vfs.nodes[joinPath(dirPath, desiredName)]) return desiredName;
    var parts = splitCollisionName(desiredName);
    var n = 1;
    while (vfs.nodes[joinPath(dirPath, parts.stem + ' (' + n + ')' + parts.ext)]) {
      n++;
    }
    return parts.stem + ' (' + n + ')' + parts.ext;
  }

  function ensureDirPath(vfs, rawDir) {
    var target = normalizePath(rawDir);
    if (target === '/') return true;
    var parts = target.slice(1).split('/');
    var cur = '';
    var ts = nowTimestamp();
    for (var i = 0; i < parts.length; i++) {
      cur += '/' + parts[i];
      if (!vfs.nodes[cur]) {
        vfs.nodes[cur] = { type: 'dir', name: parts[i], ctime: ts, mtime: ts };
      } else if (vfs.nodes[cur].type !== 'dir') {
        return false;
      }
    }
    return true;
  }

  function mutateMkdir(rawParent, rawName) {
    var vfs = loadVfs();
    var pDir = normalizePath(rawParent || '/works');
    var name = String(rawName || '').trim();
    if (!vfs.nodes[pDir] || vfs.nodes[pDir].type !== 'dir') {
      return { code: 404, body: { status: 'error', error: '目标父目录不存在' } };
    }
    if (isInvalidSegment(name)) {
      return { code: 400, body: { status: 'error', error: '文件夹名称不合法' } };
    }
    var nextPath = joinPath(pDir, name);
    if (vfs.nodes[nextPath]) {
      return { code: 409, body: { status: 'error', error: '同名文件或文件夹已存在' } };
    }
    var ts = nowTimestamp();
    vfs.nodes[nextPath] = { type: 'dir', name: name, ctime: ts, mtime: ts };
    saveVfs(vfs);
    return { code: 200, body: { status: 'ok', path: nextPath, name: name } };
  }

  function relocateSubtree(vfs, srcPath, destPath, newBaseName) {
    var prefix = srcPath + '/';
    var toMove = Object.keys(vfs.nodes).filter(function (k) {
      return k === srcPath || k.indexOf(prefix) === 0;
    });
    var ts = nowTimestamp();
    toMove.sort(function (a, b) { return a.length - b.length; });
    toMove.forEach(function (oldKey) {
      var node = vfs.nodes[oldKey];
      delete vfs.nodes[oldKey];
      var mapped = destPath + oldKey.slice(srcPath.length);
      if (oldKey === srcPath && newBaseName) node.name = newBaseName;
      node.mtime = ts;
      vfs.nodes[mapped] = node;
    });
    remapFavoritesPrefix(srcPath, destPath);
  }

  function mutateRename(rawPath, rawNewName) {
    var vfs = loadVfs();
    var src = normalizePath(safeDecode(rawPath));
    var newName = String(rawNewName || '').trim();
    if (src === '/' || !vfs.nodes[src]) {
      return { code: 404, body: { status: 'error', error: '原路径不存在' } };
    }
    if (isInvalidSegment(newName)) {
      return { code: 400, body: { status: 'error', error: '新名称不合法' } };
    }
    var dest = joinPath(parentPath(src), newName);
    if (dest === src) {
      return { code: 200, body: { status: 'ok', path: dest } };
    }
    if (vfs.nodes[dest]) {
      return { code: 409, body: { status: 'error', error: '目标名称已存在' } };
    }
    relocateSubtree(vfs, src, dest, newName);
    saveVfs(vfs);
    return { code: 200, body: { status: 'ok', path: dest } };
  }

  function mutateMove(rawSrc, rawTargetDir) {
    var vfs = loadVfs();
    var src = normalizePath(safeDecode(rawSrc));
    var targetDir = normalizePath(safeDecode(rawTargetDir));
    if (src === '/' || !vfs.nodes[src]) {
      return { code: 404, body: { status: 'error', error: '源文件或文件夹不存在' } };
    }
    if (!vfs.nodes[targetDir] || vfs.nodes[targetDir].type !== 'dir') {
      return { code: 404, body: { status: 'error', error: '目标目录不存在' } };
    }
    if (targetDir === src || targetDir.indexOf(src + '/') === 0) {
      return { code: 400, body: { status: 'error', error: '不能移动到自身或子目录中' } };
    }
    var dest = joinPath(targetDir, baseName(src));
    if (dest === src) {
      return { code: 200, body: { status: 'ok', path: dest } };
    }
    if (vfs.nodes[dest]) {
      return { code: 409, body: { status: 'error', error: '目标目录已存在同名项目' } };
    }
    relocateSubtree(vfs, src, dest, baseName(src));
    saveVfs(vfs);
    return { code: 200, body: { status: 'ok', path: dest } };
  }

  function removeOnePath(vfs, rawTarget) {
    var target = normalizePath(safeDecode(rawTarget));
    if (target === '/' || !vfs.nodes[target]) {
      return { ok: false, path: target, error: target === '/' ? '根目录不可删除' : '项目不存在' };
    }
    var prefix = target + '/';
    var keys = Object.keys(vfs.nodes).filter(function (k) {
      return k === target || k.indexOf(prefix) === 0;
    });
    var deletedBlobs = [];
    keys.forEach(function (k) {
      if (vfs.nodes[k] && vfs.nodes[k].blobId) deletedBlobs.push(vfs.nodes[k].blobId);
      delete vfs.nodes[k];
    });
    remapFavoritesPrefix(target, '');
    return { ok: true, path: target, blobs: deletedBlobs };
  }

  function mutateDelete(rawTarget) {
    var vfs = loadVfs();
    var res = removeOnePath(vfs, rawTarget);
    if (!res.ok) return { code: 404, body: { status: 'error', error: res.error } };
    saveVfs(vfs);
    collectUnreferencedBlobs(vfs, res.blobs);
    return { code: 200, body: { status: 'ok', deleted: res.path } };
  }

  function mutateBatchDelete(rawPaths) {
    var vfs = loadVfs();
    var list = Array.isArray(rawPaths) ? rawPaths : [];
    var succeeded = [];
    var failed = [];
    var candidateBlobs = [];
    list.forEach(function (item) {
      var res = removeOnePath(vfs, item);
      if (res.ok) {
        succeeded.push(res.path);
        candidateBlobs = candidateBlobs.concat(res.blobs);
      } else {
        failed.push({ path: res.path, error: res.error });
      }
    });
    saveVfs(vfs);
    collectUnreferencedBlobs(vfs, candidateBlobs);
    return { code: 200, body: { status: 'ok', succeeded: succeeded, failed: failed } };
  }

  /* ---- Pure JS STORE ZIP Builder (Zero Dependencies) ---- */
  var CRC_TABLE = (function () {
    var tbl = new Uint32Array(256);
    for (var i = 0; i < 256; i++) {
      var c = i;
      for (var k = 0; k < 8; k++) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      }
      tbl[i] = c >>> 0;
    }
    return tbl;
  })();

  function crc32(bytes) {
    var c = 0xffffffff;
    for (var i = 0; i < bytes.length; i++) {
      c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function encodeZip(entries) {
    var encoder = new TextEncoder();
    var localParts = [];
    var centralParts = [];
    var offset = 0;

    entries.forEach(function (entry) {
      var nameBytes = encoder.encode(entry.name);
      var data = entry.data || new Uint8Array(0);
      var sum = crc32(data);
      var len = data.byteLength;

      var localHdr = new Uint8Array(30 + nameBytes.length);
      var lv = new DataView(localHdr.buffer);
      lv.setUint32(0, 0x04034b50, true);
      lv.setUint16(4, 20, true);
      lv.setUint16(6, 0x0800, true); /* UTF-8 filenames */
      lv.setUint16(8, 0, true);      /* STORE */
      lv.setUint16(10, 0, true);
      lv.setUint16(12, 0, true);
      lv.setUint32(14, sum, true);
      lv.setUint32(18, len, true);
      lv.setUint32(22, len, true);
      lv.setUint16(26, nameBytes.length, true);
      lv.setUint16(28, 0, true);
      localHdr.set(nameBytes, 30);
      localParts.push(localHdr, data);

      var centralHdr = new Uint8Array(46 + nameBytes.length);
      var cv = new DataView(centralHdr.buffer);
      cv.setUint32(0, 0x02014b50, true);
      cv.setUint16(4, 20, true);
      cv.setUint16(6, 20, true);
      cv.setUint16(8, 0x0800, true);
      cv.setUint16(10, 0, true);
      cv.setUint16(12, 0, true);
      cv.setUint16(14, 0, true);
      cv.setUint32(16, sum, true);
      cv.setUint32(20, len, true);
      cv.setUint32(24, len, true);
      cv.setUint16(28, nameBytes.length, true);
      cv.setUint16(30, 0, true);
      cv.setUint16(32, 0, true);
      cv.setUint16(34, 0, true);
      cv.setUint16(36, 0, true);
      cv.setUint32(38, 0, true);
      cv.setUint32(42, offset, true);
      centralHdr.set(nameBytes, 46);
      centralParts.push(centralHdr);

      offset += localHdr.byteLength + len;
    });

    var centralSize = centralParts.reduce(function (acc, p) { return acc + p.byteLength; }, 0);
    var eocd = new Uint8Array(22);
    var ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(4, 0, true);
    ev.setUint16(6, 0, true);
    ev.setUint16(8, entries.length, true);
    ev.setUint16(10, entries.length, true);
    ev.setUint32(12, centralSize, true);
    ev.setUint32(16, offset, true);
    ev.setUint16(20, 0, true);

    return new Blob(localParts.concat(centralParts, [eocd]), { type: 'application/zip' });
  }

  function readNodeBytes(node, originalFetch) {
    if (node.blobId) {
      return getBlobRecord(node.blobId).then(function (rec) {
        return rec && rec.blob ? rec.blob.arrayBuffer().then(function (buf) { return new Uint8Array(buf); }) : new Uint8Array(0);
      });
    }
    if (node.sitePath) {
      return originalFetch('../../' + String(node.sitePath).replace(/^\/+/, ''))
        .then(function (resp) { return resp.ok ? resp.arrayBuffer() : new ArrayBuffer(0); })
        .then(function (buf) { return new Uint8Array(buf); });
    }
    return Promise.resolve(new Uint8Array(0));
  }

  function buildZipResponse(rawPath, originalFetch) {
    var vfs = loadVfs();
    var target = normalizePath(safeDecode(rawPath));
    var node = vfs.nodes[target];
    if (!node) {
      return Promise.resolve(jsonResponse({ status: 'error', error: '目标不存在' }, 404));
    }
    var baseLabel = baseName(target) || 'workspace';
    var targets = [];
    if (node.type === 'file') {
      targets.push({ archiveName: node.name, node: node });
    } else {
      var prefix = target === '/' ? '/' : target + '/';
      Object.keys(vfs.nodes).sort().forEach(function (k) {
        var child = vfs.nodes[k];
        if (child && child.type === 'file' && k.indexOf(prefix) === 0) {
          var rel = k.slice(prefix.length);
          targets.push({ archiveName: baseLabel + '/' + rel, node: child });
        }
      });
    }
    return Promise.all(targets.map(function (item) {
      return readNodeBytes(item.node, originalFetch).then(function (bytes) {
        return { name: item.archiveName, data: bytes };
      });
    })).then(function (entries) {
      var blob = encodeZip(entries);
      var fname = baseLabel + '.zip';
      return new Response(blob, {
        status: 200,
        headers: {
          'Content-Type': 'application/zip',
          'Content-Length': String(blob.size),
          'Content-Disposition': 'attachment; filename="' + encodeURIComponent(fname) + '"; filename*=UTF-8\'\'' + encodeURIComponent(fname)
        }
      });
    });
  }

  /* ---- Messages Helpers ---- */
  function loadMessages() {
    var defaultMsgs = [
      { id: 1, sender: '系统通知', content: '欢迎使用 jm-view-server，支持列表、网格与分栏浏览，含图片的文件夹可直接进入看本模式。' },
      { id: 2, sender: '使用提示', content: '可在设置页调整默认阅读模式与自定义背景，也可通过侧栏「恢复初始内容」还原默认状态。' }
    ];
    try {
      var raw = localStorage.getItem(MSG_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.messages)) {
          var migrated = false;
          parsed.messages = parsed.messages.map(function (m) {
            if (!m || typeof m !== 'object') return m;
            if (!m.time_str) m.time_str = m.created_at || nowTimestamp();
            m.is_server = Boolean(m.is_server);
            if (m.is_server && typeof m.content === 'string') {
              if (m.content.indexOf('纯前端静态预览模式') !== -1) {
                m.sender = defaultMsgs[0].sender;
                m.content = defaultMsgs[0].content;
                migrated = true;
              } else if (m.content.indexOf('虚拟目录') !== -1) {
                m.sender = defaultMsgs[1].sender;
                m.content = defaultMsgs[1].content;
                migrated = true;
              }
            }
            return m;
          });
          if (migrated) saveMessages(parsed);
          return parsed;
        }
      }
    } catch (e) {
      /* seed below */
    }
    var ts = nowTimestamp();
    var seeded = {
      nextId: 3,
      messages: [
        { id: 1, sender: defaultMsgs[0].sender, content: defaultMsgs[0].content, time_str: ts, is_server: true },
        { id: 2, sender: defaultMsgs[1].sender, content: defaultMsgs[1].content, time_str: ts, is_server: true }
      ]
    };
    localStorage.setItem(MSG_KEY, JSON.stringify(seeded));
    return seeded;
  }

  function saveMessages(data) {
    localStorage.setItem(MSG_KEY, JSON.stringify(data));
  }

  /* ---- Sync Helpers ---- */
  function loadSyncStore() {
    try {
      var raw = localStorage.getItem(SYNC_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && parsed.scopes) return parsed;
      }
    } catch (e) {
      /* seed below */
    }
    var seeded = {
      version: 1,
      server_id: 'jmv-mock-preview',
      revision: 1,
      config_revision: 1,
      enabled: true,
      scopes: cloneJson(DEFAULT_SCOPES),
      entries: {}
    };
    localStorage.setItem(SYNC_KEY, JSON.stringify(seeded));
    return seeded;
  }

  function saveSyncStore(store) {
    localStorage.setItem(SYNC_KEY, JSON.stringify(store));
  }

  /* ---- HTTP Request Routing ---- */
  function jsonResponse(payload, status) {
    return new Response(JSON.stringify(payload), {
      status: status || 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }

  function parseRequestBody(body, headers) {
    if (!body) return Promise.resolve({ type: 'empty', data: {} });
    if (body instanceof FormData) return Promise.resolve({ type: 'formdata', data: body });
    if (body instanceof URLSearchParams) {
      var obj = {};
      body.forEach(function (v, k) {
        if (Object.prototype.hasOwnProperty.call(obj, k)) {
          obj[k] = Array.isArray(obj[k]) ? obj[k].concat(v) : [obj[k], v];
        } else {
          obj[k] = v;
        }
      });
      return Promise.resolve({ type: 'form', data: obj });
    }
    var textPromise = typeof body === 'string'
      ? Promise.resolve(body)
      : body instanceof Blob
        ? body.text()
        : Promise.resolve(String(body));
    return textPromise.then(function (raw) {
      var ctype = '';
      if (headers && typeof headers.get === 'function') ctype = headers.get('Content-Type') || '';
      else if (headers && typeof headers === 'object') ctype = headers['Content-Type'] || headers['content-type'] || '';
      var trimmed = raw.trim();
      if (ctype.indexOf('json') !== -1 || trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          return { type: 'json', data: trimmed ? JSON.parse(trimmed) : {} };
        } catch (e) {
          /* fall through to form parse */
        }
      }
      var params = new URLSearchParams(raw);
      var map = {};
      params.forEach(function (v, k) {
        if (Object.prototype.hasOwnProperty.call(map, k)) {
          map[k] = Array.isArray(map[k]) ? map[k].concat(v) : [map[k], v];
        } else {
          map[k] = v;
        }
      });
      return { type: 'form', data: map };
    });
  }

  function isMockPathname(pathname) {
    return pathname === '/upload_file' ||
      pathname === '/__jmv_blob__' ||
      pathname.endsWith('/__jmv_blob__') ||
      pathname === '/__jmv_missing__' ||
      pathname.endsWith('/__jmv_missing__') ||
      pathname.indexOf('/api/') === 0 ||
      pathname.indexOf('/works/jm-view-server/api/') !== -1 ||
      pathname.indexOf('/open/') === 0 ||
      pathname === '/view_file' ||
      pathname === '/login' ||
      pathname === '/logout';
  }

  function canonicalApiPath(pathname) {
    var marker = '/works/jm-view-server/';
    var idx = pathname.indexOf(marker);
    if (idx >= 0) return '/' + pathname.slice(idx + marker.length);
    if (pathname.endsWith('/__jmv_blob__')) return '/__jmv_blob__';
    if (pathname.endsWith('/__jmv_missing__')) return '/__jmv_missing__';
    return pathname;
  }

  function handleBlobFetch(url) {
    var id = url.searchParams.get('id') || '';
    if (!id) return Promise.resolve(new Response('', { status: 404 }));
    return getBlobRecord(id).then(function (rec) {
      if (!rec || !rec.blob) return new Response('', { status: 404 });
      var blob = rec.blob;
      var mime = rec.mime || blob.type || 'image/webp';
      var stream = typeof blob.stream === 'function'
        ? blob.stream()
        : new ReadableStream({
            start: function (controller) {
              blob.arrayBuffer().then(function (buf) {
                controller.enqueue(new Uint8Array(buf));
                controller.close();
              }, function (err) {
                controller.error(err);
              });
            }
          });
      return new Response(stream, {
        status: 200,
        headers: {
          'Content-Type': mime,
          'Content-Length': String(blob.size)
        }
      });
    }).catch(function () {
      return new Response('', { status: 404 });
    });
  }

  function handleFavoritesCopy(bodyData) {
    var destination = normalizePath(bodyData.destination || '/works');
    var mode = bodyData.mode || 'copy';
    var vfs = loadVfs();
    if (!ensureDirPath(vfs, destination)) {
      return jsonResponse({ status: 'error', error: '目标路径是已存在的文件，无法作为导出目录' }, 400);
    }
    var favs = loadFavorites();
    var total = favs.images.length;
    var copied = 0;
    var moved = 0;
    var renamed = 0;
    var skipped = 0;
    var failed = 0;
    var issues = [];
    var remaining = [];
    var clearedPaths = [];
    var ts = nowTimestamp();

    favs.images.forEach(function (item) {
      var srcPath = normalizePath(item.path);
      var srcNode = vfs.nodes[srcPath];
      if (!srcNode || srcNode.type !== 'file') {
        failed++;
        issues.push({ path: srcPath, error: '源文件不存在' });
        remaining.push(item);
        return;
      }
      var desiredName = srcNode.name;
      var directDest = joinPath(destination, desiredName);
      if (directDest === srcPath) {
        skipped++;
        if (mode === 'copy_clear') clearedPaths.push(srcPath);
        else remaining.push(item);
        return;
      }
      var finalName = uniqueNameInDir(vfs, destination, desiredName);
      if (finalName !== desiredName) renamed++;
      var finalPath = joinPath(destination, finalName);

      if (mode === 'move') {
        delete vfs.nodes[srcPath];
        srcNode.name = finalName;
        srcNode.mtime = ts;
        vfs.nodes[finalPath] = srcNode;
        moved++;
        clearedPaths.push(srcPath);
      } else {
        vfs.nodes[finalPath] = {
          type: 'file',
          name: finalName,
          size: srcNode.size,
          ctime: ts,
          mtime: ts,
          sitePath: srcNode.sitePath || '',
          blobId: srcNode.blobId || '',
          mime: srcNode.mime || ''
        };
        copied++;
        if (mode === 'copy_clear') clearedPaths.push(srcPath);
        else remaining.push(item);
      }
    });

    saveVfs(vfs);
    var cleared = 0;
    if (mode === 'copy_clear' || mode === 'move') {
      cleared = clearedPaths.length;
      saveFavorites({ images: mode === 'copy_clear' ? remaining : remaining });
    }
    return jsonResponse({
      status: 'ok',
      destination: destination,
      mode: mode,
      total: total,
      copied: copied,
      moved: moved,
      renamed: renamed,
      skipped: skipped,
      failed: failed,
      issues: issues,
      cleared: cleared,
      cleared_paths: clearedPaths,
      clear_error: null
    }, 200);
  }

  function handleSyncConfig(method, parsedBody) {
    var store = loadSyncStore();
    if (method === 'GET') {
      return jsonResponse({
        version: store.version,
        server_id: store.server_id,
        revision: store.config_revision,
        enabled: Boolean(store.enabled),
        scopes: cloneJson(store.scopes),
        editable: true
      }, 200);
    }
    if (method === 'PUT') {
      var data = parsedBody.data || {};
      if (typeof data.enabled === 'boolean') store.enabled = data.enabled;
      if (data.scopes && typeof data.scopes === 'object') {
        Object.keys(DEFAULT_SCOPES).forEach(function (key) {
          if (typeof data.scopes[key] === 'boolean') store.scopes[key] = data.scopes[key];
        });
      }
      store.config_revision = (Number(store.config_revision) || 0) + 1;
      saveSyncStore(store);
      return jsonResponse({
        version: store.version,
        server_id: store.server_id,
        revision: store.config_revision,
        enabled: Boolean(store.enabled),
        scopes: cloneJson(store.scopes),
        editable: true
      }, 200);
    }
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  function handleSyncState(method, parsedBody) {
    var store = loadSyncStore();
    if (method === 'GET') {
      return jsonResponse({
        version: store.version,
        revision: store.revision,
        enabled: Boolean(store.enabled),
        scopes: cloneJson(store.scopes),
        entries: cloneJson(store.entries || {})
      }, 200);
    }
    if (method === 'POST') {
      var payload = parsedBody.data || {};
      var changes = Array.isArray(payload.changes) ? payload.changes : [];
      var conflicts = [];
      changes.forEach(function (chg) {
        if (!chg || !chg.key) return;
        var existing = store.entries[chg.key];
        var existingRev = existing ? Number(existing.revision) || 0 : 0;
        var baseRev = chg.base_revision == null ? existingRev : Number(chg.base_revision) || 0;
        if (existing && baseRev < existingRev) {
          conflicts.push({ key: chg.key, current: existing });
          return;
        }
        var nextRev = (Number(store.revision) || 0) + 1;
        store.revision = nextRev;
        if (chg.value === null) {
          delete store.entries[chg.key];
        } else {
          store.entries[chg.key] = { value: chg.value, revision: nextRev };
        }
      });
      saveSyncStore(store);
      if (conflicts.length) {
        return jsonResponse({
          error: 'Sync conflict',
          conflicts: conflicts,
          revision: store.revision,
          entries: cloneJson(store.entries)
        }, 409);
      }
      return jsonResponse({
        version: store.version,
        revision: store.revision,
        enabled: Boolean(store.enabled),
        scopes: cloneJson(store.scopes),
        entries: cloneJson(store.entries)
      }, 200);
    }
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  function handleUploadFiles(formData) {
    var rawDir = formData.get('path') || '/works';
    var vfs = loadVfs();
    var targetDir = resolveExistingDir(vfs, rawDir);
    var files = formData.getAll('file').filter(function (item) {
      return item && typeof item.arrayBuffer === 'function' && item.name;
    });
    if (!files.length) {
      return Promise.resolve(jsonResponse({ status: 'error', error: '未选择上传文件' }, 400));
    }
    var ts = nowTimestamp();
    var targetPaths = [];
    var filenames = [];
    var tasks = files.map(function (file) {
      var finalName = uniqueNameInDir(vfs, targetDir, baseName('/' + file.name) || file.name);
      var targetPath = joinPath(targetDir, finalName);
      var blobId = 'up-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
      var mime = file.type || guessMime(finalName);
      return putBlobRecord(blobId, file, { mime: mime, name: finalName }).then(function () {
        vfs.nodes[targetPath] = {
          type: 'file',
          name: finalName,
          size: Number(file.size) || 0,
          ctime: ts,
          mtime: ts,
          blobId: blobId,
          mime: mime
        };
        targetPaths.push(targetPath);
        filenames.push(finalName);
      });
    });
    return Promise.all(tasks).then(function () {
      saveVfs(vfs);
      return jsonResponse({
        status: 'ok',
        target_path: targetPaths[0] || '',
        target_paths: targetPaths,
        target_dir: targetDir,
        filenames: filenames,
        uploaded_count: targetPaths.length
      }, 200);
    });
  }

  function handleUploadBg(formData) {
    var picked = null;
    formData.forEach(function (val) {
      if (!picked && val && typeof val.arrayBuffer === 'function') picked = val;
    });
    if (!picked) {
      return Promise.resolve(jsonResponse({ status: 'error', error: '未选择背景图片' }, 400));
    }
    var mime = picked.type || guessMime(picked.name, 'image/webp');
    return putBlobRecord('custom-bg', picked, { mime: mime, name: picked.name || 'bg' }).then(function () {
      localStorage.setItem(BG_ID_KEY, 'custom-bg');
      return jsonResponse({ status: 'ok', url: '/api/background?t=' + Date.now() }, 200);
    });
  }

  function dispatchMockRequest(urlStr, init, originalFetch) {
    var url = new URL(urlStr, window.location.href);
    var path = canonicalApiPath(url.pathname);
    var method = String((init && init.method) || 'GET').toUpperCase();

    if (path === '/__jmv_blob__') return handleBlobFetch(url);
    if (path === '/__jmv_missing__') return Promise.resolve(new Response('', { status: 404 }));

    if (path === '/api/info' && method === 'GET') {
      return Promise.resolve(jsonResponse({ status: 'ok', version: '0.3.9', preview: true }, 200));
    }

    if (path === '/api/background' && method === 'GET') {
      var bgId = localStorage.getItem(BG_ID_KEY) || '';
      if (!bgId) return Promise.resolve(new Response('', { status: 404 }));
      return getBlobRecord(bgId).then(function (rec) {
        if (!rec || !rec.blob) return new Response('', { status: 404 });
        return new Response(rec.blob, {
          status: 200,
          headers: { 'Content-Type': rec.mime || rec.blob.type || 'image/webp' }
        });
      });
    }

    if (path === '/api/list_files' && method === 'GET') {
      var listing = listDirectory(url.searchParams.get('path'), false);
      return Promise.resolve(jsonResponse(listing, 200));
    }

    if (path === '/api/jm_images' && method === 'GET') {
      return Promise.resolve(jsonResponse(getAlbumPayload(url.searchParams.get('path'), { favorites: url.searchParams.get('favorites') === '1' }), 200));
    }

    if (path === '/api/download_zip' && method === 'GET') {
      return buildZipResponse(url.searchParams.get('path'), originalFetch);
    }

    if (path.indexOf('/open/') === 0) {
      return Promise.resolve(jsonResponse({
        status: 'error',
        error: '仅支持在服务器本机打开系统文件管理器'
      }, 400));
    }

    if (path === '/view_file') {
      var reqPath = normalizePath(safeDecode(url.searchParams.get('path') || ''));
      var vfs = loadVfs();
      var node = vfs.nodes[reqPath];
      if (!node || node.type !== 'file') return Promise.resolve(new Response('', { status: 404 }));
      if (node.blobId) {
        return handleBlobFetch(new URL('/__jmv_blob__?id=' + encodeURIComponent(node.blobId), window.location.origin));
      }
      return originalFetch('../../' + String(node.sitePath).replace(/^\/+/, ''));
    }

    return parseRequestBody(init && init.body, init && init.headers).then(function (parsed) {
      if (path === '/upload_file' && method === 'POST') {
        if (parsed.type !== 'formdata') return jsonResponse({ status: 'error', error: 'Invalid upload body' }, 400);
        return handleUploadFiles(parsed.data);
      }
      if (path === '/api/upload_bg' && method === 'POST') {
        if (parsed.type !== 'formdata') return jsonResponse({ status: 'error', error: 'Invalid upload body' }, 400);
        return handleUploadBg(parsed.data);
      }
      if (path === '/api/background/clear' && (method === 'POST' || method === 'DELETE')) {
        localStorage.removeItem(BG_ID_KEY);
        return deleteBlobRecord('custom-bg').then(function () {
          return jsonResponse({ status: 'ok' }, 200);
        });
      }
      if (path === '/api/mkdir' && method === 'POST') {
        var rMkdir = mutateMkdir(parsed.data.path || parsed.data.parent, parsed.data.name);
        return jsonResponse(rMkdir.body, rMkdir.code);
      }
      if (path === '/api/rename' && method === 'POST') {
        var rRen = mutateRename(parsed.data.path || parsed.data.old_path, parsed.data.new_name || parsed.data.name);
        return jsonResponse(rRen.body, rRen.code);
      }
      if (path === '/api/move' && method === 'POST') {
        var rMove = mutateMove(
          parsed.data.src || parsed.data.path || parsed.data.src_path,
          parsed.data.dst_dir || parsed.data.target_dir || parsed.data.target || parsed.data.dest
        );
        return jsonResponse(rMove.body, rMove.code);
      }
      if (path === '/api/delete' && method === 'POST') {
        var rDel = mutateDelete(parsed.data.path);
        return jsonResponse(rDel.body, rDel.code);
      }
      if (path === '/api/batch_delete' && method === 'POST') {
        var rawPaths = parsed.data.paths || parsed.data['paths[]'] || [];
        var paths = typeof rawPaths === 'string'
          ? rawPaths.split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean)
          : Array.isArray(rawPaths) ? rawPaths : [rawPaths];
        var rBatch = mutateBatchDelete(paths);
        return jsonResponse(rBatch.body, rBatch.code);
      }
      if (path === '/api/favorites') {
        var favs = loadFavorites();
        if (method === 'GET') {
          return jsonResponse({ status: 'ok', images: favs.images }, 200);
        }
        if (method === 'PUT') {
          var addPath = normalizePath(parsed.data.path || '');
          if (addPath && addPath !== '/' && !favs.images.some(function (i) { return normalizePath(i.path) === addPath; })) {
            favs.images.unshift({ path: addPath, created_at: Math.floor(Date.now() / 1000) });
            saveFavorites(favs);
          }
          return jsonResponse({ status: 'ok', favorite: true }, 200);
        }
        if (method === 'DELETE') {
          if (parsed.data && parsed.data.path) {
            var rmPath = normalizePath(parsed.data.path);
            favs.images = favs.images.filter(function (i) { return normalizePath(i.path) !== rmPath; });
            saveFavorites(favs);
            return jsonResponse({ status: 'ok', favorite: false }, 200);
          }
          var clearedCount = favs.images.length;
          saveFavorites({ images: [] });
          return jsonResponse({ status: 'ok', cleared: clearedCount }, 200);
        }
      }
      if (path === '/api/favorites/copy' && method === 'POST') {
        return handleFavoritesCopy(parsed.data || {});
      }
      if (path === '/api/messages') {
        var msgStore = loadMessages();
        if (method === 'GET') {
          var sinceId = Number(url.searchParams.get('since_id')) || 0;
          var limit = Number(url.searchParams.get('limit')) || 0;
          var activeIds = msgStore.messages.map(function (m) { return Number(m.id); });
          var filtered = msgStore.messages.filter(function (m) { return Number(m.id) > sinceId; });
          if (limit > 0 && filtered.length > limit) filtered = filtered.slice(-limit);
          return jsonResponse({ status: 'ok', messages: filtered, active_ids: activeIds }, 200);
        }
        if (method === 'POST') {
          var content = String(parsed.data.content || '').trim();
          var sender = String(parsed.data.sender || '访客').trim() || '访客';
          if (!content) return jsonResponse({ status: 'error', error: '消息内容不能为空' }, 400);
          var entry = {
            id: msgStore.nextId++,
            sender: sender,
            content: content,
            time_str: nowTimestamp(),
            is_server: false
          };
          msgStore.messages.push(entry);
          saveMessages(msgStore);
          return jsonResponse({ status: 'ok', message: entry }, 200);
        }
        if (method === 'DELETE') {
          var idParam = url.searchParams.get('id') || (parsed.data && parsed.data.id);
          if (idParam) {
            msgStore.messages = msgStore.messages.filter(function (m) { return String(m.id) !== String(idParam); });
          } else {
            msgStore.messages = [];
          }
          saveMessages(msgStore);
          return jsonResponse({ status: 'ok' }, 200);
        }
      }
      if (path === '/api/sync/config') return handleSyncConfig(method, parsed);
      if (path === '/api/sync/state') return handleSyncState(method, parsed);

      return jsonResponse({ status: 'error', error: 'Unhandled mock endpoint: ' + path }, 404);
    });
  }

  /* ---- Wrap window.fetch & XMLHttpRequest ---- */
  var originalFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    var reqUrl = typeof input === 'string' ? input : (input && input.url ? input.url : '');
    var mergedInit = init || {};
    if (input instanceof Request) {
      mergedInit = {
        method: mergedInit.method || input.method,
        headers: mergedInit.headers || input.headers,
        body: mergedInit.body !== undefined ? mergedInit.body : input.body,
        signal: mergedInit.signal || input.signal
      };
    }
    try {
      var resolved = new URL(reqUrl, window.location.href);
      if (resolved.origin === window.location.origin && isMockPathname(resolved.pathname)) {
        return dispatchMockRequest(resolved.href, mergedInit, originalFetch);
      }
      if (resolved.origin === window.location.origin && !isMockPathname(resolved.pathname) && isImageName(resolved.pathname)) {
        var cleanAssetUrl = resolved.origin + resolved.pathname;
        return originalFetch(cleanAssetUrl, mergedInit).then(function (resp) {
          var ct = (resp.headers.get('Content-Type') || '').toLowerCase();
          if (resp.ok && (!ct || ct.indexOf('application/octet-stream') !== -1)) {
            var fixedHeaders = new Headers(resp.headers);
            fixedHeaders.set('Content-Type', guessMime(resolved.pathname, 'image/webp'));
            return new Response(resp.body, {
              status: resp.status,
              statusText: resp.statusText,
              headers: fixedHeaders
            });
          }
          return resp;
        });
      }
    } catch (e) {
      /* ignore non-URL strings and fall back to originalFetch */
    }
    return originalFetch(input, init);
  };

  var OriginalXHR = window.XMLHttpRequest;
  function createUploadEmitter() {
    var listeners = {};
    return {
      onprogress: null,
      addEventListener: function (type, fn) {
        if (!listeners[type]) listeners[type] = [];
        listeners[type].push(fn);
      },
      removeEventListener: function (type, fn) {
        if (!listeners[type]) return;
        listeners[type] = listeners[type].filter(function (f) { return f !== fn; });
      },
      emitProgress: function (loaded, total) {
        var evt = { lengthComputable: true, loaded: loaded, total: total };
        if (typeof this.onprogress === 'function') this.onprogress(evt);
        (listeners.progress || []).forEach(function (fn) { fn(evt); });
      }
    };
  }

  window.XMLHttpRequest = function MockAwareXHR() {
    var self = this;
    var real = null;
    var listeners = {};
    var headers = {};
    var reqMethod = 'GET';
    var reqUrl = '';
    var mocked = false;

    self.readyState = 0;
    self.status = 0;
    self.statusText = '';
    self.responseText = '';
    self.response = '';
    self.responseType = '';
    self.onreadystatechange = null;
    self.onload = null;
    self.onerror = null;
    self.upload = createUploadEmitter();

    function fire(type, arg) {
      var evt = Object.assign(
        { type: type, target: self, currentTarget: self },
        arg && typeof arg === 'object' ? arg : {}
      );
      var prop = self['on' + type];
      if (typeof prop === 'function') prop.call(self, evt);
      (listeners[type] || []).forEach(function (fn) { fn.call(self, evt); });
    }

    self.addEventListener = function (type, fn) {
      if (real) { real.addEventListener(type, fn); return; }
      if (!listeners[type]) listeners[type] = [];
      listeners[type].push(fn);
    };
    self.removeEventListener = function (type, fn) {
      if (real) { real.removeEventListener(type, fn); return; }
      if (!listeners[type]) return;
      listeners[type] = listeners[type].filter(function (f) { return f !== fn; });
    };
    self.open = function (method, url, asyncFlag) {
      reqMethod = String(method || 'GET').toUpperCase();
      reqUrl = String(url || '');
      try {
        var parsed = new URL(reqUrl, window.location.href);
        mocked = parsed.origin === window.location.origin && isMockPathname(parsed.pathname);
      } catch (e) {
        mocked = false;
      }
      if (!mocked) {
        real = new OriginalXHR();
        real.open(method, url, asyncFlag !== false);
        return;
      }
      self.readyState = 1;
    };
    self.setRequestHeader = function (k, v) {
      if (real) { real.setRequestHeader(k, v); return; }
      headers[k] = v;
    };
    self.getResponseHeader = function (k) {
      if (real) return real.getResponseHeader(k);
      return String(k || '').toLowerCase() === 'content-type' ? 'application/json; charset=utf-8' : null;
    };
    self.getAllResponseHeaders = function () {
      return real ? real.getAllResponseHeaders() : 'content-type: application/json; charset=utf-8\r\n';
    };
    self.abort = function () {
      if (real) real.abort();
    };
    self.send = function (body) {
      if (real) {
        real.responseType = self.responseType;
        real.onreadystatechange = self.onreadystatechange;
        real.onload = self.onload;
        real.onerror = self.onerror;
        real.send(body);
        return;
      }
      if (body instanceof FormData) self.upload.emitProgress(50, 100);
      dispatchMockRequest(reqUrl, { method: reqMethod, headers: headers, body: body }, originalFetch)
        .then(function (resp) {
          return resp.text().then(function (text) {
            if (body instanceof FormData) self.upload.emitProgress(100, 100);
            self.readyState = 4;
            self.status = resp.status;
            self.statusText = resp.statusText || (resp.ok ? 'OK' : 'Error');
            self.responseText = text;
            if (self.responseType === 'json') {
              try { self.response = JSON.parse(text); } catch (e) { self.response = null; }
            } else {
              self.response = text;
            }
            fire('readystatechange');
            fire('load');
          });
        })
        .catch(function (err) {
          self.readyState = 4;
          self.status = 500;
          self.responseText = JSON.stringify({ status: 'error', error: String(err && err.message || err) });
          fire('readystatechange');
          fire('error', err);
        });
    };
  };

  /* ---- Public Mock Helper API ---- */
  function resolveBackgroundUrl(rawUrl) {
    var text = String(rawUrl || '');
    if (!text) return Promise.resolve('');
    if (text.indexOf('/api/background') === -1) return Promise.resolve(text);
    var bgId = localStorage.getItem(BG_ID_KEY) || '';
    if (!bgId) return Promise.resolve('');
    return getBlobObjectUrl(bgId);
  }

  function clearAllBlobs() {
    syncBlobUrlMap.clear();
    blobUrlCache.clear();
    return openDb().then(function (db) {
      return new Promise(function (resolve) {
        var tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).clear();
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { resolve(); };
      });
    }).catch(function () {});
  }

  function resetDemo() {
    [
      VFS_KEY, FAV_KEY, MSG_KEY, SYNC_KEY, AUTH_KEY, BG_ID_KEY,
      'plugin_jm_bookmarks', 'jmv_folder_sort_prefs', 'jmv_recent_paths'
    ].forEach(function (k) {
      try { localStorage.removeItem(k); } catch (e) {}
    });
    try {
      var prefsRaw = localStorage.getItem('jmv_prefs');
      if (prefsRaw) {
        var prefs = JSON.parse(prefsRaw);
        if (prefs && typeof prefs === 'object') {
          delete prefs.bgUrl;
          delete prefs.bg_url;
          localStorage.setItem('jmv_prefs', JSON.stringify(prefs));
        }
      }
    } catch (e) {}
    clearAllBlobs().then(function () {
      window.location.href = './index.html?path=%2Fworks';
    });
  }

  var readyPromise = preloadAllBlobs().then(function () {
    hydrateBlobMedia(document);
  });
  startBlobObserver();

  window.JmvMock = {
    AUTH_KEY: AUTH_KEY,
    PLACEHOLDER_GIF: PLACEHOLDER_GIF,
    ready: readyPromise,
    normalizePath: normalizePath,
    parentPath: parentPath,
    baseName: baseName,
    joinPath: joinPath,
    formatBytes: formatBytes,
    isImageName: isImageName,
    loadVfs: loadVfs,
    listDirectory: listDirectory,
    getAlbumPayload: getAlbumPayload,
    loadFavorites: loadFavorites,
    buildThumbUrl: buildThumbUrl,
    buildOriginalUrl: buildOriginalUrl,
    resolveBackgroundUrl: resolveBackgroundUrl,
    hydrateBlobMedia: hydrateBlobMedia,
    resetDemo: resetDemo
  };
})();
