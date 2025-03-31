document.addEventListener('DOMContentLoaded', function() {
    // Get SVG element
    const svg = document.getElementById('drawing-area');
    
    // Initialize variables
    let lastPoint = null;
    let isDrawing = true;
    let colorScheme = 'rainbow';
    let lineIndex = 0;
    let isMouseDown = false;
    let lineWidth = 2; // Default line width
    
    // History stacks for undo/redo functionality
    let undoStack = [];
    let redoStack = [];
    
    // Immediately mark the default color scheme as active
    document.getElementById('colorScheme1').classList.add('active');
    
    // Color scheme definitions
    const colorSchemes = {
        rainbow: ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#9400D3'],
        ocean: ['#0077be', '#0099cc', '#00ace6', '#33bbff', '#66ccff', '#99ddff'],
        fire: ['#ff0000', '#ff3300', '#ff6600', '#ff9900', '#ffcc00', '#ffff00'],
        pastel: ['#FFB6C1', '#FFD700', '#98FB98', '#ADD8E6', '#DDA0DD', '#FFDAB9'],
        neon: ['#FF00FF', '#00FFFF', '#FF0000', '#FFFF00', '#00FF00', '#FE01B1', '#0000FF'],
        forest: ['#004B49', '#00755E', '#008F39', '#7CAE7A', '#26532B', '#3F704D'],
        sunset: ['#F15BB5', '#FEE440', '#00BBF9', '#00F5D4', '#9B5DE5', '#F15BB5'],
        grayscale: ['#000000', '#333333', '#666666', '#999999', '#CCCCCC', '#FFFFFF'],
        earth: ['#8D5524', '#C68642', '#E0AC69', '#F1C27D', '#FFDBAC', '#5E2612']
    };
    
    // Set SVG dimensions to match window
    function updateSVGSize() {
        svg.setAttribute('width', window.innerWidth);
        svg.setAttribute('height', window.innerHeight);
    }
    
    // Initial size and update on resize
    updateSVGSize();
    window.addEventListener('resize', updateSVGSize);
    
    // Get color based on current scheme and line index
    function getColor() {
        const colors = colorSchemes[colorScheme];
        return colors[lineIndex % colors.length];
    }
    
    // Create a line element
    function createLine(x1, y1, x2, y2) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x1);
        line.setAttribute('y1', y1);
        line.setAttribute('x2', x2);
        line.setAttribute('y2', y2);
        line.setAttribute('stroke', getColor());
        line.setAttribute('stroke-width', lineWidth);
        return line;
    }
    
    // Handle when a point is added (either by click or drag)
    function addPoint(x, y, saveState = true) {
        if (!isDrawing) return;
        
        const point = { x: x, y: y };
        
        if (lastPoint) {
            // Only create a line if the points are different
            if (lastPoint.x !== point.x || lastPoint.y !== point.y) {
                // Create a line from last point to current point
                const line = createLine(lastPoint.x, lastPoint.y, point.x, point.y);
                
                // Clear redo stack when a new action is performed
                redoStack = [];
                
                // Save state before adding new line if requested
                if (saveState) {
                    saveToUndoStack();
                }
                
                // Add the line to the SVG
                svg.appendChild(line);
                lineIndex++;
            }
        }
        
        // Store current point for next action
        lastPoint = point;
        updateStatusMessage();
    }
    
    // Handle click event
    function handleClick(e) {
        if (e.button !== 0) return; // Only handle left clicks
        
        // Reset mouse state
        isMouseDown = false;
        
        // If drawing is off, turn it back on and update UI
        if (!isDrawing) {
            isDrawing = true;
            updateDrawingModeUI();
        }
        
        // Save current state before adding new point
        saveToUndoStack();
        
        // Remove any existing preview line
        const previewLine = document.getElementById('preview-line');
        if (previewLine) {
            previewLine.remove();
        }
        
        // Add the point
        addPoint(e.clientX, e.clientY, false);
        
        // Prevent mousedown from triggering right after click
        e.preventDefault();
        e.stopPropagation();
    }
    
    // Handle mouse down event
    function handleMouseDown(e) {
        if (e.button !== 0 || e.target !== svg) return; // Only respond to left mouse button directly on SVG
        
        isMouseDown = true;
        
        // If drawing is off, turn it back on and update UI
        if (!isDrawing) {
            isDrawing = true;
            updateDrawingModeUI();
        }
    }
    
    // Handle mouse up event
    function handleMouseUp(e) {
        if (e.button !== 0) return; // Only respond to left mouse button
        isMouseDown = false;
    }
    
    // Handle mouse move event
    function handleMouseMove(e) {
        if (!isDrawing) return;
        
        // Handle preview line
        if (lastPoint) {
            const previewLine = document.getElementById('preview-line');
            if (previewLine) {
                previewLine.remove();
            }
            
            // Create preview line
            const line = createLine(lastPoint.x, lastPoint.y, e.clientX, e.clientY);
            line.setAttribute('id', 'preview-line');
            line.setAttribute('stroke-opacity', '0.5');
            line.setAttribute('stroke-dasharray', '5,5');
            svg.appendChild(line);
        }
        
        // Handle continuous drawing
        if (isMouseDown) {
            addPoint(e.clientX, e.clientY, false);
        }
    }
    
    // Save current state to undo stack
    function saveToUndoStack() {
        // Clone the current SVG state for the undo stack
        const svgClone = svg.cloneNode(true);
        // Remove the preview line from the clone if it exists
        const previewLine = svgClone.querySelector('#preview-line');
        if (previewLine) {
            svgClone.removeChild(previewLine);
        }
        undoStack.push({
            svgContent: svgClone.innerHTML,
            lastPointX: lastPoint ? lastPoint.x : null,
            lastPointY: lastPoint ? lastPoint.y : null,
            currentLineIndex: lineIndex
        });
        
        // Limit the undo stack size to prevent excessive memory usage
        if (undoStack.length > 50) {
            undoStack.shift(); // Remove the oldest state
        }
        
        // Update the status message to show undo is available
        updateStatusMessage();
    }
    
    // Undo the last action
    function undo() {
        if (undoStack.length === 0) return; // Nothing to undo
        
        // Store current state in redo stack before undoing
        const currentState = {
            svgContent: svg.innerHTML.replace(/<line[^>]*id="preview-line"[^>]*>.*?<\/line>/g, ''),
            lastPointX: lastPoint ? lastPoint.x : null,
            lastPointY: lastPoint ? lastPoint.y : null,
            currentLineIndex: lineIndex
        };
        redoStack.push(currentState);
        
        // Get the previous state
        const previousState = undoStack.pop();
        
        // Restore the previous SVG content
        // First, remove the preview line to avoid duplication
        const previewLine = svg.querySelector('#preview-line');
        if (previewLine) {
            svg.removeChild(previewLine);
        }
        
        // Restore SVG content from undo stack
        svg.innerHTML = previousState.svgContent;
        
        // Restore last point and line index
        if (previousState.lastPointX !== null && previousState.lastPointY !== null) {
            lastPoint = { x: previousState.lastPointX, y: previousState.lastPointY };
        } else {
            lastPoint = null;
        }
        lineIndex = previousState.currentLineIndex;
        
        // Update the status message
        updateStatusMessage();
    }
    
    // Redo the previously undone action
    function redo() {
        if (redoStack.length === 0) return; // Nothing to redo
        
        // Store current state in undo stack before redoing
        const currentState = {
            svgContent: svg.innerHTML.replace(/<line[^>]*id="preview-line"[^>]*>.*?<\/line>/g, ''),
            lastPointX: lastPoint ? lastPoint.x : null,
            lastPointY: lastPoint ? lastPoint.y : null,
            currentLineIndex: lineIndex
        };
        undoStack.push(currentState);
        
        // Get the state to redo
        const redoState = redoStack.pop();
        
        // Restore the redo state
        // First, remove the preview line to avoid duplication
        const previewLine = svg.querySelector('#preview-line');
        if (previewLine) {
            svg.removeChild(previewLine);
        }
        
        // Restore SVG content from redo stack
        svg.innerHTML = redoState.svgContent;
        
        // Restore last point and line index
        if (redoState.lastPointX !== null && redoState.lastPointY !== null) {
            lastPoint = { x: redoState.lastPointX, y: redoState.lastPointY };
        } else {
            lastPoint = null;
        }
        lineIndex = redoState.currentLineIndex;
        
        // Update the status message
        updateStatusMessage();
    }
    
    // Update UI elements related to drawing mode
    function updateDrawingModeUI() {
        // Update button text and style to reflect current state
        const toggleButton = document.getElementById('toggleDrawing');
        if (toggleButton) {
            if (isDrawing) {
                toggleButton.textContent = 'Stop Drawing';
                toggleButton.classList.remove('red-light');
                toggleButton.classList.add('green-light');
            } else {
                toggleButton.textContent = 'Start Drawing';
                toggleButton.classList.remove('green-light');
                toggleButton.classList.add('red-light');
            }
        }
        
        // Update traffic light
        const lightIndicator = document.querySelector('.light-indicator');
        const lightText = document.querySelector('.light-text');
        
        if (lightIndicator && lightText) {
            if (isDrawing) {
                // Switch to green light
                lightIndicator.classList.remove('red');
                lightIndicator.classList.add('green');
                lightIndicator.innerHTML = '<i class="fas fa-pencil-alt"></i>';
                lightText.textContent = 'Drawing Mode: Active';
            } else {
                // Switch to red light
                lightIndicator.classList.remove('green');
                lightIndicator.classList.add('red');
                lightIndicator.innerHTML = '<i class="fas fa-hand"></i>';
                lightText.textContent = 'Drawing Mode: Paused';
            }
        }
        
        // Update status message
        updateStatusMessage();
    }
    
    // Update the status message
    function updateStatusMessage() {
        const statusElement = document.getElementById('status-message');
        if (statusElement) {
            if (isDrawing) {
                let statusText = lastPoint ? 'Press ESC to exit drawing mode' : 'Click to start drawing';
                
                // Add undo/redo info if available
                if (undoStack.length > 0 || redoStack.length > 0) {
                    statusText += ' | ';
                    if (undoStack.length > 0) {
                        statusText += 'Ctrl+Z to Undo';
                    }
                    if (redoStack.length > 0) {
                        if (undoStack.length > 0) statusText += ', ';
                        statusText += 'Ctrl+Y to Redo';
                    }
                }
                
                statusElement.textContent = statusText;
                statusElement.classList.remove('status-red');
                statusElement.classList.add('status-green');
            } else {
                statusElement.textContent = 'Click anywhere to resume drawing';
                statusElement.classList.remove('status-green');
                statusElement.classList.add('status-red');
            }
        }
    }
    
    // Clear all lines
    function clearDrawing() {
        // Save the current state before clearing
        saveToUndoStack();
        
        while (svg.firstChild) {
            svg.removeChild(svg.firstChild);
        }
        lastPoint = null;
        updateStatusMessage();
    }
    
    // Exit drawing mode (does NOT reset the last point so drawing can continue)
    function exitDrawingMode() {
        isDrawing = false;
        
        // Remove the preview line
        const previewLine = document.getElementById('preview-line');
        if (previewLine) previewLine.remove();
        
        updateDrawingModeUI();
    }
    
    // Toggle drawing mode on/off
    function toggleDrawingMode() {
        isDrawing = !isDrawing;
        updateDrawingModeUI();
    }
    
    // Handle keyboard events for shortcuts
    function handleKeyDown(e) {
        // Handle Escape key for exiting drawing mode
        if (e.key === 'Escape') {
            exitDrawingMode();
        }
        
        // Undo: Ctrl+Z
        if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault(); // Prevent browser's default undo
            undo();
            return;
        }
        
        // Redo: Ctrl+Y or Ctrl+Shift+Z
        if ((e.key === 'y' && (e.ctrlKey || e.metaKey)) || 
            (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey)) {
            e.preventDefault(); // Prevent browser's default redo
            redo();
            return;
        }
    }
    
    // Download the drawing as a PNG file
    function downloadDrawing() {
        // Remove the preview line if it exists
        const previewLine = document.getElementById('preview-line');
        if (previewLine) {
            previewLine.style.display = 'none';
        }
        
        // Create a canvas element with the same dimensions as the SVG
        const canvas = document.createElement('canvas');
        const svgWidth = parseInt(svg.getAttribute('width'));
        const svgHeight = parseInt(svg.getAttribute('height'));
        canvas.width = svgWidth;
        canvas.height = svgHeight;
        
        // Get the canvas context for drawing
        const ctx = canvas.getContext('2d');
        
        // Draw white background to make the PNG opaque
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, svgWidth, svgHeight);
        
        // Convert SVG to a data URL
        const svgData = new XMLSerializer().serializeToString(svg);
        const svgBlob = new Blob([svgData], {type: 'image/svg+xml;charset=utf-8'});
        const DOMURL = window.URL || window.webkitURL || window;
        const url = DOMURL.createObjectURL(svgBlob);
        
        // Create an image from the SVG
        const img = new Image();
        
        // When the image loads, draw it to the canvas and create the download link
        img.onload = function() {
            // Draw the image on the canvas
            ctx.drawImage(img, 0, 0);
            DOMURL.revokeObjectURL(url);
            
            // Convert canvas to PNG data URL
            try {
                const pngData = canvas.toDataURL('image/png');
                
                // Create download link
                const downloadLink = document.createElement('a');
                downloadLink.href = pngData;
                downloadLink.download = 'line-drawing.png';
                
                // Trigger download
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
                
                console.log('PNG download initiated successfully');
            } catch (e) {
                console.error('Error creating PNG:', e);
                alert('Could not create PNG file. Try using a different browser.');
            }
            
            // Show the preview line again if it existed
            if (previewLine) {
                previewLine.style.display = '';
            }
        };
        
        // Set the image source to start loading
        img.src = url;
    }
    
    // Set up event listeners
    svg.addEventListener('click', handleClick);
    svg.addEventListener('mousedown', handleMouseDown);
    svg.addEventListener('mouseup', handleMouseUp);
    svg.addEventListener('mousemove', handleMouseMove);
    // Listen for mouseup events outside the SVG
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('keydown', handleKeyDown);
    
    // Prevent context menu to avoid interference with right-click
    svg.addEventListener('contextmenu', function(e) {
        e.preventDefault();
    });
    
    // Function to update the active color scheme button
    function updateActiveColorScheme(newScheme) {
        colorScheme = newScheme;
        
        // Remove active class from all color scheme buttons
        const allColorButtons = document.querySelectorAll('.color-scheme-btn');
        allColorButtons.forEach(button => {
            button.classList.remove('active');
        });
        
        // Add active class to the selected button
        const activeButton = document.getElementById(`colorScheme${getColorSchemeNumber(newScheme)}`);
        if (activeButton) {
            activeButton.classList.add('active');
        }
    }
    
    // Helper function to get color scheme number from name
    function getColorSchemeNumber(schemeName) {
        const schemeMap = {
            'rainbow': 1,
            'ocean': 2,
            'fire': 3,
            'pastel': 4,
            'neon': 5,
            'forest': 6,
            'sunset': 7,
            'grayscale': 8,
            'earth': 9
        };
        return schemeMap[schemeName] || 1;
    }
    
    // Set up color scheme buttons
    document.getElementById('colorScheme1').addEventListener('click', () => {
        updateActiveColorScheme('rainbow');
    });
    
    document.getElementById('colorScheme2').addEventListener('click', () => {
        updateActiveColorScheme('ocean');
    });
    
    document.getElementById('colorScheme3').addEventListener('click', () => {
        updateActiveColorScheme('fire');
    });
    
    document.getElementById('colorScheme4').addEventListener('click', () => {
        updateActiveColorScheme('pastel');
    });
    
    document.getElementById('colorScheme5').addEventListener('click', () => {
        updateActiveColorScheme('neon');
    });
    
    document.getElementById('colorScheme6').addEventListener('click', () => {
        updateActiveColorScheme('forest');
    });
    
    document.getElementById('colorScheme7').addEventListener('click', () => {
        updateActiveColorScheme('sunset');
    });
    
    document.getElementById('colorScheme8').addEventListener('click', () => {
        updateActiveColorScheme('grayscale');
    });
    
    document.getElementById('colorScheme9').addEventListener('click', () => {
        updateActiveColorScheme('earth');
    });
    
    document.getElementById('clear').addEventListener('click', clearDrawing);
    
    // Set up toggle drawing button
    const toggleButton = document.getElementById('toggleDrawing');
    if (toggleButton) {
        toggleButton.addEventListener('click', toggleDrawingMode);
    }
    
    // Set up download button
    const downloadButton = document.getElementById('downloadButton');
    if (downloadButton) {
        downloadButton.addEventListener('click', downloadDrawing);
    }
    
    // Add undo/redo buttons to the UI
    const controlSection = document.querySelector('.button-group');
    if (controlSection) {
        const undoRedoContainer = document.createElement('div');
        undoRedoContainer.className = 'undo-redo-container';
        
        const undoButton = document.createElement('button');
        undoButton.innerHTML = '<i class="fas fa-undo"></i> Undo';
        undoButton.title = 'Undo (Ctrl+Z)';
        undoButton.addEventListener('click', undo);
        
        const redoButton = document.createElement('button');
        redoButton.innerHTML = '<i class="fas fa-redo"></i> Redo';
        redoButton.title = 'Redo (Ctrl+Y)';
        redoButton.addEventListener('click', redo);
        
        undoRedoContainer.appendChild(undoButton);
        undoRedoContainer.appendChild(redoButton);
        controlSection.appendChild(undoRedoContainer);
    }
    
    // Initialize status message
    updateStatusMessage();
    
    // Save initial empty state to undo stack
    saveToUndoStack();
    
    // Info panel functionality
    const infoButton = document.getElementById('infoButton');
    const infoPanel = document.getElementById('infoPanel');
    const closeInfo = document.getElementById('closeInfo');

    function toggleInfoPanel() {
        infoPanel.classList.toggle('active');
    }

    function closeInfoPanel() {
        infoPanel.classList.remove('active');
    }

    // Close info panel when clicking outside
    document.addEventListener('click', function(e) {
        if (!infoPanel.contains(e.target) && e.target !== infoButton) {
            closeInfoPanel();
        }
    });

    infoButton.addEventListener('click', function(e) {
        e.stopPropagation();
        toggleInfoPanel();
    });

    closeInfo.addEventListener('click', closeInfoPanel);

    // Add escape key handler for info panel
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeInfoPanel();
            // Also handle escape for drawing mode
            exitDrawingMode();
        }
    });
    
    // Initialize line width slider functionality
    const lineWidthSlider = document.getElementById('lineWidth');
    const lineWidthValue = document.getElementById('lineWidthValue');

    lineWidthSlider.addEventListener('input', function() {
        lineWidth = parseInt(this.value);
        lineWidthValue.textContent = lineWidth;
        
        // Update preview line if it exists
        const previewLine = document.getElementById('preview-line');
        if (previewLine) {
            previewLine.setAttribute('stroke-width', lineWidth);
        }
    });
});