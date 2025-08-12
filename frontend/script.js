// Acknowledge the current URL for module import
// import translations from './translations/ar.json' assert { type: 'json' };

// ===================================================================
// Module 1: DOM Elements
// ===================================================================
const dom = {
    imageUpload: document.getElementById('image-upload'),
    imagePreviewsContainer: document.getElementById('image-previews-container'),
    translateBtn: document.getElementById('translate-btn'),
    outputGalleryContainer: document.getElementById('output-gallery-container'),
    originalTextarea: document.getElementById('original-text'),
    translatedTextarea: document.getElementById('translated-text'),
    showAllBtn: document.getElementById('show-all-btn'),
    downloadAllBtn: document.getElementById('download-all-btn'),
    dropZone: document.getElementById('drop-zone'),
    themeToggleBtn: document.getElementById('theme-toggle-btn'),
    body: document.body,
    progressBar: document.getElementById('progress-bar'),
    progressContainer: document.getElementById('progress-container'),
    messageBox: document.getElementById('message-box'),
    copyOriginalBtn: document.getElementById('copy-original-btn'),
    copyTranslatedBtn: document.getElementById('copy-translated-btn'),
    moonIcon: document.getElementById('moon-icon'),
    sunIcon: document.getElementById('sun-icon'),
    languageSelector: document.getElementById('language-selector'),
};

// ===================================================================
// Module 2: Application State
// ===================================================================
const appState = {
    imageFiles: [],
    originalTexts: [],
    translatedTexts: [],
    isTranslating: false,
    activeOutputImageIndex: -1,
    currentLanguage: 'ar',
    translations: {}
};

// ===================================================================
// Module 3: API Calls & Logic (Secure Backend Proxy)
// ===================================================================
const api = {
    backendApiUrl: 'http://localhost:3000/api/translate',
    async callGeminiAPI(file, promptText) {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('prompt', promptText);

        const response = await fetch(this.backendApiUrl, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.candidates && result.candidates[0].content && result.candidates[0].content.parts) {
            const jsonText = result.candidates[0].content.parts[0].text;
            try {
                const data = JSON.parse(jsonText);
                return {
                    original_text: data.original_text,
                    translated_text: data.translated_text
                };
            } catch (parseError) {
                console.error('Failed to parse JSON response:', jsonText, parseError);
                throw new Error('Failed to parse JSON from API.');
            }
        } else {
            throw new Error("API returned an unexpected response structure.");
        }
    }
};

// ===================================================================
// Module 4: UI Management & i18n
// ===================================================================
const ui = {
    updateActionButtons(isEnabled) { dom.translateBtn.disabled = !isEnabled; if (!isEnabled) dom.translateBtn.innerText = appState.translations.translateButtonText; },
    showMessage(message, type = 'success') { dom.messageBox.innerText = message; dom.messageBox.className = `message-box show ${type}`; setTimeout(() => dom.messageBox.classList.remove('show'), 3000); },
    renderImagePreviews(files, removeCallback, moveCallback) {
        dom.imagePreviewsContainer.innerHTML = '';
        if (files.length === 0) { dom.imagePreviewsContainer.innerHTML = `<p class="text-gray-500 dark:text-gray-400 text-sm p-4">${appState.translations.noImagesLoaded}</p>`; this.updateActionButtons(false); } else { this.updateActionButtons(true); }
        const fragment = document.createDocumentFragment();
        files.forEach((file, index) => {
            const imgContainer = document.createElement('div');
            imgContainer.className = 'relative w-20 h-20 image-preview-item';
            imgContainer.setAttribute('data-index', index);
            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            img.alt = `Preview of uploaded image ${index + 1}`;
            img.className = 'w-full h-full object-cover rounded-lg shadow-md';
            const removeBtn = document.createElement('button');
            removeBtn.className = 'absolute top-0 left-0 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold opacity-70 hover:opacity-100';
            removeBtn.innerHTML = '&times;';
            removeBtn.onclick = (e) => { e.stopPropagation(); removeCallback(index); };
            const moveLeftBtn = document.createElement('button');
            moveLeftBtn.className = 'reorder-btn left';
            moveLeftBtn.innerHTML = '<i class="fa-solid fa-arrow-left"></i>';
            moveLeftBtn.onclick = (e) => { e.stopPropagation(); moveCallback(index, index - 1); };
            const moveRightBtn = document.createElement('button');
            moveRightBtn.className = 'reorder-btn right';
            moveRightBtn.innerHTML = '<i class="fa-solid fa-arrow-right"></i>';
            moveRightBtn.onclick = (e) => { e.stopPropagation(); moveCallback(index, index + 1); };
            imgContainer.append(img, removeBtn, moveLeftBtn, moveRightBtn);
            fragment.appendChild(imgContainer);
        });
        dom.imagePreviewsContainer.appendChild(fragment);
    },
    renderOutputGallery(files) {
        dom.outputGalleryContainer.innerHTML = '';
        if (files.length === 0) { dom.outputGalleryContainer.innerHTML = `<p class="text-gray-500 dark:text-gray-400 text-sm p-4">${appState.translations.outputGalleryTitle}</p>`; return; }
        const fragment = document.createDocumentFragment();
        files.forEach((file, index) => {
            const imgContainer = document.createElement('div');
            imgContainer.className = 'output-gallery-item relative w-20 h-20 cursor-pointer rounded-lg shadow-md overflow-hidden hover:ring-2 hover:ring-blue-500';
            imgContainer.setAttribute('data-index', index);
            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            img.alt = `Translated image ${index + 1}`;
            img.className = 'w-full h-full object-cover';
            imgContainer.appendChild(img);
            fragment.appendChild(imgContainer);
        });
        dom.outputGalleryContainer.appendChild(fragment);
    },
    updateTextareas() {
        const index = appState.activeOutputImageIndex;
        if (index === -1) {
            dom.originalTextarea.value = appState.originalTexts.map((text, i) => `=== ${appState.translations.imageNumber} ${i + 1} ===\n${text}`).join('\n\n');
            dom.translatedTextarea.value = appState.translatedTexts.map((text, i) => `=== ${appState.translations.imageNumber} ${i + 1} ===\n${text}`).join('\n\n');
        } else {
            dom.originalTextarea.value = appState.originalTexts[index] || '';
            dom.translatedTextarea.value = appState.translatedTexts[index] || '';
        }
    },
    updateTranslationProgress(completed, total) {
        dom.progressBar.style.width = `${(completed / total) * 100}%`;
        dom.translateBtn.innerText = `${appState.translations.translatingStatus} (${completed}/${total})...`;
    },
    initTheme() { const theme = localStorage.getItem('theme') || 'light'; dom.body.classList.add(`${theme}-theme`); if (theme === 'dark') { dom.moonIcon.classList.add('hidden'); dom.sunIcon.classList.remove('hidden'); } },
    toggleTheme() { const isDark = dom.body.classList.toggle('dark-theme'); localStorage.setItem('theme', isDark ? 'dark' : 'light'); dom.moonIcon.classList.toggle('hidden', isDark); dom.sunIcon.classList.toggle('hidden', !isDark); },
    async loadLanguage(lang) {
        try {
            const response = await fetch(`./translations/${lang}.json`);
            appState.translations = await response.json();
            appState.currentLanguage = lang;
            this.updateUI();
        } catch (error) {
            console.error('Failed to load language file:', error);
        }
    },
    updateUI() {
        document.title = appState.translations.appTitle + ' - ' + appState.translations.uploadTitle;
        dom.body.dir = appState.currentLanguage === 'ar' ? 'rtl' : 'ltr';
        document.querySelectorAll('[data-lang]').forEach(el => {
            const key = el.getAttribute('data-lang');
            if (appState.translations[key]) {
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    el.placeholder = appState.translations[key];
                } else {
                    el.innerText = appState.translations[key];
                }
            }
        });
        this.renderImagePreviews(appState.imageFiles, fileHandler.removeFile.bind(fileHandler), fileHandler.moveFile.bind(fileHandler));
        this.renderOutputGallery(appState.imageFiles);
        this.updateTextareas();
    }
};

// ===================================================================
// Module 5: File Handling
// ===================================================================
const fileHandler = {
    async handleFiles(files) {
        const newImages = [];
        for (const file of files) {
            if (file.type === 'application/zip' || file.name.endsWith('.zip')) { await this.handleZipFile(file, newImages); }
            else if (file.type.startsWith('image/')) { newImages.push(file); }
        }
        appState.imageFiles = [...appState.imageFiles, ...newImages];
        ui.renderImagePreviews(appState.imageFiles, this.removeFile.bind(this), this.moveFile.bind(this));
    },
    async handleZipFile(zipFile, newImagesArray) {
        try {
            const zip = await JSZip.loadAsync(zipFile);
            const imageFilesFromZip = [];
            zip.forEach((relativePath, zipEntry) => {
                if (!zipEntry.dir && (relativePath.endsWith('.png') || relativePath.endsWith('.jpg') || relativePath.endsWith('.jpeg'))) {
                    imageFilesFromZip.push(zipEntry);
                }
            });
            imageFilesFromZip.sort((a, b) => a.name.localeCompare(b.name));
            for (const entry of imageFilesFromZip) {
                const blob = await entry.async("blob");
                const file = new File([blob], entry.name, { type: blob.type });
                newImagesArray.push(file);
            }
        } catch (error) {
            ui.showMessage(`${appState.translations.zipReadError} ${error.message}`, 'error');
        }
    },
    removeFile(index) {
        appState.imageFiles.splice(index, 1);
        ui.renderImagePreviews(appState.imageFiles, this.removeFile.bind(this), this.moveFile.bind(this));
    },
    moveFile(fromIndex, toIndex) {
        if (toIndex < 0 || toIndex >= appState.imageFiles.length) return;
        const fileToMove = appState.imageFiles.splice(fromIndex, 1)[0];
        appState.imageFiles.splice(toIndex, 0, fileToMove);
        ui.renderImagePreviews(appState.imageFiles, this.removeFile.bind(this), this.moveFile.bind(this));
    }
};

// ===================================================================
// Module 6: Main Application Logic
// ===================================================================
const main = {
    init() {
        ui.initTheme();
        ui.loadLanguage(appState.currentLanguage);
        this.bindEvents();
    },
    bindEvents() {
        dom.imageUpload.addEventListener('change', (e) => fileHandler.handleFiles(e.target.files));
        dom.translateBtn.addEventListener('click', () => this.startTranslation());
        dom.showAllBtn.addEventListener('click', () => this.showAllTexts());
        dom.downloadAllBtn.addEventListener('click', () => this.downloadAllTexts());
        dom.themeToggleBtn.addEventListener('click', () => ui.toggleTheme());
        dom.languageSelector.addEventListener('change', (e) => ui.loadLanguage(e.target.value));
        dom.copyOriginalBtn.addEventListener('click', () => this.copyToClipboard(dom.originalTextarea.value));
        dom.copyTranslatedBtn.addEventListener('click', () => this.copyToClipboard(dom.translatedTextarea.value));
        dom.outputGalleryContainer.addEventListener('click', (e) => this.handleOutputGalleryClick(e));
        dom.dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dom.dropZone.classList.add('drag-over'); });
        dom.dropZone.addEventListener('dragleave', () => dom.dropZone.classList.remove('drag-over'));
        dom.dropZone.addEventListener('drop', (e) => { e.preventDefault(); dom.dropZone.classList.remove('drag-over'); fileHandler.handleFiles(e.dataTransfer.files); });
    },
    async startTranslation() {
        if (appState.isTranslating || appState.imageFiles.length === 0) return;
        appState.isTranslating = true;
        ui.updateActionButtons(false);
        dom.progressContainer.classList.remove('hidden');
        dom.translateBtn.innerHTML = `${appState.translations.translatingStatus} (0/${appState.imageFiles.length})...`;
        
        appState.originalTexts = new Array(appState.imageFiles.length).fill('');
        appState.translatedTexts = new Array(appState.imageFiles.length).fill('');
        
        const prompt = "Please act as an Optical Character Recognition (OCR) and manga translator specialized in Arabic. Identify the Japanese or Korean text in the image and provide a faithful Arabic translation. The response must be a single JSON object with two keys: `original_text` and `translated_text`. For example: { \"original_text\": \"Original Text\", \"translated_text\": \"النص الأصلي\" }. The `original_text` should contain the detected Japanese/Korean text, and the `translated_text` should contain its Arabic translation.";
        
        try {
            const translationPromises = appState.imageFiles.map((file, index) =>
                (async () => {
                    try {
                        const result = await api.callGeminiAPI(file, prompt);
                        appState.originalTexts[index] = result.original_text || '';
                        appState.translatedTexts[index] = result.translated_text || '';
                        ui.updateTranslationProgress(index + 1, appState.imageFiles.length);
                    } catch (err) {
                        console.error(`Error processing file ${file.name}:`, err);
                        appState.originalTexts[index] = appState.translations.errorProcessing;
                        appState.translatedTexts[index] = `${appState.translations.translationFailure} ${err.message}`;
                    }
                })()
            );
            await Promise.all(translationPromises);
            ui.showMessage(appState.translations.translationSuccess, 'success');
            ui.renderOutputGallery(appState.imageFiles);
            appState.activeOutputImageIndex = 0;
            ui.updateTextareas();
        } catch (error) {
            ui.showMessage(`${appState.translations.translationFailure} ${error.message}`, 'error');
        } finally {
            appState.isTranslating = false;
            ui.updateActionButtons(true);
            dom.progressContainer.classList.add('hidden');
        }
    },
    handleOutputGalleryClick(e) {
        const item = e.target.closest('.output-gallery-item');
        if (item) {
            const index = parseInt(item.getAttribute('data-index'), 10);
            appState.activeOutputImageIndex = index;
            ui.updateTextareas();
        }
    },
    showAllTexts() {
        appState.activeOutputImageIndex = -1;
        ui.updateTextareas();
    },
    downloadAllTexts() {
        const allText = `Original Texts:\n\n${dom.originalTextarea.value}\n\n========================\n\nTranslated Texts:\n\n${dom.translatedTextarea.value}`;
        const blob = new Blob([allText], { type: 'text/plain;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'translation.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        ui.showMessage(appState.translations.downloadSuccess, 'success');
    },
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            ui.showMessage(appState.translations.copySuccess, 'success');
        } catch (err) {
            ui.showMessage(appState.translations.copyFailure, 'error');
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    main.init();
});