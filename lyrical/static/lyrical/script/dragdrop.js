class DragDropSystem {
    constructor() {
        this.draggedItem = null;
        this.ghostElement = null;
        this.initialOffsetX = 0;
        this.initialOffsetY = 0;
        this.callbacks = {
            onDragStart: () => {},
            onDrop: () => {},
            canDrop: () => true,
            onDragEnterZone: () => {},
            onDragLeaveZone: () => {},
        };
    }

    init(callbacks = {}) {
        Object.assign(this.callbacks, callbacks);
        document.addEventListener('dragover', (e) => this._handleGlobalDragOver(e));
        document.addEventListener('drop', (e) => this._handleGlobalDrop(e));
        document.addEventListener('dragend', (e) => this._handleGlobalDragEnd(e));
    }

    registerDraggable(element, data = {}) {
        element.draggable = true;
        element.dataset.dragDropId = data.id || Math.random().toString(36).substring(7);
        element.addEventListener('dragstart', (e) => this._handleDragStart(e, element, data));
    }

    registerDropZone(element, acceptedTypes = []) {
        element.dataset.dropZone = 'true';
        element.dataset.acceptedTypes = JSON.stringify(acceptedTypes);

        element.addEventListener('dragenter', (e) => this._handleDragEnter(e, element));
        element.addEventListener('dragleave', (e) => this._handleDragLeave(e, element));
        // dragover and drop are handled globally to allow ghost element positioning
    }

    _createGhostElement(originalElement) {
        if (this.ghostElement) {
            this.ghostElement.remove();
        }
        this.ghostElement = originalElement.cloneNode(true);
        this.ghostElement.style.position = 'absolute';
        this.ghostElement.style.pointerEvents = 'none';
        this.ghostElement.style.opacity = '0.75';
        this.ghostElement.style.zIndex = '1000';
        this.ghostElement.classList.add('dragging-ghost'); // For additional styling
        this.ghostElement.style.width = `${originalElement.offsetWidth}px`;
        this.ghostElement.style.height = `${originalElement.offsetHeight}px`;
        document.body.appendChild(this.ghostElement);
    }

    _updateGhostPosition(event) {
        if (this.ghostElement) {
            this.ghostElement.style.left = `${event.pageX - this.initialOffsetX}px`;
            this.ghostElement.style.top = `${event.pageY - this.initialOffsetY}px`;
        }
    }

    _handleDragStart(event, itemElement, itemData) {
        this.draggedItem = { element: itemElement, data: itemData };
        event.dataTransfer.effectAllowed = 'move';
        // Use a transparent image as drag image to hide default browser ghost
        const img = new Image();
        img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        event.dataTransfer.setDragImage(img, 0, 0);

        this._createGhostElement(itemElement);

        // Calculate offset from the center of the ghost element
        this.initialOffsetX = this.ghostElement.offsetWidth / 2;
        this.initialOffsetY = this.ghostElement.offsetHeight / 2;

        this._updateGhostPosition(event); // Initial position

        itemElement.classList.add('opacity-50'); // Indicate the original item is being dragged
        document.body.style.cursor = 'grabbing';

        if (this.callbacks.onDragStart) {
            this.callbacks.onDragStart(this.draggedItem, event);
        }
    }

    _handleGlobalDragOver(event) {
        event.preventDefault(); // Necessary to allow dropping
        this._updateGhostPosition(event);
        document.body.style.cursor = 'grabbing';

        const dropZone = this._getDropZoneUnderMouse(event.target);
        if (dropZone) {
            if (this.callbacks.canDrop && this.callbacks.canDrop(this.draggedItem, dropZone, event)) {
                event.dataTransfer.dropEffect = 'move';
                dropZone.classList.add('drag-over'); // Visual feedback for valid drop target
            } else {
                event.dataTransfer.dropEffect = 'none';
                dropZone.classList.remove('drag-over');
            }
        } else {
             event.dataTransfer.dropEffect = 'none';
        }
    }

    _getDropZoneUnderMouse(targetElement) {
        let currentElement = targetElement;
        while (currentElement) {
            if (currentElement.dataset && currentElement.dataset.dropZone === 'true') {
                return currentElement;
            }
            currentElement = currentElement.parentElement;
        }
        return null;
    }


    _handleDragEnter(event, zoneElement) {
        event.preventDefault();
        if (!this.draggedItem) return;

        const canDrop = this.callbacks.canDrop ? this.callbacks.canDrop(this.draggedItem, zoneElement, event) : true;
        if (canDrop) {
            zoneElement.classList.add('drag-over');
            if (this.callbacks.onDragEnterZone) {
                this.callbacks.onDragEnterZone(this.draggedItem, zoneElement, event);
            }
        }
    }

    _handleDragLeave(event, zoneElement) {
        event.preventDefault();
        if (!this.draggedItem) return;

        // Check if the mouse is still over a child of the zoneElement or the zoneElement itself
        if (!zoneElement.contains(event.relatedTarget) && event.target === zoneElement) {
            zoneElement.classList.remove('drag-over');
            if (this.callbacks.onDragLeaveZone) {
                this.callbacks.onDragLeaveZone(this.draggedItem, zoneElement, event);
            }
        }
    }

    _handleGlobalDrop(event) {
        event.preventDefault();
        const dropZone = this._getDropZoneUnderMouse(event.target);

        if (this.draggedItem && dropZone) {
            dropZone.classList.remove('drag-over');
            if (this.callbacks.canDrop && this.callbacks.canDrop(this.draggedItem, dropZone, event)) {
                // Move the original dragged item to the new parent (dropZone)
                // The actual DOM manipulation might be handled by the onDrop callback
                // For example, if the dropZone is a container for these items.
                // dropZone.appendChild(this.draggedItem.element);

                if (this.callbacks.onDrop) {
                    this.callbacks.onDrop(this.draggedItem, dropZone, event);
                }
            }
        }
        this._cleanupDragState();
    }

    _handleGlobalDragEnd(event) {
        this._cleanupDragState();
    }

    _cleanupDragState() {
        if (this.draggedItem && this.draggedItem.element) {
            this.draggedItem.element.classList.remove('opacity-50');
        }
        if (this.ghostElement) {
            this.ghostElement.remove();
            this.ghostElement = null;
        }
        this.draggedItem = null;
        document.body.style.cursor = 'default';

        // Remove drag-over from all potential zones
        document.querySelectorAll('[data-drop-zone="true"]').forEach(dz => dz.classList.remove('drag-over'));
    }
}

// Export if using modules, otherwise it's globally available
// export default DragDropSystem;
