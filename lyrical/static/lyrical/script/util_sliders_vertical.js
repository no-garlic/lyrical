

/**
 * makes panels vertically resizable using a splitter element with absolute positioning
 * @param {HTMLElement} topPanel - the top panel element
 * @param {HTMLElement} splitter - the splitter element
 * @param {HTMLElement} bottomPanel - the bottom panel element
 */
export function makeVerticallyResizable(topPanel, splitter, bottomPanel) {
    let isResizing = false;

    // initialize panel positions
    initializePanelPositions(topPanel, splitter, bottomPanel);

    splitter.addEventListener('mousedown', (e) => {
        handleMouseDown(e, topPanel, splitter, bottomPanel);
    });

    /**
     * initializes panel positions for absolute layout
     * @param {HTMLElement} topPanel - the top panel element
     * @param {HTMLElement} splitter - the splitter element
     * @param {HTMLElement} bottomPanel - the bottom panel element
     */
    function initializePanelPositions(topPanel, splitter, bottomPanel) {
        const container = topPanel.parentElement;
        const containerHeight = container.offsetHeight;
        const splitterHeight = splitter.offsetHeight;
        
        // set initial positions - slider at 60% of container height
        const initialSliderTop = Math.floor(containerHeight * 0.6);
        
        topPanel.style.top = '0px';
        topPanel.style.height = `${initialSliderTop}px`;
        
        splitter.style.top = `${initialSliderTop}px`;
        splitter.style.height = `${splitterHeight}px`;
        
        bottomPanel.style.top = `${initialSliderTop + splitterHeight}px`;
        bottomPanel.style.height = `${containerHeight - initialSliderTop - splitterHeight}px`;
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
        const { onMouseMove, onMouseUp } = createMouseHandlers(resizeData, topPanel, bottomPanel, splitter);
        
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
        const containerHeight = container.offsetHeight;
        const splitterHeight = splitter.offsetHeight;
        
        return {
            initialMouseY: e.clientY,
            initialSliderTop: parseInt(splitter.style.top) || splitter.offsetTop,
            containerHeight: containerHeight,
            splitterHeight: splitterHeight,
            minHeight: 50
        };
    }

    /**
     * creates mouse move and mouse up event handlers
     * @param {object} resizeData - resize data object
     * @param {HTMLElement} topPanel - the top panel element
     * @param {HTMLElement} bottomPanel - the bottom panel element
     * @param {HTMLElement} splitter - the splitter element
     * @returns {object} object with onMouseMove and onMouseUp functions
     */
    function createMouseHandlers(resizeData, topPanel, bottomPanel, splitter) {
        const onMouseMove = (moveEvent) => {
            if (!isResizing) return;
            handleMouseMove(moveEvent, resizeData, topPanel, bottomPanel, splitter);
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
     * @param {HTMLElement} splitter - the splitter element
     */
    function handleMouseMove(moveEvent, resizeData, topPanel, bottomPanel, splitter) {
        const deltaY = moveEvent.clientY - resizeData.initialMouseY;
        const newPositions = calculateNewPositions(deltaY, resizeData);
        
        // update positions
        topPanel.style.height = `${newPositions.topHeight}px`;
        splitter.style.top = `${newPositions.sliderTop}px`;
        bottomPanel.style.top = `${newPositions.bottomTop}px`;
        bottomPanel.style.height = `${newPositions.bottomHeight}px`;
    }

    /**
     * calculates new positions for panels during resize
     * @param {number} deltaY - vertical mouse movement
     * @param {object} resizeData - resize data object
     * @returns {object} object with new positions and heights
     */
    function calculateNewPositions(deltaY, resizeData) {
        let newSliderTop = resizeData.initialSliderTop + deltaY;
        
        // constrain slider position within bounds
        const maxSliderTop = resizeData.containerHeight - resizeData.splitterHeight - resizeData.minHeight;
        newSliderTop = Math.max(resizeData.minHeight, Math.min(newSliderTop, maxSliderTop));
        
        const topHeight = newSliderTop;
        const bottomTop = newSliderTop + resizeData.splitterHeight;
        const bottomHeight = resizeData.containerHeight - bottomTop;
        
        return {
            topHeight: topHeight,
            sliderTop: newSliderTop,
            bottomTop: bottomTop,
            bottomHeight: bottomHeight
        };
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
}

