/**
 * Drag and drop system for managing draggable items and drop zones
 */
export class DragDropSystem {
    /**
     * Creates a new DragDropSystem instance
     * @param {object} [initialConfig={}] - Initial configuration options
     * @param {object} [initialCallbacks={}] - Initial callback functions
     */
    constructor(initialConfig = {}, initialCallbacks = {}) {
        this.config = {
            insertElementOnDrop: true,
            ...initialConfig
        };
        this.draggedItem = null;
        this.ghostElement = null;
        this.initialOffsetX = 0;
        this.initialOffsetY = 0;
        this.currentHoveredZoneForCallback = null;
        this.draggableItems = new Map(); // Registry of all draggable items and their data
        this.callbacks = {
            onDragStart: () => {},
            onDrop: () => {},
            canDrop: () => true,
            onDragEnterZone: () => {},
            onDragLeaveZone: () => {},
            ...initialCallbacks
        };

        this.dragPreviewCanvas = this._createDragPreviewCanvas();
    }

    /**
     * Creates a transparent canvas for drag preview
     * @returns {HTMLCanvasElement} The canvas element
     * @private
     */
    _createDragPreviewCanvas() {
        const canvas = document.createElement('canvas');
        canvas.width = 10;
        canvas.height = 10;
        canvas.style.position = 'absolute';
        canvas.style.left = '-9999px';
        canvas.style.top = '-9999px';
        document.body.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            //console.log('drag preview canvas is now transparent.');
        }

        return canvas;
    }

    /**
     * Initializes the drag drop system with callbacks
     * @param {object} [callbacks={}] - Callback functions for drag events
     */
    init(callbacks = {}) {
        this.callbacks = { ...this.callbacks, ...callbacks };
        this._attachGlobalEventListeners();
    }

    /**
     * Attaches global event listeners for drag operations
     * @private
     */
    _attachGlobalEventListeners() {
        document.addEventListener('dragover', (event) => this._handleGlobalDragOver(event));
        document.addEventListener('drop', (event) => this._handleGlobalDrop(event));
        document.addEventListener('dragend', (event) => this._handleGlobalDragEnd(event));
    }

    /**
     * Registers an element as draggable
     * @param {HTMLElement} element - The element to make draggable
     * @param {object} [data={}] - Data associated with the draggable item
     */
    registerDraggable(element, data = {}) {
        element.setAttribute('draggable', true);
        element.dataset.dragDropId = data.id || Math.random().toString(36).substring(7);
        
        // Store in registry for later data updates
        this.draggableItems.set(element, { ...data });
        
        element.addEventListener('dragstart', (event) => this._handleDragStart(event, element));
    }

    /**
     * Unregisters an element as draggable
     * @param {HTMLElement} element - The element to remove draggable functionality from
     */
    unregisterDraggable(element) {
        element.removeAttribute('draggable');
        element.removeEventListener('dragstart', (event) => this._handleDragStart(event, element));
        element.classList.remove('opacity-50');
        
        // Remove from registry
        this.draggableItems.delete(element);
    }

    /**
     * Registers an element as a drop zone
     * @param {HTMLElement} element - The element to make a drop zone
     * @param {object} [data={}] - Configuration for the drop zone
     */
    registerDropZone(element, data = { name: '', acceptedTypes: [] }) {
        element.dataset.dropZone = 'true';
        element.dataset.zoneName = data.name || element.id || '';
        element.dataset.acceptedTypes = JSON.stringify(data.acceptedTypes || []);
    }

    /**
     * Updates data for a registered draggable element
     * @param {HTMLElement} element - The draggable element to update data for
     * @param {object} updates - Object containing data properties to update
     * @returns {boolean} True if element was found and updated, false otherwise
     */
    updateItemData(element, updates = {}) {
        if (!this.draggableItems.has(element)) {
            console.warn('Cannot update data for element - element is not registered as draggable');
            return false;
        }
        
        const currentData = this.draggableItems.get(element);
        const updatedData = { ...currentData, ...updates };
        this.draggableItems.set(element, updatedData);
        
        return true;
    }

    /**
     * Creates a ghost element for visual drag feedback
     * @param {HTMLElement} originalElement - The original element being dragged
     * @private
     */
    _createGhostElement(originalElement) {
        if (this.ghostElement) {
            this.ghostElement.remove();
        }
        this.ghostElement = originalElement.cloneNode(true);
        this.ghostElement.style.position = 'absolute';
        this.ghostElement.style.left = '-9999px';
        this.ghostElement.style.top = '-9999px';
        this.ghostElement.style.pointerEvents = 'none';
        this.ghostElement.style.opacity = '0.75';
        this.ghostElement.style.zIndex = '1000';
        this.ghostElement.classList.add('dragging-ghost');
        this.ghostElement.style.width = `${originalElement.offsetWidth}px`;
        this.ghostElement.style.height = `${originalElement.offsetHeight}px`;
        document.body.appendChild(this.ghostElement);
    }

    /**
     * Updates the position of the ghost element
     * @param {DragEvent} event - The drag event
     * @private
     */
    _updateGhostPosition(event) {
        if (this.ghostElement) {
            this.ghostElement.style.left = `${event.pageX - this.initialOffsetX}px`;
            this.ghostElement.style.top = `${event.pageY - this.initialOffsetY}px`;
        }
    }

    /**
     * Handles the drag start event
     * @param {DragEvent} event - The drag start event
     * @param {HTMLElement} itemElement - The element being dragged
     * @private
     */
    _handleDragStart(event, itemElement) {
        const itemData = this.draggableItems.get(itemElement) || {};
        this.draggedItem = { element: itemElement, data: itemData };
        event.dataTransfer.setData('text/plain', itemData.id || itemElement.dataset.dragDropId || 'draggable_item');
        event.dataTransfer.effectAllowed = 'move';

        try {
            event.dataTransfer.setDragImage(this.dragPreviewCanvas, 0, 0);
            console.log('setting drag image to transparent pre-rendered canvas.');
        } catch (e) {
            console.error("failed to set drag image with pre-rendered canvas:", e);
            const img = new Image();
            img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
            event.dataTransfer.setDragImage(img, 0, 0);
        }

        this._createGhostElement(itemElement);

        this.initialOffsetX = this.ghostElement.offsetWidth / 2;
        this.initialOffsetY = this.ghostElement.offsetHeight / 2;

        this._updateGhostPosition(event);

        itemElement.classList.add('opacity-50');
        document.body.classList.add('cursor-grabbing');
        document.body.classList.remove('cursor-no-drop');
        
        this.draggedItem.element.classList.add('opacity-50');

        if (this.callbacks.onDragStart) {
            this.callbacks.onDragStart(this.draggedItem, event);
        }
    }

    /**
     * Handles global drag over events
     * @param {DragEvent} event - The drag over event
     * @private
     */
    _handleGlobalDragOver(event) {
        event.preventDefault(); 

        if (!this.draggedItem || !this.ghostElement) {
            event.dataTransfer.dropEffect = 'none';
            return;
        }

        if (this.ghostElement) {
            this._updateGhostPosition(event);
        }
        
        const originalGhostDisplay = this.ghostElement ? this.ghostElement.style.display : '';
        if (this.ghostElement) this.ghostElement.style.display = 'none';
        const targetElement = document.elementFromPoint(event.clientX, event.clientY);
        if (this.ghostElement) this.ghostElement.style.display = originalGhostDisplay;

        const newHoveredZoneElement = this._getDropZoneUnderMouse(targetElement);

        if (this.currentHoveredZoneForCallback !== newHoveredZoneElement) {
            if (this.currentHoveredZoneForCallback) {
                if (this.callbacks.onDragLeaveZone) {
                    this.callbacks.onDragLeaveZone(this.draggedItem, { element: this.currentHoveredZoneForCallback, name: this.currentHoveredZoneForCallback.dataset.zoneName }, event);
                }
                this.currentHoveredZoneForCallback.classList.remove('bg-primary-focus', 'opacity-50');
            }
            if (newHoveredZoneElement) {
                newHoveredZoneElement.classList.add('bg-primary-focus', 'opacity-50');
                if (this.callbacks.onDragEnterZone) {
                    this.callbacks.onDragEnterZone(this.draggedItem, { element: newHoveredZoneElement, name: newHoveredZoneElement.dataset.zoneName }, event);
                }
            }
            this.currentHoveredZoneForCallback = newHoveredZoneElement;
        }

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
            event.dataTransfer.dropEffect = 'none';
            document.body.classList.add('cursor-no-drop');
            document.body.classList.remove('cursor-grabbing');
        }
    }

    /**
     * Finds the drop zone element under the mouse cursor
     * @param {HTMLElement} targetElement - The element under the cursor
     * @returns {HTMLElement|null} The drop zone element or null
     * @private
     */
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

    /**
     * Handles global drop events
     * @param {DragEvent} event - The drop event
     * @private
     */
    _handleGlobalDrop(event) {
        event.preventDefault();

        if (!this.draggedItem) {
            return;
        }

        const dropZoneElement = this.currentHoveredZoneForCallback;

        if (dropZoneElement) {
            const zoneData = { element: dropZoneElement, name: dropZoneElement.dataset.zoneName };
            if (this.callbacks.canDrop(this.draggedItem, zoneData, event)) {
                this.draggedItem.element.classList.remove('opacity-50');

                if (this.config.insertElementOnDrop) {
                    zoneData.element.appendChild(this.draggedItem.element);
                }

                if (this.callbacks.onDrop) {
                    this.callbacks.onDrop(this.draggedItem, zoneData, event);
                    zoneData.element.classList.remove('bg-primary-focus', 'opacity-50');
                }
            } else {
                console.warn("drop attempted on a zone where canDrop is false. this should ideally be prevented by dragover's dropEffect.");
            }
        } else {
            console.log("dropped outside of a valid zone.");
        }
    }

    /**
     * Handles global drag end events
     * @param {DragEvent} event - The drag end event
     * @private
     */
    _handleGlobalDragEnd(event) {
        if (this.draggedItem && this.draggedItem.element) {
            this.draggedItem.element.classList.remove('opacity-50');
        }
        if (this.ghostElement) {
            this.ghostElement.remove();
            this.ghostElement = null;
        }

        if (this.currentHoveredZoneForCallback) {
             if (this.callbacks.onDragLeaveZone) {
                this.callbacks.onDragLeaveZone(this.draggedItem, { element: this.currentHoveredZoneForCallback, name: this.currentHoveredZoneForCallback.dataset.zoneName }, event);
            }
        }

        document.body.classList.remove('cursor-grabbing');
        document.body.classList.remove('cursor-no-drop');
        this.draggedItem = null;
        this.currentHoveredZoneForCallback = null;
    }

    /**
     * Cleans up drag state and visual elements
     * @private
     */
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

        document.querySelectorAll('[data-drop-zone="true"]').forEach(dz => dz.classList.remove('drag-over'));
    }
}