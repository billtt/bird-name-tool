(() => {
    const SUPPORTED_EXTS = ['jpg', 'jpeg', 'mp4', 'mov'];
    const BIRD_NAMES_API = '/api/bird-names';
    const PINYIN_BOUNDARIES = [
        ['A', '阿'], ['B', '芭'], ['C', '擦'], ['D', '搭'], ['E', '蛾'],
        ['F', '发'], ['G', '噶'], ['H', '哈'], ['J', '击'], ['K', '喀'],
        ['L', '垃'], ['M', '妈'], ['N', '拿'], ['O', '哦'], ['P', '啪'],
        ['Q', '期'], ['R', '然'], ['S', '撒'], ['T', '塌'], ['W', '挖'],
        ['X', '昔'], ['Y', '压'], ['Z', '匝'],
    ];
    const zhCollator = new Intl.Collator('zh-Hans-CN');

    function pinyinInitial(s) {
        if (!s) return '#';
        const ch = s[0];
        if (/[a-zA-Z]/.test(ch)) return ch.toUpperCase();
        if (/[0-9]/.test(ch)) return '#';
        let result = '#';
        for (const [letter, boundary] of PINYIN_BOUNDARIES) {
            if (zhCollator.compare(ch, boundary) >= 0) result = letter;
            else break;
        }
        return result;
    }

    const state = {
        directoryHandle: null,
        files: [],
        birdNames: [],
        selectedFileIndex: -1,
        previewUrl: null,
        contextTargetIndex: -1,
    };

    const els = {
        chooseFolderBtn: document.getElementById('chooseFolderBtn'),
        folderPath: document.getElementById('folderPath'),
        unsupportedHint: document.getElementById('unsupportedHint'),
        fileList: document.getElementById('fileList'),
        birdList: document.getElementById('birdList'),
        birdInput: document.getElementById('birdInput'),
        addBirdForm: document.getElementById('addBirdForm'),
        previewContainer: document.getElementById('previewContainer'),
        confirmRenameBtn: document.getElementById('confirmRenameBtn'),
        contextMenu: document.getElementById('contextMenu'),
    };

    function sortBirdNames() {
        state.birdNames.sort((a, b) => zhCollator.compare(a, b));
    }

    async function loadBirdNames() {
        try {
            const res = await fetch(BIRD_NAMES_API);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            if (Array.isArray(data)) state.birdNames = data;
            sortBirdNames();
        } catch (e) {
            console.error('加载鸟名失败:', e);
            alert('加载鸟名失败，请确认服务器已启动 (node server.js)');
        }
    }

    async function saveBirdNames() {
        try {
            const res = await fetch(BIRD_NAMES_API, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(state.birdNames),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
        } catch (e) {
            console.error('保存鸟名失败:', e);
            alert('保存鸟名失败: ' + e.message);
        }
    }

    function getExt(filename) {
        const i = filename.lastIndexOf('.');
        return i < 0 ? '' : filename.slice(i + 1).toLowerCase();
    }

    function isSupported(filename) {
        return SUPPORTED_EXTS.includes(getExt(filename));
    }

    function fileKind(filename) {
        const ext = getExt(filename);
        if (ext === 'jpg' || ext === 'jpeg') return 'image';
        if (ext === 'mp4' || ext === 'mov') return 'video';
        return 'other';
    }

    function computeNewName(originalName, birdName) {
        const dotIndex = originalName.lastIndexOf('.');
        const base = dotIndex < 0 ? originalName : originalName.slice(0, dotIndex);
        const ext = dotIndex < 0 ? '' : originalName.slice(dotIndex);
        const underscoreIndex = base.indexOf('_');
        const newBase = underscoreIndex < 0
            ? `${birdName}_${base}`
            : `${birdName}${base.slice(underscoreIndex)}`;
        return `${newBase}${ext}`;
    }

    async function chooseFolder() {
        if (!window.showDirectoryPicker) {
            els.unsupportedHint.hidden = false;
            return;
        }
        try {
            const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
            state.directoryHandle = handle;
            els.folderPath.textContent = handle.name;
            await loadDirectoryFiles();
        } catch (e) {
            if (e.name !== 'AbortError') {
                console.error(e);
                alert('选择文件夹失败: ' + e.message);
            }
        }
    }

    async function loadDirectoryFiles() {
        const files = [];
        for await (const entry of state.directoryHandle.values()) {
            if (entry.kind === 'file' && isSupported(entry.name)) {
                files.push({
                    handle: entry,
                    originalName: entry.name,
                    currentName: entry.name,
                    modified: false,
                });
            }
        }
        files.sort((a, b) => a.originalName.localeCompare(b.originalName));
        state.files = files;
        state.selectedFileIndex = -1;
        clearPreview();
        renderFileList();
        updateConfirmButton();
    }

    function renderFileList() {
        els.fileList.innerHTML = '';
        state.files.forEach((file, index) => {
            const li = document.createElement('li');
            li.dataset.index = String(index);
            const kind = fileKind(file.originalName);
            const typeSpan = document.createElement('span');
            typeSpan.className = 'file-type';
            typeSpan.textContent = kind === 'image' ? 'IMG' : 'VID';
            li.appendChild(typeSpan);
            li.appendChild(document.createTextNode(file.currentName));
            if (file.modified) li.classList.add('modified');
            if (index === state.selectedFileIndex) li.classList.add('selected');
            li.addEventListener('click', () => selectFile(index));
            els.fileList.appendChild(li);
        });
    }

    function renderBirdList() {
        els.birdList.innerHTML = '';
        let prevInitial = null;
        state.birdNames.forEach((name, index) => {
            const initial = pinyinInitial(name);
            const li = document.createElement('li');
            li.dataset.index = String(index);

            const initialSpan = document.createElement('span');
            initialSpan.className = 'initial';
            initialSpan.textContent = initial !== prevInitial ? initial : '';
            li.appendChild(initialSpan);

            const nameSpan = document.createElement('span');
            nameSpan.className = 'name';
            nameSpan.textContent = name;
            li.appendChild(nameSpan);

            li.addEventListener('click', () => applyBirdName(name));
            li.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                openContextMenu(e.clientX, e.clientY, index);
            });
            els.birdList.appendChild(li);
            prevInitial = initial;
        });
    }

    async function selectFile(index) {
        if (index < 0 || index >= state.files.length) return;
        state.selectedFileIndex = index;
        renderFileList();
        const li = els.fileList.querySelector(`li[data-index="${index}"]`);
        if (li) li.scrollIntoView({ block: 'nearest' });
        await showPreview(state.files[index]);
    }

    function clearPreview() {
        if (state.previewUrl) {
            URL.revokeObjectURL(state.previewUrl);
            state.previewUrl = null;
        }
        els.previewContainer.innerHTML = '<p class="placeholder">请选择左侧的图片或视频</p>';
    }

    async function showPreview(fileEntry) {
        if (state.previewUrl) {
            URL.revokeObjectURL(state.previewUrl);
            state.previewUrl = null;
        }
        els.previewContainer.innerHTML = '';
        try {
            const file = await fileEntry.handle.getFile();
            const url = URL.createObjectURL(file);
            state.previewUrl = url;
            const kind = fileKind(fileEntry.originalName);
            if (kind === 'image') {
                const img = document.createElement('img');
                img.src = url;
                img.alt = fileEntry.originalName;
                els.previewContainer.appendChild(img);
            } else if (kind === 'video') {
                const video = document.createElement('video');
                video.src = url;
                video.controls = true;
                video.autoplay = true;
                els.previewContainer.appendChild(video);
            }
        } catch (e) {
            console.error(e);
            els.previewContainer.innerHTML = '<p class="placeholder">无法预览文件</p>';
        }
    }

    function applyBirdName(birdName) {
        if (state.selectedFileIndex < 0) return;
        const file = state.files[state.selectedFileIndex];
        const newName = computeNewName(file.originalName, birdName);
        file.currentName = newName;
        file.modified = newName !== file.originalName;
        renderFileList();
        updateConfirmButton();
    }

    function updateConfirmButton() {
        const hasModified = state.files.some((f) => f.modified);
        els.confirmRenameBtn.disabled = !hasModified;
    }

    async function addBirdName(name) {
        const trimmed = name.trim();
        if (!trimmed) return;
        if (state.birdNames.includes(trimmed)) return;
        state.birdNames.push(trimmed);
        sortBirdNames();
        renderBirdList();
        await saveBirdNames();
    }

    async function editBirdName(index) {
        const current = state.birdNames[index];
        const updated = prompt('修改鸟名:', current);
        if (updated === null) return;
        const trimmed = updated.trim();
        if (!trimmed) return;
        if (state.birdNames.includes(trimmed) && trimmed !== current) {
            alert('该鸟名已存在');
            return;
        }
        state.birdNames[index] = trimmed;
        sortBirdNames();
        renderBirdList();
        await saveBirdNames();
    }

    async function deleteBirdName(index) {
        const name = state.birdNames[index];
        if (!confirm(`确定要删除 "${name}" 吗？`)) return;
        state.birdNames.splice(index, 1);
        renderBirdList();
        await saveBirdNames();
    }

    function openContextMenu(x, y, index) {
        state.contextTargetIndex = index;
        els.contextMenu.hidden = false;
        els.contextMenu.style.left = `${x}px`;
        els.contextMenu.style.top = `${y}px`;
    }

    function closeContextMenu() {
        els.contextMenu.hidden = true;
        state.contextTargetIndex = -1;
    }

    async function confirmRename() {
        const modifiedFiles = state.files.filter((f) => f.modified);
        if (modifiedFiles.length === 0) return;
        if (!confirm(`将重命名 ${modifiedFiles.length} 个文件，是否继续？`)) return;

        const errors = [];
        for (const file of modifiedFiles) {
            try {
                if (typeof file.handle.move === 'function') {
                    await file.handle.move(file.currentName);
                } else {
                    await fallbackRename(file);
                }
                file.originalName = file.currentName;
                file.modified = false;
            } catch (e) {
                console.error(e);
                errors.push(`${file.originalName}: ${e.message}`);
            }
        }
        renderFileList();
        updateConfirmButton();
        if (errors.length > 0) {
            alert('部分文件重命名失败:\n' + errors.join('\n'));
        } else {
            alert('全部重命名完成');
        }
    }

    async function fallbackRename(fileEntry) {
        const original = await fileEntry.handle.getFile();
        const newHandle = await state.directoryHandle.getFileHandle(fileEntry.currentName, { create: true });
        const writable = await newHandle.createWritable();
        await writable.write(original);
        await writable.close();
        await state.directoryHandle.removeEntry(fileEntry.originalName);
        fileEntry.handle = newHandle;
    }

    function onKeyDown(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (state.files.length === 0) return;
            const next = Math.min(state.selectedFileIndex + 1, state.files.length - 1);
            if (next !== state.selectedFileIndex) selectFile(next);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (state.files.length === 0) return;
            const prev = Math.max(state.selectedFileIndex - 1, 0);
            if (prev !== state.selectedFileIndex) selectFile(prev);
        }
    }

    async function init() {
        if (!window.showDirectoryPicker) {
            els.unsupportedHint.hidden = false;
            els.chooseFolderBtn.disabled = true;
        }
        await loadBirdNames();
        renderBirdList();

        els.chooseFolderBtn.addEventListener('click', chooseFolder);
        els.confirmRenameBtn.addEventListener('click', confirmRename);

        els.addBirdForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const value = els.birdInput.value;
            addBirdName(value);
            els.birdInput.value = '';
        });

        els.contextMenu.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            const index = state.contextTargetIndex;
            closeContextMenu();
            if (index < 0) return;
            if (action === 'edit') editBirdName(index);
            else if (action === 'delete') deleteBirdName(index);
        });

        document.addEventListener('click', (e) => {
            if (!els.contextMenu.hidden && !els.contextMenu.contains(e.target)) {
                closeContextMenu();
            }
        });

        document.addEventListener('keydown', onKeyDown);
        window.addEventListener('beforeunload', () => {
            if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
        });
    }

    init();
})();
