document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const dropZone = document.getElementById('dropZone');
    const uploadPrompt = document.getElementById('uploadPrompt');
    const imageUploadInput = document.getElementById('imageUploadInput');
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
    const originalCanvas = document.getElementById('originalCanvas');
    const processedCanvas = document.getElementById('processedCanvas');
    const processedImageWrapper = document.getElementById('processedImageWrapper');
    const comparisonSlider = document.getElementById('comparisonSlider');
    const loadingIndicator = document.getElementById('loadingIndicator');

    const settingsPanel = document.getElementById('settingsPanel');
    const mobileSettingsToggle = document.getElementById('mobileSettingsToggle');
    const formatSelect = document.getElementById('formatSelect');
    const qualitySection = document.getElementById('qualitySection');
    const qualitySlider = document.getElementById('qualitySlider');
    const qualityValue = document.getElementById('qualityValue');
    const paletteSection = document.getElementById('paletteSection');
    const colorPaletteSlider = document.getElementById('colorPaletteSlider');
    const colorPaletteValue = document.getElementById('colorPaletteValue');
    const resizeWidthInput = document.getElementById('resizeWidth');
    const resizeHeightInput = document.getElementById('resizeHeight');
    const aspectRatioToggle = document.getElementById('aspectRatioToggle');
    const resetResizeBtn = document.getElementById('resetResizeBtn');
    const advancedOptionsContainer = document.getElementById('advancedOptionsContainer');
    const resetAllBtn = document.getElementById('resetAllBtn');

    const statusBar = document.getElementById('statusBar');
    const originalSizeDisplay = document.getElementById('originalSize');
    const originalDimensionsDisplay = document.getElementById('originalDimensions');
    const originalTypeDisplay = document.getElementById('originalType');
    const compressedSizeDisplay = document.getElementById('compressedSize');
    const sizeReductionDisplay = document.getElementById('sizeReduction');
    const downloadBtn = document.getElementById('downloadBtn');

    const zoomOutBtn = document.getElementById('zoomOutBtn');
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomLevelDisplay = document.getElementById('zoomLevel');
    const zoomResetBtn = document.getElementById('zoomResetBtn');

    const themeToggleBtn = document.getElementById('themeToggleBtn');

    // --- State Variables ---
    let originalImage = null;
    let originalImageDataUrl = null;
    let originalFile = null;
    let originalWidth = 0;
    let originalHeight = 0;
    let processedBlob = null;
    let currentZoom = 1;
    let isDraggingSlider = false;
    let debounceTimer = null;
    let currentFilename = 'image';

    // Contexts for canvases
    const originalCtx = originalCanvas.getContext('2d');
    const processedCtx = processedCanvas.getContext('2d');

    // --- Constants ---
    const DEBOUNCE_DELAY = 500; // milliseconds
    const MAX_ZOOM = 5;
    const MIN_ZOOM = 0.1;
    const ZOOM_STEP = 0.2;

    // --- Initialization ---
    setupEventListeners();
    updateThemeIcon(); // Set initial theme icon

    // --- Event Listeners Setup ---
    function setupEventListeners() {
        // Drag and Drop
        dropZone.addEventListener('dragover', handleDragOver);
        dropZone.addEventListener('dragleave', handleDragLeave);
        dropZone.addEventListener('drop', handleDrop);
        dropZone.addEventListener('click', () => imageUploadInput.click()); // Trigger file input click
        imageUploadInput.addEventListener('change', handleFileSelect);

        // Settings Controls
        formatSelect.addEventListener('change', handleSettingsChange);
        qualitySlider.addEventListener('input', () => {
            qualityValue.textContent = qualitySlider.value;
            handleSettingsChange();
        });
         colorPaletteSlider.addEventListener('input', () => {
            colorPaletteValue.textContent = colorPaletteSlider.value;
            handleSettingsChange();
        });
        [resizeWidthInput, resizeHeightInput].forEach(input => {
            input.addEventListener('input', handleResizeInput);
        });
        aspectRatioToggle.addEventListener('change', handleAspectRatioToggle);
        resetResizeBtn.addEventListener('click', resetResize);
        resetAllBtn.addEventListener('click', resetAllSettings);

        // Comparison Slider
        comparisonSlider.addEventListener('mousedown', startSliderDrag);
        comparisonSlider.addEventListener('touchstart', startSliderDrag, { passive: false }); // Handle touch events
        document.addEventListener('mousemove', dragSlider);
        document.addEventListener('touchmove', dragSlider, { passive: false });
        document.addEventListener('mouseup', stopSliderDrag);
        document.addEventListener('touchend', stopSliderDrag);

        // Download Button
        downloadBtn.addEventListener('click', handleDownload);

        // Zoom Controls
        zoomInBtn.addEventListener('click', () => updateZoom(currentZoom + ZOOM_STEP));
        zoomOutBtn.addEventListener('click', () => updateZoom(currentZoom - ZOOM_STEP));
        zoomResetBtn.addEventListener('click', () => updateZoom(1));

        // Theme Toggle
        themeToggleBtn.addEventListener('click', toggleTheme);

        // Mobile Settings Toggle
        mobileSettingsToggle.addEventListener('click', toggleMobileSettings);
        // Close mobile settings if clicking outside
        document.addEventListener('click', (event) => {
             if (window.innerWidth < 1024 && settingsPanel.classList.contains('active')) {
                 if (!settingsPanel.contains(event.target) && !mobileSettingsToggle.contains(event.target)) {
                     settingsPanel.classList.remove('active');
                 }
             }
         });
    }

    // --- Drag and Drop Handlers ---
    function handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add('border-indigo-500', 'bg-indigo-50', 'dark:bg-gray-700');
    }

    function handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('border-indigo-500', 'bg-indigo-50', 'dark:bg-gray-700');
    }

    function handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('border-indigo-500', 'bg-indigo-50', 'dark:bg-gray-700');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    }

    // --- File Handling ---
    function handleFileSelect(e) {
        const files = e.target.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    }

    function handleFile(file) {
        if (!file.type.startsWith('image/')) {
            alert('Please upload a valid image file.');
            return;
        }
        originalFile = file;
        currentFilename = file.name.substring(0, file.name.lastIndexOf('.')) || 'image'; // Store filename without extension
        const reader = new FileReader();
        reader.onload = (e) => {
            originalImageDataUrl = e.target.result;
            loadImage();
        };
        reader.readAsDataURL(file);
    }

    // --- Image Loading and Display ---
    async function loadImage() {
        showLoading();
        originalImage = new Image();
        originalImage.onload = async () => {
            originalWidth = originalImage.naturalWidth;
            originalHeight = originalImage.naturalHeight;

            // Reset UI elements
            resetUI();
            updateOriginalInfo();

            // Set canvas dimensions based on image aspect ratio
            setCanvasDimensions(originalCanvas, originalWidth, originalHeight);
            setCanvasDimensions(processedCanvas, originalWidth, originalHeight);
            originalCtx.drawImage(originalImage, 0, 0, originalCanvas.width, originalCanvas.height);

            // Show preview, hide prompt
            uploadPrompt.classList.add('hidden');
            imagePreviewContainer.classList.remove('hidden');
            settingsPanel.classList.remove('hidden');
            statusBar.classList.remove('hidden');
             if (window.innerWidth < 1024) {
                settingsPanel.classList.remove('lg:block'); // Ensure it's not forced block on mobile
            } else {
                 settingsPanel.classList.add('lg:block');
            }
            mobileSettingsToggle.classList.remove('hidden');

            // Trigger initial compression
            await processImage();
            enableZoomControls();
            hideLoading();
        };
        originalImage.onerror = () => {
            alert('Error loading image.');
            hideLoading();
            resetApp();
        };
        originalImage.src = originalImageDataUrl;
    }

    function resetUI() {
        // Reset settings panel to defaults
        formatSelect.value = 'mozjpeg'; // Default codec
        qualitySlider.value = 75;
        qualityValue.textContent = '75';
         colorPaletteSlider.value = 256;
        colorPaletteValue.textContent = '256';
        updateCodecSpecificUI(); // Show/hide relevant sections
        resetResize(); // Clear resize inputs and check aspect ratio

        // Reset preview
        originalCtx.clearRect(0, 0, originalCanvas.width, originalCanvas.height);
        processedCtx.clearRect(0, 0, processedCanvas.width, processedCanvas.height);
        processedImageWrapper.style.clipPath = `inset(0 0 0 50%)`; // Reset slider view
        comparisonSlider.style.left = '50%';
        updateZoom(1); // Reset zoom

        // Reset status bar
        compressedSizeDisplay.textContent = 'N/A';
        sizeReductionDisplay.textContent = '0%';
        downloadBtn.disabled = true;
        disableZoomControls();
    }

    function resetApp() {
         originalImage = null;
         originalImageDataUrl = null;
         originalFile = null;
         processedBlob = null;
         currentFilename = 'image';
         resetUI();
         uploadPrompt.classList.remove('hidden');
         imagePreviewContainer.classList.add('hidden');
         settingsPanel.classList.add('hidden');
         statusBar.classList.add('hidden');
         mobileSettingsToggle.classList.add('hidden');
    }

    function updateOriginalInfo() {
        originalSizeDisplay.textContent = formatBytes(originalFile.size);
        originalDimensionsDisplay.textContent = `${originalWidth}x${originalHeight}`;
        originalTypeDisplay.textContent = originalFile.type.split('/')[1].toUpperCase();
    }

    function setCanvasDimensions(canvas, imgWidth, imgHeight) {
         // Adjust canvas logical size to fit the container while maintaining aspect ratio
        const container = canvas.parentElement.getBoundingClientRect();
        const containerRatio = container.width / container.height;
        const imgRatio = imgWidth / imgHeight;

        let targetWidth, targetHeight;

        if (imgRatio > containerRatio) {
            // Image is wider than container
            targetWidth = container.width;
            targetHeight = container.width / imgRatio;
        } else {
            // Image is taller than container
            targetHeight = container.height;
            targetWidth = container.height * imgRatio;
        }

        // Set physical pixels (for sharp rendering) - use actual image size
        canvas.width = imgWidth;
        canvas.height = imgHeight;

        // Set CSS size for display
        canvas.style.width = `${targetWidth}px`;
        canvas.style.height = `${targetHeight}px`;

        // Adjust wrapper for processed image too
         if (canvas.id === 'originalCanvas') {
            processedImageWrapper.style.width = canvas.style.width;
            processedImageWrapper.style.height = canvas.style.height;
         }

        updateZoom(currentZoom); // Re-apply zoom after resize
    }

     // Adjust canvas display on window resize
    const resizeObserver = new ResizeObserver(() => {
        if (originalImage) {
             setCanvasDimensions(originalCanvas, originalWidth, originalHeight);
             setCanvasDimensions(processedCanvas, originalWidth, originalHeight);
        }
    });
    resizeObserver.observe(imagePreviewContainer); // Observe the container


    // --- Settings Handlers ---
    function handleSettingsChange() {
        clearTimeout(debounceTimer);
        showLoading(); // Show loading immediately for responsiveness
        updateCodecSpecificUI();
        debounceTimer = setTimeout(async () => {
            await processImage();
            hideLoading();
        }, DEBOUNCE_DELAY);
    }

     function updateCodecSpecificUI() {
        const selectedFormat = formatSelect.value;
        if (selectedFormat === 'optipng' || selectedFormat === 'png') {
            qualitySection.classList.add('hidden');
            paletteSection.classList.remove('hidden');
        } else {
             qualitySection.classList.remove('hidden');
             paletteSection.classList.add('hidden');
        }
        // Add logic here to show/hide specific advanced options based on codec
        // Example:
        // advancedOptionsContainer.innerHTML = ''; // Clear previous options
        // if (selectedFormat === 'mozjpeg') {
        //     advancedOptionsContainer.innerHTML = `<p>MozJPEG options...</p>`;
        // } else if (selectedFormat === 'webp') {
        //     advancedOptionsContainer.innerHTML = `<p>WebP options...</p>`;
        // } else {
        //     advancedOptionsContainer.innerHTML = `<p class="text-xs italic">No advanced options for this format yet.</p>`;
        // }
    }

    function handleResizeInput() {
        if (!originalImage) return;

        const aspect = originalWidth / originalHeight;
        const widthInput = resizeWidthInput;
        const heightInput = resizeHeightInput;
        const changedInput = document.activeElement; // Find which input was changed

        let width = parseInt(widthInput.value, 10);
        let height = parseInt(heightInput.value, 10);

        if (aspectRatioToggle.checked) {
            if (changedInput === widthInput && width > 0) {
                heightInput.value = Math.round(width / aspect);
            } else if (changedInput === heightInput && height > 0) {
                widthInput.value = Math.round(height * aspect);
            } else if (!widthInput.value && heightInput.value) {
                // Handle case where width is deleted but height remains
                widthInput.value = Math.round(height * aspect);
            } else if (widthInput.value && !heightInput.value) {
                 // Handle case where height is deleted but width remains
                 heightInput.value = Math.round(width / aspect);
            }
        }

        handleSettingsChange();
    }

    function handleAspectRatioToggle() {
        // Trigger recalculation if needed when toggling aspect ratio
         if (resizeWidthInput.value || resizeHeightInput.value) {
             handleResizeInput(); // Re-apply logic based on the first available value
         }
    }

    function resetResize() {
        resizeWidthInput.value = '';
        resizeHeightInput.value = '';
        aspectRatioToggle.checked = true;
        // Check if original image exists before triggering process
         if (originalImage) {
             handleSettingsChange();
         }
    }

    function resetAllSettings() {
        if (!originalImage) return;
        resetUI(); // Reset controls to default
        loadImage(); // Reload original image data and trigger default compression
    }


    // --- Image Processing ---
    async function processImage() {
        if (!originalImage) return;
        showLoading();

        const options = getCurrentSettings();

        try {
             // 1. Get potentially resized image data
             const sourceCanvas = await getResizedCanvas(options.resize);

            // 2. **CORE COMPRESSION LOGIC (Simulated)**
            //    This is where the actual WebAssembly codec integration would happen.
            //    We pass the image data (from sourceCanvas) and options to the Wasm module.
            //    The module returns a compressed Blob or ArrayBuffer.
             processedBlob = await simulateCompression(sourceCanvas, options);

            // 3. Update processed canvas preview
            const processedImageUrl = URL.createObjectURL(processedBlob);
            const processedImg = new Image();
            processedImg.onload = () => {
                setCanvasDimensions(processedCanvas, processedImg.naturalWidth, processedImg.naturalHeight); // Update canvas size if format changes dimensions (rare)
                processedCtx.clearRect(0, 0, processedCanvas.width, processedCanvas.height);
                processedCtx.drawImage(processedImg, 0, 0, processedCanvas.width, processedCanvas.height);
                URL.revokeObjectURL(processedImageUrl);
                updateCompressedInfo(processedBlob.size);
                downloadBtn.disabled = false;
                hideLoading();
            };
             processedImg.onerror = () => {
                console.error("Error loading processed image preview.");
                alert("Error displaying compressed image. Check console for details.");
                // Possibly revert to previous state or show error message
                processedCtx.clearRect(0, 0, processedCanvas.width, processedCanvas.height);
                downloadBtn.disabled = true;
                hideLoading();
            };
            processedImg.src = processedImageUrl;

        } catch (error) {
            console.error('Processing Error:', error);
            alert(`Error during image processing: ${error.message}`);
            updateCompressedInfo(0); // Reset compressed info
            downloadBtn.disabled = true;
            hideLoading();
        }
    }

    function getCurrentSettings() {
        const format = formatSelect.value;
        const quality = parseInt(qualitySlider.value, 10);
        const colors = parseInt(colorPaletteSlider.value, 10);
        const resize = {
            enabled: !!(resizeWidthInput.value || resizeHeightInput.value),
            width: parseInt(resizeWidthInput.value, 10) || originalWidth,
            height: parseInt(resizeHeightInput.value, 10) || originalHeight,
        };
        // If only one dimension was set and aspect ratio is maintained, ensure the other is calculated correctly
        if (resize.enabled && aspectRatioToggle.checked) {
            const aspect = originalWidth / originalHeight;
             if (parseInt(resizeWidthInput.value, 10) && !parseInt(resizeHeightInput.value, 10)) {
                resize.height = Math.round(resize.width / aspect);
             } else if (!parseInt(resizeWidthInput.value, 10) && parseInt(resizeHeightInput.value, 10)) {
                 resize.width = Math.round(resize.height * aspect);
             }
        }


        // Add advanced options based on format here
        const advanced = {};
        // e.g., if (format === 'mozjpeg') advanced.smoothing = ...;

        return { format, quality, resize, colors, advanced };
    }

     // Creates a temporary canvas with the resized image if necessary
    async function getResizedCanvas(resizeOptions) {
        return new Promise((resolve) => {
            if (!resizeOptions.enabled || (resizeOptions.width === originalWidth && resizeOptions.height === originalHeight)) {
                 // No resize needed, use original canvas data
                 resolve(originalCanvas);
                 return;
            }

            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = resizeOptions.width;
            tempCanvas.height = resizeOptions.height;
            tempCtx.drawImage(originalImage, 0, 0, tempCanvas.width, tempCanvas.height);
            resolve(tempCanvas);
        });
    }

    // --- *** PLACEHOLDER COMPRESSION FUNCTION *** ---
    async function simulateCompression(sourceCanvas, options) {
        console.log("Simulating compression with options:", options);
        return new Promise((resolve, reject) => {
            // ** ACTUAL IMPLEMENTATION NOTES **
            // 1. Get ImageData: const imageData = sourceCanvas.getContext('2d').getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
            // 2. Load Wasm Codec: Use dynamic import() or preloaded script tags for the relevant Wasm module (e.g., MozJPEG, WebP Encoder).
            // 3. Call Wasm Function: Pass imageData.data (Uint8ClampedArray), width, height, and options (quality, etc.) to the Wasm encode function.
            // 4. Handle Result: The Wasm function should return a Uint8Array or ArrayBuffer with the compressed data.
            // 5. Create Blob: new Blob([compressedData], { type: `image/${options.format === 'mozjpeg' ? 'jpeg' : options.format}` }) -> resolve(blob)
            // 6. Error Handling: Catch errors from Wasm execution -> reject(error)

            // --- Simulation ---
             const targetFormat = options.format === 'mozjpeg' ? 'jpeg' : options.format; // Map mozjpeg to jpeg type
             const mimeType = `image/${targetFormat}`;
             let qualityParam = options.quality / 100; // Canvas quality is 0-1

            // For formats like PNG where quality slider isn't the main factor,
            // we might ignore it or apply other logic (like palette reduction simulated here).
             if (mimeType === 'image/png' || mimeType === 'image/optipng') {
                qualityParam = undefined; // toBlob ignores quality for PNG
                 console.log(`Simulating PNG/OptiPNG (palette: ${options.colors}) - Output will be standard PNG`);
                // NOTE: Actual OptiPNG or palette reduction requires specific libraries/Wasm.
                // This simulation just exports as standard PNG.
            }
             if (mimeType === 'image/avif' || mimeType === 'image/jxl' || mimeType === 'image/webp') {
                 console.warn(`Simulating ${mimeType.toUpperCase()} - Output will be standard PNG or JPEG as fallback in this demo.`);
                 // In a real app, you'd call the specific Wasm encoder here.
                 // For simulation, fall back to exporting as PNG or JPEG.
                 // sourceCanvas.toBlob(resolve, 'image/png'); // Or 'image/jpeg', qualityParam
                 // return;
             }


            // Simulate delay
            setTimeout(() => {
                 try {
                    sourceCanvas.toBlob(
                        (blob) => {
                            if (blob) {
                                console.log(`Simulation Output MimeType: ${blob.type}, Size: ${formatBytes(blob.size)}`);
                                // Inject correct type if browser defaulted (e.g. for OptiPNG sim)
                                if ((options.format === 'optipng' || options.format === 'png') && blob.type !== 'image/png') {
                                    blob = new Blob([blob], { type: 'image/png' });
                                } else if (options.format === 'mozjpeg' && blob.type !== 'image/jpeg') {
                                     blob = new Blob([blob], { type: 'image/jpeg' });
                                }
                                resolve(blob);
                            } else {
                                reject(new Error('Canvas toBlob returned null'));
                            }
                        },
                        mimeType, // Target MIME type
                        qualityParam // Quality (0-1), ignored for some formats like PNG
                    );
                 } catch (error) {
                     reject(error);
                 }
            }, 300 + Math.random() * 500); // Simulate processing time
        });
    }
    // --- *** END PLACEHOLDER *** ---

    function updateCompressedInfo(compressedSizeBytes) {
        if (!originalFile || compressedSizeBytes === 0) {
            compressedSizeDisplay.textContent = 'N/A';
            sizeReductionDisplay.textContent = '0%';
            return;
        }
        const originalSizeBytes = originalFile.size;
        compressedSizeDisplay.textContent = formatBytes(compressedSizeBytes);
        const reduction = originalSizeBytes > 0 ? ((originalSizeBytes - compressedSizeBytes) / originalSizeBytes) * 100 : 0;
        sizeReductionDisplay.textContent = `${Math.max(0, reduction).toFixed(1)}%`;
        sizeReductionDisplay.classList.toggle('text-green-600', reduction > 0);
        sizeReductionDisplay.classList.toggle('dark:text-green-400', reduction > 0);
        sizeReductionDisplay.classList.toggle('text-red-600', reduction < 0); // Size increase
        sizeReductionDisplay.classList.toggle('dark:text-red-400', reduction < 0);
    }


    // --- Comparison Slider Logic ---
    function startSliderDrag(e) {
        e.preventDefault(); // Prevent text selection, etc.
        isDraggingSlider = true;
        comparisonSlider.classList.add('active'); // Optional: for styling while dragging
        document.body.style.cursor = 'col-resize'; // Change cursor globally
    }

    function dragSlider(e) {
        if (!isDraggingSlider || !imagePreviewContainer) return;
        e.preventDefault(); // Prevent scroll on touch

        const rect = imagePreviewContainer.getBoundingClientRect();
         // Get clientX from touch or mouse event
         const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        let x = clientX - rect.left;

        // Clamp position within bounds
        x = Math.max(0, Math.min(x, rect.width));

        const percentage = (x / rect.width) * 100;
        comparisonSlider.style.left = `${percentage}%`;
        processedImageWrapper.style.clipPath = `inset(0 0 0 ${percentage}%)`;
    }

    function stopSliderDrag() {
        if (isDraggingSlider) {
            isDraggingSlider = false;
            comparisonSlider.classList.remove('active');
            document.body.style.cursor = 'default'; // Reset cursor
        }
    }

    // --- Zoom Logic ---
    function updateZoom(newZoom) {
        currentZoom = Math.max(MIN_ZOOM, Math.min(newZoom, MAX_ZOOM));
        zoomLevelDisplay.textContent = `${Math.round(currentZoom * 100)}%`;

        applyZoomTransform(originalCanvas);
        applyZoomTransform(processedCanvas);

        // Enable/disable buttons at limits
        zoomOutBtn.disabled = currentZoom <= MIN_ZOOM;
        zoomInBtn.disabled = currentZoom >= MAX_ZOOM;
        zoomResetBtn.disabled = currentZoom === 1;
    }

    function applyZoomTransform(canvas) {
         if (!canvas) return;
         // Apply zoom using CSS transform
         canvas.style.transformOrigin = 'center center'; // Zoom from center
         canvas.style.transform = `scale(${currentZoom})`;
          // Adjust the wrapper for processed canvas as well
         if(canvas.id === 'originalCanvas') {
            processedImageWrapper.style.transformOrigin = 'center center';
            processedImageWrapper.style.transform = `scale(${currentZoom})`;
         }
    }

     function enableZoomControls() {
        zoomOutBtn.disabled = currentZoom <= MIN_ZOOM;
        zoomInBtn.disabled = currentZoom >= MAX_ZOOM;
        zoomResetBtn.disabled = currentZoom === 1;
    }

    function disableZoomControls() {
        zoomOutBtn.disabled = true;
        zoomInBtn.disabled = true;
        zoomResetBtn.disabled = true;
        zoomLevelDisplay.textContent = '100%';
    }


    // --- Download ---
    function handleDownload() {
        if (!processedBlob) return;

        const link = document.createElement('a');
        const url = URL.createObjectURL(processedBlob);
        const extension = getFileExtension(processedBlob.type);
        const filename = `${currentFilename}_kira.${extension}`;

        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    // --- Theme Toggle ---
    function toggleTheme() {
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.setItem('kira-theme', isDark ? 'dark' : 'light');
        updateThemeIcon();
    }

    function updateThemeIcon() {
        const icon = themeToggleBtn.querySelector('i');
        if (document.documentElement.classList.contains('dark')) {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        } else {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
        }
    }

     // --- Mobile Settings Panel Toggle ---
     function toggleMobileSettings() {
         settingsPanel.classList.toggle('active');
     }

    // --- Utility Functions ---
    function formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    function getFileExtension(mimeType) {
         switch (mimeType) {
            case 'image/jpeg': return 'jpg';
            case 'image/png': return 'png';
            case 'image/webp': return 'webp';
            case 'image/avif': return 'avif';
            case 'image/gif': return 'gif';
            case 'image/bmp': return 'bmp';
            case 'image/tiff': return 'tiff';
            case 'image/jxl': return 'jxl'; // Note: JXL support varies
            default: return 'bin'; // Default binary extension
        }
    }

    function showLoading() {
        if (loadingIndicator) loadingIndicator.classList.remove('hidden');
    }

    function hideLoading() {
        if (loadingIndicator) loadingIndicator.classList.add('hidden');
    }

    // --- PWA Service Worker Registration ---
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/service-worker.js')
                .then(registration => {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                })
                .catch(error => {
                    console.log('ServiceWorker registration failed: ', error);
                });
        });
    }

}); // End DOMContentLoaded
