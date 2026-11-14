/* --- Sorting Logic (支持单文件夹维度记忆，默认修改时间倒序) --- */
const FOLDER_SORT_KEY = 'jmv_folder_sort_prefs';
let currentSort = { column: 'date', direction: 'desc' };

function parseSize(sizeStr) {
    sizeStr = (sizeStr || '').trim();
    if (sizeStr === '<DIR>') return -1;
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const parts = sizeStr.split(' ');
    if (parts.length < 2) return 0;
    const val = parseFloat(parts[0]);
    const unit = parts[1].toUpperCase();
    const power = units.indexOf(unit);
    return power > -1 ? val * Math.pow(1024, power) : 0;
}

function getNormalizedFolderKey(path) {
    if (!path) return '';
    return path.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
}

function getFolderSortPreference(path) {
    const key = getNormalizedFolderKey(path);
    if (!key) return null;
    try {
        const map = JSON.parse(localStorage.getItem(FOLDER_SORT_KEY) || '{}');
        return map[key] || null;
    } catch (e) {
        return null;
    }
}

function saveFolderSortPreference(path, sortPref) {
    const key = getNormalizedFolderKey(path);
    if (!key) return;
    try {
        const map = JSON.parse(localStorage.getItem(FOLDER_SORT_KEY) || '{}');
        if (!sortPref || (sortPref.column === 'date' && sortPref.direction === 'desc')) {
            // 默认的时间倒排无需额外记录，清理以节省空间
            delete map[key];
        } else {
            map[key] = { column: sortPref.column, direction: sortPref.direction };
        }
        localStorage.setItem(FOLDER_SORT_KEY, JSON.stringify(map));
    } catch (e) {
        console.error('Failed to save folder sort preference', e);
    }
}

function applySort(col, direction, savePref) {
    currentSort.column = col;
    currentSort.direction = direction;

    // 1. 同步表头高亮图标
    document.querySelectorAll('.header-col').forEach(el => {
        el.classList.remove('asc', 'desc');
        if (el.dataset.sort === col) {
            el.classList.add(direction);
        }
    });

    const comparator = (a, b) => {
        // 文件夹始终置顶
        const isDirA = a.dataset.type === 'dir';
        const isDirB = b.dataset.type === 'dir';
        if (isDirA && !isDirB) return -1;
        if (!isDirA && isDirB) return 1;

        if (col === 'name') {
            const nameA = (a.querySelector('.file-name-col') || a.querySelector('.name') || {}).innerText || '';
            const nameB = (b.querySelector('.file-name-col') || b.querySelector('.name') || {}).innerText || '';
            const cmp = nameA.trim().localeCompare(nameB.trim(), undefined, { numeric: true, sensitivity: 'base' });
            return direction === 'asc' ? cmp : -cmp;
        }

        let valA = 0, valB = 0;
        if (col === 'size') {
            const sizeElA = a.querySelector('.size-col');
            const sizeElB = b.querySelector('.size-col');
            valA = parseSize(sizeElA ? sizeElA.innerText : '');
            valB = parseSize(sizeElB ? sizeElB.innerText : '');
        } else if (col === 'date') {
            const dateElA = a.querySelector('.date-col');
            const dateElB = b.querySelector('.date-col');
            const tA = (dateElA ? dateElA.innerText.trim() : '').replace(' ', 'T');
            const tB = (dateElB ? dateElB.innerText.trim() : '').replace(' ', 'T');
            valA = new Date(tA).getTime();
            valB = new Date(tB).getTime();
            if (isNaN(valA)) valA = 0;
            if (isNaN(valB)) valB = 0;
        }

        if (valA < valB) return direction === 'asc' ? -1 : 1;
        if (valA > valB) return direction === 'asc' ? 1 : -1;
        return 0;
    };

    // 2. 排序列表视图
    const listBody = document.querySelector('.file-list-body');
    if (listBody) {
        const rows = Array.from(listBody.querySelectorAll('.file-item'));
        rows.sort(comparator);
        rows.forEach(row => listBody.appendChild(row));
    }

    // 3. 排序网格视图
    const gridView = document.querySelector('.grid-view');
    if (gridView) {
        const cards = Array.from(gridView.querySelectorAll('.card-item'));
        cards.sort(comparator);
        cards.forEach(card => gridView.appendChild(card));
    }

    // 4. 单文件夹偏好记忆
    if (savePref) {
        const curPath = getCurPath();
        if (curPath) {
            saveFolderSortPreference(curPath, currentSort);
        }
    }
}

function sortTable(col) {
    let newDir = 'asc';
    if (currentSort.column === col) {
        newDir = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        newDir = col === 'date' ? 'desc' : 'asc';
    }
    applySort(col, newDir, true);
}

function initFolderSort() {
    const curPath = getCurPath();
    const pref = getFolderSortPreference(curPath);
    if (pref && pref.column && pref.direction) {
        if (pref.column !== 'date' || pref.direction !== 'desc') {
            applySort(pref.column, pref.direction, false);
            return;
        }
    }
    // 默认保持修改时间倒序
    currentSort.column = 'date';
    currentSort.direction = 'desc';
}

function openJmView(filename, _fileType) {
    let curPath = getCurPath();
    const viewDir = decodeURIComponent(filename);

    const jmViewForm = document.querySelector('#jmViewForm input[type="submit"]');
    const path = document.querySelector('#jmViewForm input[name="path"]');
    const openFromDir = document.querySelector('#jmViewForm input[name="openFromDir"]');
    path.value = viewDir;
    openFromDir.value = curPath;
    jmViewForm.click();
}

function getCurPath() {
    const el = document.getElementById('currentPathText');
    if (!el) return '';
    // Prefer data-path attribute which preserves spaces/raw values
    // Fallback to innerText (though innerText collapses spaces)
    return el.getAttribute('data-path') || el.innerText.trim();
}

function goBack() {
    if (window.JmvColumnView && window.JmvColumnView.isActive()) {
        window.JmvColumnView.goBack();
        return;
    }
    let curPath = getCurPath();
    let backPath = curPath + '/..';
    console.log(`go back -> ${backPath}`);
    changeDir(backPath);
}

function changeDir(goPath) {
    const pathFormInput = document.querySelector('#pathForm input[type="text"]');
    const SubmitBtn = document.querySelector('#pathForm input[type="submit"]');
    pathFormInput.value = goPath;
    SubmitBtn.click();
}

window.addEventListener('DOMContentLoaded', function () {
    // 初始化并应用单文件夹维度的排序记忆
    initFolderSort();

    // UI Elements
    const backToTopBtn = document.getElementById('to-top');
    const driverLinks = document.querySelectorAll('.driver-pill');
    const pathFormInput = document.querySelector('#pathForm input[type="text"]');
    const resultSubmitBtn = document.querySelector('#pathForm input[type="submit"]');

    // Select directory links based on the new HTML structure
    // We look for .file-link inside items marked as folders
    const dirLinks = document.querySelectorAll('.file-item[data-type="dir"] .file-link');

    // Scroll Logic for Back-to-Top button
    window.addEventListener('scroll', function () {
        if (window.pageYOffset > 300) {
            backToTopBtn.classList.add('visible');
        } else {
            backToTopBtn.classList.remove('visible');
        }
    });

    if (backToTopBtn) {
        backToTopBtn.addEventListener('click', function () {
            window.scrollTo({
                top: 0,
                behavior: 'smooth',
            });
        });
    }

    // Driver Links
    driverLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const location = this.getAttribute('location');
            if (location) {
                pathFormInput.value = location;
                resultSubmitBtn.click();
            }
        });
    });

    // Directory Links
    function whenClickDir(e) {
        e.preventDefault();
        let goPath = this.getAttribute('path');
        if (goPath) {
            changeDir(decodeURIComponent(goPath));
        }
    }

    dirLinks.forEach(link => {
        link.addEventListener('click', whenClickDir);
    });

    // Disable "Back" button if at root (roughly determined by path length)
    const btnBack = document.getElementById('btn-back');
    if (btnBack) {
        // Windows root paths are short (e.g., C:\), Linux roots are purely slash /
        // The original logic checked length <= 3. We'll keep that heuristic.
        if (getCurPath().length <= 3) {
            btnBack.disabled = true;
            btnBack.style.opacity = '0.5';
            btnBack.style.cursor = 'not-allowed';
        }
    }

    // Preview Image Interaction (独立 fixed 浮层展示大图，避免文档流缩放改变容器尺寸引起页面抖动)
    const previewImages = document.querySelectorAll('.preview-img');
    let previewPop = document.getElementById('jmvPreviewPop');
    if (!previewPop) {
        previewPop = document.createElement('div');
        previewPop.className = 'preview-pop';
        previewPop.id = 'jmvPreviewPop';
        previewPop.setAttribute('aria-hidden', 'true');
        previewPop.innerHTML = '<img class="preview-pop-img" alt="">';
        document.body.appendChild(previewPop);
    }
    const previewPopImg = previewPop.querySelector('.preview-pop-img');
    let activePreviewImg = null;

    function showPreview(img) {
        if (window.innerWidth <= 860) return;
        const src = img.currentSrc || img.getAttribute('src') || img.dataset.thumbSrc || '';
        if (!src) return;
        if (previewPopImg.getAttribute('src') !== src) {
            previewPopImg.setAttribute('src', src);
        }
        const popW = Math.min(360, window.innerWidth - 96);
        const popH = Math.min(480, window.innerHeight - 32);
        const rect = img.getBoundingClientRect();
        const left = Math.max(12, Math.round(rect.left - popW - 10));
        const idealTop = rect.top + rect.height / 2 - popH / 2;
        const top = Math.round(Math.max(16, Math.min(window.innerHeight - popH - 16, idealTop)));
        const originY = Math.round(rect.top + rect.height / 2 - top);

        previewPop.style.left = left + 'px';
        previewPop.style.top = top + 'px';
        previewPop.style.transformOrigin = 'right ' + originY + 'px';

        if (activePreviewImg && activePreviewImg !== img) {
            activePreviewImg.classList.remove('is-previewing');
        }
        activePreviewImg = img;
        img.classList.add('is-previewing');
        previewPop.classList.add('open');
    }

    function hidePreview() {
        previewPop.classList.remove('open');
        if (activePreviewImg) {
            activePreviewImg.classList.remove('is-previewing');
            activePreviewImg = null;
        }
    }

    const contentScroller = document.querySelector('.content');
    if (contentScroller) {
        contentScroller.addEventListener('scroll', hidePreview, { passive: true });
    }
    window.addEventListener('resize', hidePreview);
    window.addEventListener('blur', hidePreview);

    previewImages.forEach(img => {
        img.addEventListener('click', function (e) {
            e.stopPropagation();

            // If already previewing, close and suppress hover until mouse leaves.
            if (activePreviewImg === this && previewPop.classList.contains('open')) {
                hidePreview();
                this.dataset.forceClose = 'true';
            } else {
                this.dataset.forceClose = 'false';
                showPreview(this);
            }
        });

        img.addEventListener('mouseenter', function () {
            if (this.dataset.forceClose !== 'true') {
                showPreview(this);
            }
        });

        img.addEventListener('mouseleave', function () {
            hidePreview();
            this.dataset.forceClose = 'false';
        });
    });
});
/* --- Bookmarks Logic --- */
const BOOKMARKS_KEY = 'plugin_jm_bookmarks';

function toggleBookmarks() {
    const backdrop = document.getElementById('bookmarks-backdrop');
    const drawer = document.getElementById('bookmarks-drawer');

    if (drawer.classList.contains('open')) {
        drawer.classList.remove('open');
        backdrop.classList.remove('open');
    } else {
        renderBookmarks();
        drawer.classList.add('open');
        backdrop.classList.add('open');
    }
}

function getBookmarks() {
    const stored = localStorage.getItem(BOOKMARKS_KEY);
    try {
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error('Failed to parse bookmarks', e);
        return [];
    }
}

function saveBookmarks(bookmarks) {
    const previous = getBookmarks();
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
    renderBookmarks();
    if (window.JmvSync) {
        const keyFor = item => 'bookmark:' + window.JmvSync.canonicalPath(item.path);
        bookmarks.forEach(item => {
            if (!previous.some(old => keyFor(old) === keyFor(item))) window.JmvSync.setRecord(keyFor(item), item);
        });
        previous.forEach(item => {
            if (!bookmarks.some(current => keyFor(current) === keyFor(item))) window.JmvSync.setRecord(keyFor(item), null);
        });
    }
}

function addCurrentBookmark() {
    const path = getCurPath();
    if (!path) return;

    const bookmarks = getBookmarks();
    // Check if already exists
    const exists = bookmarks.some(b => b.path === path);
    if (exists) {
        alert('当前目录已在收藏夹中！');
        return;
    }

    bookmarks.unshift({
        path: path,
        timestamp: new Date().toISOString()
    });

    saveBookmarks(bookmarks);

    // Suggestion: show a toast or feedback here
    const btn = document.querySelector('.bookmark-add-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = icon('check') + ' 已收藏';
    setTimeout(() => {
        btn.innerHTML = originalText;
    }, 2000);
}

function deleteBookmark(index) {
    if (!confirm('确定要删除这个收藏吗？')) return;

    const bookmarks = getBookmarks();
    bookmarks.splice(index, 1);
    saveBookmarks(bookmarks);
}

function formatTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleString();
}

function renderBookmarks() {
    const list = document.getElementById('bookmarks-list');
    const emptyState = document.getElementById('bookmarks-empty');
    const bookmarks = getBookmarks();
    if (!list || !emptyState) return;
    list.innerHTML = '';

    if (bookmarks.length === 0) {
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';

    bookmarks.forEach((b, index) => {
        const li = document.createElement('li');
        li.className = 'bookmark-item';
        const link = document.createElement('a');
        link.href = '#'; link.className = 'bookmark-link';
        link.addEventListener('click', event => { event.preventDefault(); changeDir(b.path); });
        const pathLabel = document.createElement('div');
        pathLabel.className = 'bookmark-path'; pathLabel.title = b.path; pathLabel.textContent = b.path;
        const timeLabel = document.createElement('div');
        timeLabel.className = 'bookmark-time'; timeLabel.textContent = formatTime(b.timestamp);
        link.append(pathLabel, timeLabel);
        const removeButton = document.createElement('button');
        removeButton.className = 'bookmark-delete'; removeButton.title = '删除'; removeButton.setAttribute('aria-label', '删除收藏目录');
        removeButton.innerHTML = icon('x'); removeButton.addEventListener('click', () => deleteBookmark(index));
        li.append(link, removeButton);
        list.appendChild(li);
    });
}

// Initial render check? No, only when opened.
