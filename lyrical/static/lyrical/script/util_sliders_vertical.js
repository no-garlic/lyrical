

/**
 * makes panels vertically resizable using a splitter element
 * @param {HTMLElement} topPanel - the top panel element
 * @param {HTMLElement} splitter - the splitter element
 * @param {HTMLElement} bottomPanel - the bottom panel element
 * @param {object} options - configuration options
 * @param {boolean} options.autoSizeToFitBottomContent - if true, initially size to fit bottom panel content
 */
export function makeVerticallyResizable(topPanel, splitter, bottomPanel, options = {}) {
    let isResizing = false;

    splitter.addEventListener('mousedown', (e) => {
        handleMouseDown(e, topPanel, splitter, bottomPanel);
    });

    // Auto-size to fit bottom content if requested
    if (options.autoSizeToFitBottomContent) {
        initializeAutoSizing(topPanel, splitter, bottomPanel);
    }

    /**
     * handles mouse down event on the splitter
     * @param {MouseEvent} e - the mouse event
     * @param {HTMLElement} topPanel - the top panel element
     * @param {HTMLElement} splitter - the splitter element
     * @param {HTMLElement} bottomPanel - the bottom panel element
     */
    function handleMouseDown(e, topPanel, splitter, bottomPanel) {
        isResizing = true;
        setupResizingState(topPanel, bottomPanel);
        
        const resizeData = initializeResizeData(e, topPanel, bottomPanel, splitter);
        const { onMouseMove, onMouseUp } = createMouseHandlers(resizeData, topPanel, bottomPanel);
        
        attachMouseEventListeners(onMouseMove, onMouseUp);
    }

    /**
     * sets up the resizing state and cursor styles
     * @param {HTMLElement} topPanel - the top panel element
     * @param {HTMLElement} bottomPanel - the bottom panel element
     */
    function setupResizingState(topPanel, bottomPanel) {
        document.body.style.cursor = 'row-resize';
        document.body.style.userSelect = 'none';
        topPanel.style.userSelect = 'none';
        bottomPanel.style.userSelect = 'none';
    }

    /**
     * initializes data needed for resizing calculations
     * @param {MouseEvent} e - the mouse event
     * @param {HTMLElement} topPanel - the top panel element
     * @param {HTMLElement} bottomPanel - the bottom panel element
     * @param {HTMLElement} splitter - the splitter element
     * @returns {object} resize data object
     */
    function initializeResizeData(e, topPanel, bottomPanel, splitter) {
        const container = topPanel.parentElement;
        const totalHeight = container.offsetHeight - splitter.offsetHeight;
        
        return {
            initialMouseY: e.clientY,
            initialTopPanelHeight: topPanel.offsetHeight,
            initialBottomPanelHeight: bottomPanel.offsetHeight,
            totalHeight: totalHeight,
            minHeight: 50
        };
    }

    /**
     * creates mouse move and mouse up event handlers
     * @param {object} resizeData - resize data object
     * @param {HTMLElement} topPanel - the top panel element
     * @param {HTMLElement} bottomPanel - the bottom panel element
     * @returns {object} object with onMouseMove and onMouseUp functions
     */
    function createMouseHandlers(resizeData, topPanel, bottomPanel) {
        const onMouseMove = (moveEvent) => {
            if (!isResizing) return;
            handleMouseMove(moveEvent, resizeData, topPanel, bottomPanel);
        };

        const onMouseUp = () => {
            if (!isResizing) return;
            handleMouseUp(topPanel, bottomPanel, onMouseMove, onMouseUp);
        };

        return { onMouseMove, onMouseUp };
    }

    /**
     * handles mouse move during resize
     * @param {MouseEvent} moveEvent - the mouse move event
     * @param {object} resizeData - resize data object
     * @param {HTMLElement} topPanel - the top panel element
     * @param {HTMLElement} bottomPanel - the bottom panel element
     */
    function handleMouseMove(moveEvent, resizeData, topPanel, bottomPanel) {
        const deltaY = moveEvent.clientY - resizeData.initialMouseY;
        const newHeights = calculateNewHeights(deltaY, resizeData);
        
        topPanel.style.height = `${newHeights.top}px`;
        bottomPanel.style.height = `${newHeights.bottom}px`;
    }

    /**
     * calculates new heights for panels during resize
     * @param {number} deltaY - vertical mouse movement
     * @param {object} resizeData - resize data object
     * @returns {object} object with top and bottom heights
     */
    function calculateNewHeights(deltaY, resizeData) {
        let newTopPanelHeight = resizeData.initialTopPanelHeight + deltaY;
        let newBottomPanelHeight = resizeData.initialBottomPanelHeight - deltaY;

        // ensure panels don't collapse beyond minimum height
        if (newTopPanelHeight < resizeData.minHeight) {
            newTopPanelHeight = resizeData.minHeight;
            newBottomPanelHeight = resizeData.totalHeight - newTopPanelHeight;
        }
        if (newBottomPanelHeight < resizeData.minHeight) {
            newBottomPanelHeight = resizeData.minHeight;
            newTopPanelHeight = resizeData.totalHeight - newBottomPanelHeight;
        }

        // ensure panels don't exceed total available height
        if (newTopPanelHeight + newBottomPanelHeight > resizeData.totalHeight) {
            if (deltaY > 0) {
                newBottomPanelHeight = resizeData.totalHeight - newTopPanelHeight;
            } else {
                newTopPanelHeight = resizeData.totalHeight - newBottomPanelHeight;
            }
        }

        return { top: newTopPanelHeight, bottom: newBottomPanelHeight };
    }

    /**
     * handles mouse up event to end resizing
     * @param {HTMLElement} topPanel - the top panel element
     * @param {HTMLElement} bottomPanel - the bottom panel element
     * @param {Function} onMouseMove - mouse move handler
     * @param {Function} onMouseUp - mouse up handler
     */
    function handleMouseUp(topPanel, bottomPanel, onMouseMove, onMouseUp) {
        isResizing = false;
        resetResizingState(topPanel, bottomPanel);
        removeMouseEventListeners(onMouseMove, onMouseUp);
    }

    /**
     * resets the resizing state and cursor styles
     * @param {HTMLElement} topPanel - the top panel element
     * @param {HTMLElement} bottomPanel - the bottom panel element
     */
    function resetResizingState(topPanel, bottomPanel) {
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        topPanel.style.userSelect = '';
        bottomPanel.style.userSelect = '';
    }

    /**
     * attaches mouse event listeners
     * @param {Function} onMouseMove - mouse move handler
     * @param {Function} onMouseUp - mouse up handler
     */
    function attachMouseEventListeners(onMouseMove, onMouseUp) {
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }

    /**
     * removes mouse event listeners
     * @param {Function} onMouseMove - mouse move handler
     * @param {Function} onMouseUp - mouse up handler
     */
    function removeMouseEventListeners(onMouseMove, onMouseUp) {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }

    /**
     * initializes auto-sizing to fit bottom panel content
     * @param {HTMLElement} topPanel - the top panel element
     * @param {HTMLElement} splitter - the splitter element
     * @param {HTMLElement} bottomPanel - the bottom panel element
     */
    function initializeAutoSizing(topPanel, splitter, bottomPanel) {
        // Wait for DOM to be fully laid out
        setTimeout(() => {
            const container = topPanel.parentElement;
            const containerHeight = container.offsetHeight;
            const splitterHeight = splitter.offsetHeight;
            
            // Get the natural height of the bottom panel content
            const bottomContent = bottomPanel.firstElementChild;
            if (!bottomContent) return;
            
            // Temporarily remove height constraints to measure natural content height
            const originalBottomHeight = bottomPanel.style.height;
            const originalTopHeight = topPanel.style.height;
            
            bottomPanel.style.height = 'auto';
            topPanel.style.height = 'auto';
            
            const naturalBottomHeight = bottomContent.scrollHeight;
            const availableHeight = containerHeight - splitterHeight;
            const minTopHeight = 100; // Minimum height for top panel
            
            // Calculate optimal heights
            let bottomHeight = Math.min(naturalBottomHeight, availableHeight - minTopHeight);
            let topHeight = availableHeight - bottomHeight;
            
            // Ensure we don't make the top panel too small
            if (topHeight < minTopHeight) {
                topHeight = minTopHeight;
                bottomHeight = availableHeight - topHeight;
            }
            
            // Apply the calculated heights
            topPanel.style.height = `${topHeight}px`;
            bottomPanel.style.height = `${bottomHeight}px`;
        }, 0);
    }
}

