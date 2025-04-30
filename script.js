document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const originalLabel = document.getElementById('originalLabel');
    const compressedLabel = document.getElementById('compressedLabel');
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
    let isSvg = false;

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
    // Modify the formatSelect element
    formatSelect.innerHTML = `
        <option value="mozjpeg">JPEG (MozJPEG)</option>
        <option value="optipng">PNG (OptiPNG)</option>
        <option value="webp">WebP</option>
        <option value="avif">AVIF</option>
        <option value="jxl">JPEG XL (Experimental)</option>
        <option value="png">PNG (Original)</option>
        <option value="jpeg">JPEG (Original)</option>
    `;


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
        if (!file.type.startsWith('image/') && file.type !== 'image/svg+xml') {
            alert('Please upload a valid image file.');
            return;
        } 
        isSvg = file.type === 'image/svg+xml';
        
         
        originalFile = file;
        currentFilename = file.name.substring(0, file.name.lastIndexOf('.')) || 'image'; // Store filename without extension
        const reader = new FileReader();
        reader.onload = (e) => {
            originalImageDataUrl = e.target.result;
            loadImage();
        };
         if (isSvg) {
            reader.readAsText(file);
        } else {
            reader.readAsDataURL(file);
        }
    }

    // --- Image Loading and Display ---
    async function loadImage() {
        showLoading();

        if(isSvg) {
            loadSvg();
            return;
        }
        originalImage = new Image();
        if (!originalImageDataUrl) {
             console.error('Error: originalImageDataUrl is null.');
            return;
        }
        originalImage.onload = async () => {
            originalWidth = originalImage.naturalWidth;
            originalHeight = originalImage.naturalHeight;
            // Show labels for original and compressed images
            originalLabel.classList.remove('hidden');
            compressedLabel.classList.remove('hidden');


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
            displayCodecSupportStatus();
        };
        originalImage.onerror = () => {
            console.error('Error loading image:', originalImageDataUrl);
            alert('Error loading the image. Please check the console for details.');
            hideLoading();
            resetApp();
        };
        originalImage.src = originalImageDataUrl;
    }
     async function processSvg(svgData) {
        return new Promise((resolve, reject) => {
             const serializer = new XMLSerializer();
             const svg = new DOMParser().parseFromString(svgData, 'image/svg+xml').documentElement;
            // draw in the canvas
            setCanvasDimensions(processedCanvas, originalWidth, originalHeight);
            processedCtx.clearRect(0, 0, processedCanvas.width, processedCanvas.height);
            processedCtx.drawImage(originalImage, 0, 0, originalCanvas.width, originalCanvas.height);
            resolve(svg);
        });
    }
    async function loadSvg() {
            originalImage = new Image();
             originalImage.onload = async () => {
                 originalWidth = originalImage.naturalWidth;
                 originalHeight = originalImage.naturalHeight;
                 setCanvasDimensions(originalCanvas, originalWidth, originalHeight);
                 originalCtx.drawImage(originalImage, 0, 0, originalCanvas.width, originalCanvas.height);
             };
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
            formatSelect.value = 'png'; // Default to PNG for SVG
            // Show labels for original and compressed images
            originalLabel.classList.remove('hidden');
            compressedLabel.classList.remove('hidden');

            updateOriginalInfo();
            updateCodecSpecificUI();
            enableZoomControls();
            displayCodecSupportStatus();
            resetUI();
            try {
                await processSvg(originalImageDataUrl);
            } catch (error) {
                console.error("Error processing SVG image:", error);
                alert("An error occurred while processing the SVG image.");
            }
             downloadBtn.disabled = true;
        }
        
     function displayCodecSupportStatus() {
         const selectedFormat = formatSelect.value;
         formatSelect.title = (selectedFormat === 'avif' || selectedFormat === 'jxl' || selectedFormat === 'webp') ? `${selectedFormat.toUpperCase()} codec is not supported yet. Simulation with JPEG/PNG.` : '';     }
    function resetUI() {
        // Reset settings panel to defaults
        formatSelect.value = 'mozjpeg';
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
         isSvg = false;
         currentFilename = 'image';
         resetUI();
         uploadPrompt.classList.remove('hidden');
         imagePreviewContainer.classList.add('hidden');
         settingsPanel.classList.add('hidden');
         statusBar.classList.add('hidden');
         // Hide labels for original and compressed images
         originalLabel.classList.add('hidden');
         compressedLabel.classList.add('hidden');

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
        displayCodecSupportStatus();
        debounceTimer = setTimeout(async () => {
            await processImage();
            hideLoading();
        }, DEBOUNCE_DELAY);
    }

    function updateCodecSpecificUI() { const selectedFormat = formatSelect.value; if (selectedFormat === 'optipng') { qualitySection.classList.add('hidden');
            paletteSection.classList.remove('hidden');
        } else if (selectedFormat === 'png') {
            qualitySection.classList.add('hidden');
            paletteSection.classList.add('hidden');
        } else if (selectedFormat === 'jpeg' || selectedFormat === 'mozjpeg') {
              qualitySection.classList.remove('hidden');
              paletteSection.classList.add('hidden');
        } else {
            qualitySection.classList.remove('hidden');
            paletteSection.classList.add('hidden');
        }
          displayCodecSupportStatus();
    }
    
    
    // Refactored handleResizeInput function
    function handleResizeInput() {
        if (!originalImage) return;

        const aspect = originalWidth / originalHeight;
        const widthInput = resizeWidthInput;
        const heightInput = resizeHeightInput;
        const changedInput = document.activeElement; 

        let width = widthInput.value.trim() === '' ? '' : parseInt(widthInput.value, 10);
        let height = heightInput.value.trim() === '' ? '' : parseInt(heightInput.value, 10);

        if (width < 0 ) {
            width = Math.max(0, width); // Ensure width is not negative
             widthInput.value = width;
        }
         if (height < 0 ) {
            height = Math.max(0, height); // Ensure height is not negative
            heightInput.value = height;
        }
        
        if (aspectRatioToggle.checked) {
            // aspect ratio is ON
             if (changedInput === widthInput) {
                // width input was changed
                 if (width === '') {
                     // width input is now empty
                     heightInput.value = Math.round(originalHeight * (parseInt(heightInput.value, 10) / originalHeight));
                } else {
                    // width was changed and has value
                    if (width > originalWidth) {
                        width = originalWidth;
                        widthInput.value = width;
                    }
                    

                     heightInput.value = Math.round(width / aspect);
                 }
            } else if (changedInput === heightInput) {
                // height was changed
                if (height === '') {
                    // height input is now empty
                    widthInput.value = Math.round(originalWidth * (parseInt(widthInput.value, 10) / originalWidth));
                 } else {
                    // height was changed and has value
                     if (height > originalHeight) {
                         height = originalHeight;
                         heightInput.value = height;
                     }
                     widthInput.value = Math.round(height * aspect);
                 }
            }
        } 
        // else: aspect ratio is OFF, no change
        
        // check again if new values are greater than the original size
        if (width > originalWidth) widthInput.value = originalWidth;
        if (height > originalHeight) heightInput.value = originalHeight;
        

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
         resetApp();
     }



    // --- Image Processing ---
    async function processImage() {
        if (!originalImage && !isSvg) return;
        showLoading();

        if(isSvg) {
            return processSvg(originalImageDataUrl);
        }

        const options = getCurrentSettings();

        try {
             // 1. Get potentially resized image data
             const sourceCanvas = await getResizedCanvas(options.resize);

            // 2. **CORE COMPRESSION LOGIC (Simulated)**
            // This is where the actual WebAssembly codec integration would happen.
            //    We pass the image data (from sourceCanvas) and options to the Wasm module.
            //    The module returns a compressed Blob or ArrayBuffer.
             processedBlob = await simulateCompression(sourceCanvas, options);

            // 3. Update processed canvas preview
            const processedImageUrl = URL.createObjectURL(processedBlob);
            const processedImg = new Image();
            processedImg.onload =  () => {
                try {
                    setCanvasDimensions(processedCanvas, processedImg.naturalWidth, processedImg.naturalHeight); // Update canvas size if format changes dimensions (rare)
                    processedCtx.clearRect(0, 0, processedCanvas.width, processedCanvas.height);
                    processedCtx.drawImage(processedImg, 0, 0, processedCanvas.width, processedCanvas.height);
                    URL.revokeObjectURL(processedImageUrl);
                    updateCompressedInfo(processedBlob.size);
                    downloadBtn.disabled = false;
                } catch (error) {
                     console.error("Error processing the processed image:", error);
                     alert("An error occurred while processing the compressed image. Check console for details.");
                } finally {
                    hideLoading();
                }
             };
             processedImg.onerror = (error) => {
                console.error("Error loading processed image preview.", error);
                alert("Error displaying compressed image preview. Check console for details.");
                processedCtx.clearRect(0, 0, processedCanvas.width, processedCanvas.height); // Clean up if error happens
                downloadBtn.disabled = true;
                hideLoading(); 
            };
            processedImg.src = processedImageUrl;

        } catch (error) {
             if(error.message === 'Canvas toBlob returned null') {
                 console.error('Error processing the image. Canvas toBlob returned null, maybe the format is not supported in this browser.');
                 alert('Error processing the image. The image format may not be supported by this browser. Please try a different format.');
                 
            }
            console.error('Processing Error: ', error);
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
             if (!tempCanvas) {
                console.error("Error creating temporary canvas for resizing.");
                return;
            }
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
             let targetFormat = options.format === 'mozjpeg' ? 'jpeg' : options.format; // Map mozjpeg to jpeg type
              let mimeType = `image/${targetFormat}`;
             let qualityParam = options.quality / 100; // Canvas quality is 0-1


            if (options.format === 'avif' || options.format === 'jxl' || options.format === 'webp') {
                    console.log(`Simulating ${options.format.toUpperCase()} compression`);
                }
            // For formats like PNG where quality slider isn't the main factor,
            // we might ignore it or apply other logic (like palette reduction simulated here).
             if (options.format === 'png' || options.format === 'optipng') {
                mimeType = 'image/png';
                qualityParam = undefined; // toBlob ignores quality for PNG
                 console.log(`Simulating PNG/OptiPNG (palette: ${options.colors}) - Output will be standard PNG`);
                // NOTE: Actual OptiPNG or palette reduction requires specific libraries/Wasm.
                // This simulation just exports as standard PNG.
            } else if (options.format === 'mozjpeg') {
                 mimeType = 'image/jpeg';
            }else if (options.format === 'avif') {
                 mimeType = 'image/avif';
            } else if (options.format === 'jxl') {
                 mimeType = 'image/jxl';
             }else if (options.format === 'webp') {
                 mimeType = 'image/webp';
            }
            
            
             console.log(`Simulating ${options.format.toUpperCase()} compression - Output will be ${mimeType.toUpperCase().replace('IMAGE/','')}`);

            
            if (options.format === 'mozjpeg' && mimeType !== 'image/jpeg') {
                mimeType = 'image/jpeg';
            }

            
            // Simulate delay
            setTimeout(() => {
                 try {
                    sourceCanvas.toBlob(
                       (blob) => {
                            if (blob) {
                                console.log(`Simulation Output MimeType: ${blob.type}, Size: ${formatBytes(blob.size)}`);
                                // Inject correct type if browser defaulted (e.g. for OptiPNG sim)
                                if(options.format === 'mozjpeg' && blob.type !== 'image/jpeg') {
                                     blob = new Blob([blob], { type: 'image/jpeg' });
                                }
                                // Inject correct type for avif/jxl/webp
                                if((options.format === 'avif' || options.format === 'jxl' || options.format === 'webp') && blob.type !== mimeType) {
                                     blob = new Blob([blob], { type: mimeType });
                                }
                                resolve(blob);
                            } else {
                                reject(new Error('Canvas toBlob returned null')); // or 'Canvas toBlob failed'
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
        const selectedFormat = formatSelect.value;
        if (!originalFile || compressedSizeBytes === 0) {
            compressedSizeDisplay.textContent = 'N/A';
            sizeReductionDisplay.textContent = '0%';
            downloadBtn.disabled = true;
            return;
        }
        const originalSizeBytes = originalFile.size;
        compressedSizeDisplay.textContent = formatBytes(compressedSizeBytes);
         // Disable download if unsupported format is selected
         if (selectedFormat === 'avif' || selectedFormat === 'jxl' || selectedFormat === 'webp' || originalFile.type === 'image/svg+xml'){
            downloadBtn.disabled = true;
         }
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
        if (!isDraggingSlider) return;
        if (!imagePreviewContainer) {
            stopSliderDrag();
            return;
        }

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
         if (!canvas || !originalImage) {
             console.warn('Canvas is null or original image is not loaded in applyZoomTransform function.');
            return;
         }
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
         if (window.innerWidth < 1024) {
             settingsPanel.classList.toggle('active');
         }
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
