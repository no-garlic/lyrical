class DragDropSystem {
    constructor() {
        this.draggedItem = null;
        this.ghostElement = null;
        this.initialOffsetX = 0;
        this.initialOffsetY = 0;
        this.currentHoveredZoneForCallback = null; // Tracks the zone for enter/leave callbacks
        this.callbacks = {
            onDragStart: () => {},
            onDrop: () => {},
            canDrop: () => true,
            onDragEnterZone: () => {},
            onDragLeaveZone: () => {},
        };
    }

    init(callbacks = {}) {
        this.callbacks = { ...this.callbacks, ...callbacks };

        document.addEventListener('dragover', (event) => this._handleGlobalDragOver(event));
        document.addEventListener('drop', (event) => this._handleGlobalDrop(event));
        document.addEventListener('dragend', (event) => this._handleGlobalDragEnd(event));
    }

    registerDraggable(element, data = {}) {
        element.setAttribute('draggable', true);
        element.dataset.dragDropId = data.id || Math.random().toString(36).substring(7); // Ensure data has an id for the item
        element.addEventListener('dragstart', (event) => this._handleDragStart(event, element, data));
    }

    registerDropZone(element, data = { name: '', acceptedTypes: [] }) {
        element.dataset.dropZone = 'true';
        element.dataset.zoneName = data.name || element.id || '';
        element.dataset.acceptedTypes = JSON.stringify(data.acceptedTypes || []);
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
        document.body.classList.add('cursor-grabbing');
        document.body.classList.remove('cursor-no-drop'); // Ensure no-drop is not present

        if (this.callbacks.onDragStart) {
            this.callbacks.onDragStart(this.draggedItem, event);
        }
    }

    _handleGlobalDragOver(event) {
        event.preventDefault(); // Necessary to allow dropping

        if (!this.draggedItem || !this.ghostElement) {
            event.dataTransfer.dropEffect = 'none';
            return;
        }

        this._updateGhostPosition(event);

        // Temporarily hide ghost to correctly identify element underneath
        const originalGhostDisplay = this.ghostElement.style.display;
        this.ghostElement.style.display = 'none';
        const targetElement = document.elementFromPoint(event.clientX, event.clientY);
        this.ghostElement.style.display = originalGhostDisplay; // Restore ghost display

        const newHoveredZoneElement = this._getDropZoneUnderMouse(targetElement);

        // Manage onDragEnterZone and onDragLeaveZone callbacks
        if (this.currentHoveredZoneForCallback !== newHoveredZoneElement) {
            if (this.currentHoveredZoneForCallback) {
                if (this.callbacks.onDragLeaveZone) {
                    this.callbacks.onDragLeaveZone(this.draggedItem, { element: this.currentHoveredZoneForCallback, name: this.currentHoveredZoneForCallback.dataset.zoneName }, event);
                }
            }
            if (newHoveredZoneElement) {
                if (this.callbacks.onDragEnterZone) {
                    this.callbacks.onDragEnterZone(this.draggedItem, { element: newHoveredZoneElement, name: newHoveredZoneElement.dataset.zoneName }, event);
                }
            }
            this.currentHoveredZoneForCallback = newHoveredZoneElement;
        }

        // Determine drop effect and cursor
        if (newHoveredZoneElement) {
            const zoneData = { element: newHoveredZoneElement, name: newHoveredZoneElement.dataset.zoneName };
            if (this.callbacks.canDrop(this.draggedItem, zoneData, event)) {
                event.dataTransfer.dropEffect = 'move';
                document.body.classList.add('cursor-grabbing');
                document.body.classList.remove('cursor-no-drop');
            } else {
                event.dataTransfer.dropEffect = 'none';
                document.body.classList.add('cursor-no-drop');
                document.body.classList.remove('cursor-grabbing');
            }
        } else {
            // Not over any registered drop zone
            event.dataTransfer.dropEffect = 'none';
            document.body.classList.add('cursor-no-drop');
            document.body.classList.remove('cursor-grabbing');
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

    _handleGlobalDrop(event) {
        event.preventDefault();

        if (!this.draggedItem) {
            return; // Should ideally be cleaned up by dragend
        }

        // Use the zone identified by the last dragover event
        const dropZoneElement = this.currentHoveredZoneForCallback;

        if (dropZoneElement) {
            const zoneData = { element: dropZoneElement, name: dropZoneElement.dataset.zoneName };
            // Final check, though dragover should have set dropEffect appropriately
            if (this.callbacks.canDrop(this.draggedItem, zoneData, event)) {
                if (this.callbacks.onDrop) {
                    this.callbacks.onDrop(this.draggedItem, zoneData, event);
                }
            } else {
                console.warn("Drop attempted on a zone where canDrop is false. This should ideally be prevented by dragover's dropEffect.");
            }
        } else {
            console.log("Dropped outside of a valid zone.");
        }
        // Actual cleanup of visual state (ghost, original item opacity) is handled in _handleGlobalDragEnd
    }

    _handleGlobalDragEnd(event) {
        if (this.draggedItem && this.draggedItem.element) {
            this.draggedItem.element.classList.remove('opacity-50');
        }
        if (this.ghostElement) {
            this.ghostElement.remove();
            this.ghostElement = null;
        }

        // If drag ends (successfully or not) while over a zone, call onDragLeaveZone
        if (this.currentHoveredZoneForCallback) {
             if (this.callbacks.onDragLeaveZone) {
                // Pass the item that was being dragged and the zone it was last over
                this.callbacks.onDragLeaveZone(this.draggedItem, { element: this.currentHoveredZoneForCallback, name: this.currentHoveredZoneForCallback.dataset.zoneName }, event);
            }
        }

        document.body.classList.remove('cursor-grabbing');
        document.body.classList.remove('cursor-no-drop');
        this.draggedItem = null;
        this.currentHoveredZoneForCallback = null; // Reset this tracker
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
        document.body.classList.remove('cursor-grabbing');
        document.body.classList.remove('cursor-no-drop');

        // Remove drag-over from all potential zones
        document.querySelectorAll('[data-drop-zone="true"]').forEach(dz => dz.classList.remove('drag-over'));
    }
}
