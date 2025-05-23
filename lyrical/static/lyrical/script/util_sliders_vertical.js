
export function makeVerticallyResizable(topPanel, splitter, bottomPanel) {
    let isResizing = false;

    splitter.addEventListener('mousedown', (e) => {
        isResizing = true;
        document.body.style.cursor = 'row-resize'; // Change cursor for the whole body
        // Prevent text selection during resize
        document.body.style.userSelect = 'none';
        topPanel.style.userSelect = 'none';
        bottomPanel.style.userSelect = 'none';

        // Store initial positions and dimensions
        const initialMouseY = e.clientY;
        const initialTopPanelHeight = topPanel.offsetHeight;
        const initialBottomPanelHeight = bottomPanel.offsetHeight;

        const container = topPanel.parentElement;
        const totalHeight = container.offsetHeight - splitter.offsetHeight; // Subtract splitter height

        const onMouseMove = (moveEvent) => {
            if (!isResizing) return;

            const deltaY = moveEvent.clientY - initialMouseY;
            let newTopPanelHeight = initialTopPanelHeight + deltaY;
            let newBottomPanelHeight = initialBottomPanelHeight - deltaY;

            // Ensure panels don't collapse beyond a minimum height (e.g., 50px)
            const minHeight = 50;
            if (newTopPanelHeight < minHeight) {
                newTopPanelHeight = minHeight;
                newBottomPanelHeight = totalHeight - newTopPanelHeight;
            }
            if (newBottomPanelHeight < minHeight) {
                newBottomPanelHeight = minHeight;
                newTopPanelHeight = totalHeight - newBottomPanelHeight;
            }

            // Ensure panels don't exceed the total available height
            if (newTopPanelHeight + newBottomPanelHeight > totalHeight) {
                if (deltaY > 0) { // dragging down
                    newBottomPanelHeight = totalHeight - newTopPanelHeight;
                } else { // dragging up
                    newTopPanelHeight = totalHeight - newBottomPanelHeight;
                }
            }


            topPanel.style.height = `${newTopPanelHeight}px`;
            bottomPanel.style.height = `${newBottomPanelHeight}px`;
        };

        const onMouseUp = () => {
            if (!isResizing) return;
            isResizing = false;
            document.body.style.cursor = ''; // Reset cursor
            document.body.style.userSelect = '';
            topPanel.style.userSelect = '';
            bottomPanel.style.userSelect = '';

            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });
}

