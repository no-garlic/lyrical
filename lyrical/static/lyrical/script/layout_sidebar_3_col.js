
document.addEventListener('DOMContentLoaded', () => {
    const panel1 = document.getElementById('panel1');
    const panel2 = document.getElementById('panel2');
    const panel3 = document.getElementById('panel3');

    const splitter1 = document.getElementById('splitter1');
    const splitter2 = document.getElementById('splitter2');

    makeResizable(panel2, splitter1, panel1, false);
    makeResizable(panel3, splitter2, panel2, false);
});

function makeResizable(panelToResize, splitter, leftOrUpPanel, isResizingLeftPanel) {
    let isResizing = false;

    splitter.addEventListener('mousedown', (e) => {
        isResizing = true;
        document.body.style.cursor = 'col-resize'; // Change cursor for the whole body
        // Prevent text selection during resize
        document.body.style.userSelect = 'none';
        panelToResize.style.userSelect = 'none';
        leftOrUpPanel.style.userSelect = 'none';

        // Store initial positions and dimensions
        const initialMouseX = e.clientX;
        const initialPanelWidth = panelToResize.offsetWidth;
        const initialLeftPanelWidth = leftOrUpPanel.offsetWidth;

        const container = panelToResize.parentElement;
        const totalWidth = container.offsetWidth;

        const onMouseMove = (moveEvent) => {
            if (!isResizing) return;

            const deltaX = moveEvent.clientX - initialMouseX;
            let newPanelWidth, newLeftPanelWidth;

            if (isResizingLeftPanel) { // This case is for when the panel to the *left* of the splitter is the one being directly resized by the splitter
                newPanelWidth = initialPanelWidth - deltaX;
            } else {
                newLeftPanelWidth = initialLeftPanelWidth + deltaX;
                newPanelWidth = initialPanelWidth - deltaX;
            }

            // Basic boundary checks (e.g., min width for panels)
            const minWidth = 50; // Minimum width in pixels

            if (newPanelWidth < minWidth || (newLeftPanelWidth && newLeftPanelWidth < minWidth)) {
                return; // Don't resize if it makes a panel too small
            }

            if (isResizingLeftPanel) {
                panelToResize.style.flexBasis = `${newPanelWidth}px`;
                panelToResize.style.flexGrow = '0'; // Stop it from growing to fill space if others shrink
            } else {
                leftOrUpPanel.style.flexBasis = `${newLeftPanelWidth}px`;
                panelToResize.style.flexBasis = `${newPanelWidth}px`;
                leftOrUpPanel.style.flexGrow = '0';
                panelToResize.style.flexGrow = '0';
            }
        };

        const onMouseUp = () => {
            if (!isResizing) return;
            isResizing = false;
            document.body.style.cursor = 'default'; // Reset cursor
            document.body.style.userSelect = ''; // Re-enable text selection for the whole body
            panelToResize.style.userSelect = '';
            leftOrUpPanel.style.userSelect = '';

            const flexiblePanels = [panel1, panel2, panel3];
            const directlyResizedPanels = [leftOrUpPanel, panelToResize];
            const panelPixelWidths = {};

            // First pass: Capture offsetWidths of non-directly-resized panels
            // This happens while the directly resized panels still have flex-grow: 0
            flexiblePanels.forEach(panel => {
                if (!directlyResizedPanels.includes(panel)) {
                    panelPixelWidths[panel.id] = panel.offsetWidth;
                }
            });

            // Second pass: Apply flex-basis and then set all to be flexible
            flexiblePanels.forEach(panel => {
                if (panelPixelWidths[panel.id] !== undefined) {
                    panel.style.flexBasis = panelPixelWidths[panel.id] + 'px';
                }
                // For panels that were directly resized, their flex-basis was already set by onMouseMove.
                // For all flexible panels, ensure they are set to be flexible.
                panel.style.flexGrow = '1';
                panel.style.flexShrink = '1';
            });

            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });
}
