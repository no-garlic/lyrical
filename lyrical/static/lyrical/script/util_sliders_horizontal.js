

/**
 * makes panels horizontally resizable using a splitter element
 * @param {HTMLElement} panelToResize - the panel that will be resized
 * @param {HTMLElement} splitter - the splitter element
 * @param {HTMLElement} leftOrUpPanel - the left panel that will be resized
 */
export function makeHorizontallyResizable(panelToResize, splitter, leftOrUpPanel) {
    let isResizing = false;

    splitter.addEventListener('mousedown', (e) => {
        handleMouseDown(e, panelToResize, splitter, leftOrUpPanel);
    });

    /**
     * handles mouse down event on the splitter
     * @param {MouseEvent} e - the mouse event
     * @param {HTMLElement} panelToResize - the panel that will be resized
     * @param {HTMLElement} splitter - the splitter element
     * @param {HTMLElement} leftOrUpPanel - the left panel that will be resized
     */
    function handleMouseDown(e, panelToResize, splitter, leftOrUpPanel) {
        isResizing = true;
        setupResizingState(panelToResize, leftOrUpPanel);
        
        const resizeData = initializeResizeData(e, panelToResize, leftOrUpPanel);
        const { onMouseMove, onMouseUp } = createMouseHandlers(resizeData, panelToResize, leftOrUpPanel);
        
        attachMouseEventListeners(onMouseMove, onMouseUp);
    }

    /**
     * sets up the resizing state and cursor styles
     * @param {HTMLElement} panelToResize - the panel that will be resized
     * @param {HTMLElement} leftOrUpPanel - the left panel that will be resized
     */
    function setupResizingState(panelToResize, leftOrUpPanel) {
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        panelToResize.style.userSelect = 'none';
        leftOrUpPanel.style.userSelect = 'none';
    }

    /**
     * initializes data needed for resizing calculations
     * @param {MouseEvent} e - the mouse event
     * @param {HTMLElement} panelToResize - the panel that will be resized
     * @param {HTMLElement} leftOrUpPanel - the left panel that will be resized
     * @returns {object} resize data object
     */
    function initializeResizeData(e, panelToResize, leftOrUpPanel) {
        return {
            initialMouseX: e.clientX,
            initialPanelWidth: panelToResize.offsetWidth,
            initialLeftPanelWidth: leftOrUpPanel.offsetWidth,
            minWidth: 50
        };
    }

    /**
     * creates mouse move and mouse up event handlers
     * @param {object} resizeData - resize data object
     * @param {HTMLElement} panelToResize - the panel that will be resized
     * @param {HTMLElement} leftOrUpPanel - the left panel that will be resized
     * @returns {object} object with onMouseMove and onMouseUp functions
     */
    function createMouseHandlers(resizeData, panelToResize, leftOrUpPanel) {
        const onMouseMove = (moveEvent) => {
            if (!isResizing) return;
            handleMouseMove(moveEvent, resizeData, panelToResize, leftOrUpPanel);
        };

        const onMouseUp = () => {
            if (!isResizing) return;
            handleMouseUp(panelToResize, leftOrUpPanel, onMouseMove, onMouseUp);
        };

        return { onMouseMove, onMouseUp };
    }

    /**
     * handles mouse move during resize
     * @param {MouseEvent} moveEvent - the mouse move event
     * @param {object} resizeData - resize data object
     * @param {HTMLElement} panelToResize - the panel that will be resized
     * @param {HTMLElement} leftOrUpPanel - the left panel that will be resized
     */
    function handleMouseMove(moveEvent, resizeData, panelToResize, leftOrUpPanel) {
        const deltaX = moveEvent.clientX - resizeData.initialMouseX;
        const newWidths = calculateNewWidths(deltaX, resizeData);
        
        if (!newWidths) return;
        
        applyNewWidths(leftOrUpPanel, panelToResize, newWidths);
    }

    /**
     * calculates new widths for panels during resize
     * @param {number} deltaX - horizontal mouse movement
     * @param {object} resizeData - resize data object
     * @returns {object|null} object with left and right widths, or null if invalid
     */
    function calculateNewWidths(deltaX, resizeData) {
        const newLeftPanelWidth = resizeData.initialLeftPanelWidth + deltaX;
        const newPanelWidth = resizeData.initialPanelWidth - deltaX;

        // check minimum width constraints
        if (newPanelWidth < resizeData.minWidth || newLeftPanelWidth < resizeData.minWidth) {
            return null;
        }

        return { left: newLeftPanelWidth, right: newPanelWidth };
    }

    /**
     * applies new widths to the panels
     * @param {HTMLElement} leftOrUpPanel - the left panel
     * @param {HTMLElement} panelToResize - the right panel
     * @param {object} newWidths - object with left and right widths
     */
    function applyNewWidths(leftOrUpPanel, panelToResize, newWidths) {
        leftOrUpPanel.style.flexBasis = `${newWidths.left}px`;
        panelToResize.style.flexBasis = `${newWidths.right}px`;
        leftOrUpPanel.style.flexGrow = '0';
        panelToResize.style.flexGrow = '0';
    }

    /**
     * handles mouse up event to end resizing
     * @param {HTMLElement} panelToResize - the panel that will be resized
     * @param {HTMLElement} leftOrUpPanel - the left panel that will be resized
     * @param {Function} onMouseMove - mouse move handler
     * @param {Function} onMouseUp - mouse up handler
     */
    function handleMouseUp(panelToResize, leftOrUpPanel, onMouseMove, onMouseUp) {
        isResizing = false;
        resetResizingState(panelToResize, leftOrUpPanel);
        applyFlexibilityToAllPanels(panelToResize, leftOrUpPanel);
        removeMouseEventListeners(onMouseMove, onMouseUp);
    }

    /**
     * resets the resizing state and cursor styles
     * @param {HTMLElement} panelToResize - the panel that will be resized
     * @param {HTMLElement} leftOrUpPanel - the left panel that will be resized
     */
    function resetResizingState(panelToResize, leftOrUpPanel) {
        document.body.style.cursor = 'default';
        document.body.style.userSelect = '';
        panelToResize.style.userSelect = '';
        leftOrUpPanel.style.userSelect = '';
    }

    /**
     * applies flexibility settings to all panels in the container
     * @param {HTMLElement} panelToResize - the panel that will be resized
     * @param {HTMLElement} leftOrUpPanel - the left panel that will be resized
     */
    function applyFlexibilityToAllPanels(panelToResize, leftOrUpPanel) {
        const container = panelToResize.parentElement;
        const flexiblePanels = Array.from(container.children).filter(child => 
            child.style.flexBasis !== undefined || 
            child === panelToResize || 
            child === leftOrUpPanel
        );
        
        const directlyResizedPanels = [leftOrUpPanel, panelToResize];
        const panelPixelWidths = {};

        // capture widths of non-directly-resized panels
        flexiblePanels.forEach(panel => {
            if (!directlyResizedPanels.includes(panel)) {
                panelPixelWidths[panel.id] = panel.offsetWidth;
            }
        });

        // apply flex properties to all panels
        flexiblePanels.forEach(panel => {
            if (panelPixelWidths[panel.id] !== undefined) {
                panel.style.flexBasis = panelPixelWidths[panel.id] + 'px';
            }
            panel.style.flexGrow = '1';
            panel.style.flexShrink = '1';
        });
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
