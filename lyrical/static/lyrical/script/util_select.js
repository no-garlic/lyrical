/*
 * Select System
 *
 * Manages a collection of selectable HTML elements and tracks which element(s) are currently selected.
 * It supports single or multiple selection modes, and various ways to select/deselect elements
 * (click, keyboard, programmatically).
 *
 * Configuration options (passed to constructor or init):
 * - allowMultiSelect (boolean, default: false): If true, multiple elements can be selected simultaneously.
 *   If false (default), only one element can be selected at a time.
 * - allowSelectOnClick (boolean, default: true): If true, elements can be selected by clicking on them.
 * - allowDeselectOnClick (boolean, default: false): If true, clicking a selected element deselects it.
 *   - Edge case: If allowMultiSelect is false and allowNoSelection is false, the last selected element
 *     cannot be deselected by click (as it would leave no selection).
 * - allowNoSelection (boolean, default: false): If true, it's possible to have no elements selected.
 *   - If false, the system attempts to ensure at least one element is selected if selectable elements are present.
 *   - This affects deselection: the last item cannot be deselected if it would result in no selection,
 *     unless allowNoSelection is true.
 * - autoSelectFirstElement (boolean, default: false): If true, the first element added to the system
 *   will be automatically selected, provided no other element is already selected.
 *   If allowNoSelection is false, the first element added will be selected regardless of this setting
 *   if it's the only selectable element.
 * - canDeselectOnEscape (boolean, default: true): If true, pressing the Escape key attempts to deselect
 *   the currently selected element(s). This respects the allowNoSelection rule.
 * - canDeselectOnClickAway (boolean, default: false): If true, clicking outside of any selectable
 *   element attempts to deselect the currently selected element(s). This respects allowNoSelection.
 *
 * Callbacks (passed to constructor or init, all are optional):
 * - onElementAdded: (element: HTMLElement) => void
 *   Called after an element has been successfully added to the list of selectable items.
 * - onElementRemoved: (element: HTMLElement) => void
 *   Called after an element has been successfully removed.
 * - canSelectElement: (elementToSelect: HTMLElement, currentlySelectedElements: Set<HTMLElement>) => boolean
 *   Called before an element is selected. Return false to prevent selection.
 * - canDeselectElement: (elementToDeselect: HTMLElement, currentlySelectedElements: Set<HTMLElement>) => boolean
 *   Called before an element is deselected. Return false to prevent deselection.
 * - onBeforeElementChanged: (changedElement: HTMLElement, currentSelectedElements: Set<HTMLElement>, action: 'select' | 'deselect') => void
 *   Called just before an element's selection state changes (either selected or deselected).
 *   `changedElement` is the element whose state is about to change.
 *   `currentSelectedElements` is the set of selected elements *before* this change.
 * - onAfterElementChanged: (currentSelectedElements: Set<HTMLElement>, changedElement: HTMLElement, action: 'select' | 'deselect') => void
 *   Called just after an element's selection state has changed.
 *   `currentSelectedElements` is the set of selected elements *after* this change.
 *   `changedElement` is the element whose state changed.
 * - onElementSelected: (element: HTMLElement, allSelectedElements: Set<HTMLElement>) => void
 *   Called after an element has been selected. `allSelectedElements` includes the newly selected element.
 * - onElementDeselected: (element: HTMLElement, allSelectedElements: Set<HTMLElement>) => void
 *   Called after an element has been deselected. `allSelectedElements` reflects the set after deselection.
 */
export class SelectSystem {

    /**
     * Creates an instance of SelectSystem.
     * @param {object} [initialConfig={}] Initial configuration options.
     * @param {object} [initialCallbacks={}] Initial callback functions.
     */
    constructor(initialConfig = {}, initialCallbacks = {}) {
        this.config = {
            allowMultiSelect: false,
            allowSelectOnClick: true,
            allowDeselectOnClick: false,
            allowNoSelection: false,
            autoSelectFirstElement: false,
            canDeselectOnEscape: true,
            canDeselectOnClickAway: false,
            selectOnMouseDown: true,
            ...initialConfig
        };

        this.callbacks = {
            onElementAdded: () => {},
            onElementRemoved: () => {},
            canSelectElement: () => true,
            canDeselectElement: () => true,
            onBeforeElementChanged: () => {},
            onAfterElementChanged: () => {},
            onElementSelected: () => {},
            onElementDeselected: () => {},
            ...initialCallbacks
        };

        this.selectableElements = new Set();
        this.selectedElements = new Set();
        this.clickAwayElements = new Set();

        // bind methods that will be used as event handlers to ensure 'this' context
        this._handleElementClick = this._handleElementClick.bind(this);
        this._handleDocumentClick = this._handleDocumentClick.bind(this);
        this._handleKeyDown = this._handleKeyDown.bind(this);
    }

    /**
     * Initializes or re-initializes the system with new configuration and callbacks.
     * Removes and re-adds global event listeners based on the new configuration.
     * @param {object} [config={}] Configuration options to merge with existing ones.
     * @param {object} [callbacks={}] Callback functions to merge with existing ones.
     */
    init(config = {}, callbacks = {}) {
        this.config = { ...this.config, ...config };
        this.callbacks = { ...this.callbacks, ...callbacks };

        // remove existing global listeners before adding new ones to prevent duplicates
        document.removeEventListener('keydown', this._handleKeyDown);
        document.removeEventListener('click', this._handleDocumentClick, true); // use capture for click away

        if (this.config.canDeselectOnEscape) {
            document.addEventListener('keydown', this._handleKeyDown);
        }
        if (this.config.canDeselectOnClickAway) {
            document.addEventListener('click', this._handleDocumentClick, true); // use capture for click away
        }
    }

    /**
     * Adds an HTML element to the list of selectable items.
     * Attaches a mousedown or click listener if allowSelectOnClick is true (based on selectOnMouseDown config).
     * Handles auto-selection based on configuration.
     * @param {HTMLElement} element The HTML element to make selectable.
     * @returns {boolean} True if the element was successfully added, false otherwise.
     */
    addElement(element) {
        if (!(element instanceof HTMLElement)) {
            console.error("SelectSystem: Element to add must be an HTMLElement.", element);
            return false;
        }
        if (this.selectableElements.has(element)) {
            // console.warn("SelectSystem: Element already added and selectable.", element);
            return false; // not added again
        }

        this.selectableElements.add(element);

        if (this.config.allowSelectOnClick) {
            const eventType = this.config.selectOnMouseDown ? 'mousedown' : 'click';
            element.addEventListener(eventType, this._handleElementClick);
        }

        this.callbacks.onElementAdded(element);

        if (this.config.autoSelectFirstElement && this.selectedElements.size === 0) {
            this.selectElement(element);
        } else if (!this.config.allowNoSelection && this.selectedElements.size === 0 && this.selectableElements.size === 1) {
            // if no selection is disallowed, and this is the very first element, select it.
            this.selectElement(element);
        }
        return true;
    }

    /**
     * Removes an element from the list of selectable items.
     * Deselects it if it was selected and removes its event listener.
     * If allowNoSelection is false, attempts to select another element if the removed
     * element was the last selected one.
     * @param {HTMLElement} element The HTML element to remove.
     * @returns {boolean} True if the element was successfully removed, false otherwise.
     */
    removeElement(element) {
        if (!(element instanceof HTMLElement)) {
            console.error("SelectSystem: Element to remove must be an HTMLElement.", element);
            return false;
        }
        if (!this.selectableElements.has(element)) {
            // console.warn("SelectSystem: Element not found in selectable list.", element);
            return false;
        }

        // if the element is currently selected, deselect it first.
        // this specific deselection bypasses some rules like allowNoSelection because the element is being removed.
        if (this.selectedElements.has(element)) {
            const oldSelected = new Set(this.selectedElements);
            this.callbacks.onBeforeElementChanged(element, oldSelected, 'deselect');
            this.selectedElements.delete(element);
            this.callbacks.onElementDeselected(element, new Set(this.selectedElements));
            this.callbacks.onAfterElementChanged(new Set(this.selectedElements), element, 'deselect');
        }

        this.selectableElements.delete(element);
        if (this.config.allowSelectOnClick) {
            const eventType = this.config.selectOnMouseDown ? 'mousedown' : 'click';
            element.removeEventListener(eventType, this._handleElementClick);
        }

        this.callbacks.onElementRemoved(element);

        // if allowNoSelection is false, and removing this element resulted in no selection,
        // try to select another available element.
        if (!this.config.allowNoSelection && this.selectedElements.size === 0 && this.selectableElements.size > 0) {
            const firstAvailable = this.selectableElements.values().next().value;
            if (firstAvailable) {
                this.selectElement(firstAvailable);
            }
        }
        return true;
    }


    /**
     * Adds an element to the list of click away elements.
     * When canDeselectOnClickAway is true and clickAwayElements are registered,
     * clicking on these specific elements will trigger deselection instead of
     * clicking anywhere on the page.
     * @param {HTMLElement} element The element to add as a click away trigger.
     * @returns {boolean} True if the element was successfully added, false otherwise.
     */
    addClickAwayElement(element) {
        if (!(element instanceof HTMLElement)) {
            console.error("SelectSystem: Click away element must be an HTMLElement.", element);
            return false;
        }
        if (this.clickAwayElements.has(element)) {
            return false; // already added
        }
        this.clickAwayElements.add(element);
        return true;
    }

    /**
     * Removes an element from the list of click away elements.
     * @param {HTMLElement} element The element to remove from click away triggers.
     * @returns {boolean} True if the element was successfully removed, false otherwise.
     */
    removeClickAwayElement(element) {
        if (!(element instanceof HTMLElement)) {
            console.error("SelectSystem: Click away element must be an HTMLElement.", element);
            return false;
        }
        if (!this.clickAwayElements.has(element)) {
            return false; // not found
        }
        this.clickAwayElements.delete(element);
        return true;
    }
    

    /**
     * Selects the given element.
     * If allowMultiSelect is false, any previously selected element will be deselected.
     * @param {HTMLElement} element The element to select.
     * @returns {boolean} True if the element was successfully selected, false otherwise.
     */
    selectElement(element) {
        if (!element || !this.selectableElements.has(element)) {
            // console.warn("SelectSystem: Attempted to select an element not in the selectable list or invalid element.", element);
            return false;
        }

        if (this.selectedElements.has(element)) {
            // if it's already selected:
            // - in single-select mode, it's a no-op, considered successful.
            // - in multi-select mode, also a no-op for "selection". toggling is handled by _handleElementClick.
            return true;
        }

        if (!this.callbacks.canSelectElement(element, new Set(this.selectedElements))) {
            return false;
        }

        const oldSelected = new Set(this.selectedElements);
        this.callbacks.onBeforeElementChanged(element, oldSelected, 'select');

        if (!this.config.allowMultiSelect) {
            // deselect all currently selected elements.
            // create a copy for iteration as selectedElements will be modified.
            const currentSelections = Array.from(this.selectedElements);
            currentSelections.forEach(selectedEl => {
                // this is an implicit deselection due to a new single selection.
                // no need to check canDeselectElement or allowNoSelection here.
                this.selectedElements.delete(selectedEl);
                this.callbacks.onElementDeselected(selectedEl, new Set(this.selectedElements));
            });
        }

        this.selectedElements.add(element);
        this.callbacks.onElementSelected(element, new Set(this.selectedElements));
        this.callbacks.onAfterElementChanged(new Set(this.selectedElements), element, 'select');
        return true;
    }

    /**
     * Deselects the given element.
     * Respects allowNoSelection configuration.
     * @param {HTMLElement} element The element to deselect.
     * @returns {boolean} True if the element was successfully deselected, false otherwise.
     */
    deselectElement(element) {
        if (!element || !this.selectedElements.has(element)) {
            // console.warn("SelectSystem: Attempted to deselect an element that is not selected or invalid.", element);
            return false;
        }

        // check if this is the last selected element and no selection is disallowed.
        if (!this.config.allowNoSelection && this.selectedElements.size === 1 && this.selectedElements.has(element)) {
            // console.log("SelectSystem: Cannot deselect the last element when allowNoSelection is false.");
            return false;
        }

        if (!this.callbacks.canDeselectElement(element, new Set(this.selectedElements))) {
            return false;
        }

        const oldSelected = new Set(this.selectedElements);
        this.callbacks.onBeforeElementChanged(element, oldSelected, 'deselect');

        this.selectedElements.delete(element);
        this.callbacks.onElementDeselected(element, new Set(this.selectedElements));
        this.callbacks.onAfterElementChanged(new Set(this.selectedElements), element, 'deselect');
        return true;
    }

    /**
     * Selects multiple elements.
     * If allowMultiSelect is false, it attempts to select the first valid element from the list.
     * If allowMultiSelect is true, it attempts to select all valid elements from the list.
     * @param {HTMLElement[]} elements An array of elements to select.
     * @returns {boolean} True if all (or one in single-select) elements were selected successfully, false otherwise.
     */
    selectElements(elements) {
        if (!Array.isArray(elements)) {
            console.error("SelectSystem: elements to select must be an array.", elements);
            return false;
        }
        if (elements.length === 0) return true; // no elements to select, considered success.

        if (!this.config.allowMultiSelect) {
            // single-select mode: try to select the first valid element.
            // selectElement will handle deselecting the current one.
            for (const el of elements) {
                if (this.selectableElements.has(el)) {
                    if (this.selectElement(el)) {
                        return true; // successfully selected one
                    }
                }
            }
            return false; // no element from the list could be selected
        } else {
            // multi-select mode: attempt to select all.
            let allSucceeded = true;
            elements.forEach(el => {
                if (this.selectableElements.has(el)) {
                    if (!this.selectElement(el)) { // selectElement adds to selection in multi-mode
                        allSucceeded = false;
                    }
                } else {
                    allSucceeded = false; // element not even selectable
                }
            });
            return allSucceeded;
        }
    }

    /**
     * Deselects multiple elements.
     * @param {HTMLElement[]} elements An array of elements to deselect.
     * @returns {boolean} True if all specified elements that were selected were successfully deselected, false otherwise.
     */
    deselectElements(elements) {
        if (!Array.isArray(elements)) {
            console.error("SelectSystem: elements to deselect must be an array.", elements);
            return false;
        }
        if (elements.length === 0) return true;

        let allSucceeded = true;
        elements.forEach(el => {
            if (this.selectedElements.has(el)) { // only attempt to deselect if actually selected
                if (!this.deselectElement(el)) {
                    allSucceeded = false;
                }
            }
        });
        return allSucceeded;
    }

    /**
     * Deselects all currently selected elements.
     * Respects allowNoSelection configuration (i.e., might not deselect the last item).
     * @returns {boolean} True if all possible elements were deselected according to rules, false if some remained selected due to rules.
     */
    deselectAllElements() {
        if (this.selectedElements.size === 0) return true;

        // if !allowNoSelection and single-select mode with 1 item, it cannot be deselected.
        if (!this.config.allowNoSelection && !this.config.allowMultiSelect && this.selectedElements.size === 1) {
            return false;
        }

        const elementsToTryDeselecting = Array.from(this.selectedElements);
        let allSuccessfullyDeselected = true;
        elementsToTryDeselecting.forEach(el => {
            if (!this.deselectElement(el)) { // deselectElement respects allowNoSelection for the last item
                allSuccessfullyDeselected = false;
            }
        });
        // returns true if the set is now empty or couldn't be emptied further due to rules.
        // if allSuccessfullyDeselected is false, it means some items that were targeted for deselection
        // could not be deselected (e.g. the last item when allowNoSelection is false).
        return allSuccessfullyDeselected;
    }

    hasSelectedElement() {
        return (this.selectedElements.size > 0);
    }

    /**
     * Gets the currently selected element.
     * If multiple elements are selected (allowMultiSelect is true), it returns the first one added to the selection.
     * @returns {HTMLElement | null} The selected element, or null if no element is selected.
     */
    getSelectedElement() {
        if (this.selectedElements.size === 0) {
            return null;
        }
        // return the first element encountered in the Set's iteration order
        return this.selectedElements.values().next().value;
    }

    /**
     * Gets an array of all currently selected elements.
     * @returns {HTMLElement[]} An array of the selected HTML elements.
     */
    getSelectedElements() {
        return Array.from(this.selectedElements);
    }

    /**
     * Checks if a specific element is currently selected.
     * @param {HTMLElement} element The element to check.
     * @returns {boolean} True if the element is selected, false otherwise.
     */
    isElementSelected(element) {
        return this.selectedElements.has(element);
    }

    /**
     * Gets an array of all elements that are registered as selectable.
     * @returns {HTMLElement[]} An array of all selectable HTML elements.
     */
    getSelectableElements() {
        return Array.from(this.selectableElements);
    }

    /**
     * Cleans up the system by removing all event listeners and clearing internal state.
     * Call this when the SelectSystem is no longer needed to prevent memory leaks.
     * @returns {boolean} True upon successful destruction.
     */
    destroy() {
        // Remove global event listeners
        document.removeEventListener('keydown', this._handleKeyDown);
        document.removeEventListener('click', this._handleDocumentClick, true); // Match capture phase

        // Remove event listeners from all selectable elements
        this.selectableElements.forEach(element => {
            if (this.config.allowSelectOnClick) {
                const eventType = this.config.selectOnMouseDown ? 'mousedown' : 'click';
                element.removeEventListener(eventType, this._handleElementClick);
            }
        });

        // Clear internal sets
        this.selectableElements.clear();
        this.selectedElements.clear();
        this.clickAwayElements.clear();

        // Optionally reset callbacks and config to initial state or nullify
        this.callbacks = {}; // Or reset to default placeholders
        this.config = {};    // Or reset to default values

        // console.log("SelectSystem destroyed.");
        return true;
    }

    // --- Private Helper Methods ---

    /**
     * Handles click events on selectable elements.
     * @private
     * @param {MouseEvent} event The click event.
     */
    _handleElementClick(event) {
        const element = event.currentTarget; // Element the listener was attached to
        if (!this.selectableElements.has(element) || !this.config.allowSelectOnClick) {
            return; // Should not happen if listeners are managed correctly or if clicks are disabled
        }

        event.stopPropagation(); // Prevent click from bubbling to document for click-away logic

        if (this.selectedElements.has(element)) {
            // Element is already selected, check if it can be deselected by click
            if (this.config.allowDeselectOnClick) {
                this.deselectElement(element);
            }
        } else {
            // Element is not selected, try to select it
            this.selectElement(element);
        }
    }

    /**
     * Handles click events on the document (for click-away deselection).
     * @private
     * @param {MouseEvent} event The click event.
     */
    _handleDocumentClick(event) {
        if (!this.config.canDeselectOnClickAway || this.selectedElements.size === 0) {
            return;
        }

        // Check if the click target is one of the selectable elements or their children.
        // If so, the element's own click handler (_handleElementClick) should manage it.
        // _handleElementClick calls event.stopPropagation(), so this won't run for clicks on selectable items.
        // This check is a fallback or for cases where stopPropagation might not be used by other handlers.
        let target = event.target;
        let clickedOnSelectableOrChild = false;
        while (target && target !== document.body) {
            if (this.selectableElements.has(target)) {
                clickedOnSelectableOrChild = true;
                break;
            }
            target = target.parentElement;
        }

        if (!clickedOnSelectableOrChild) {
            // If we have specific click away elements registered, only deselect when clicking those
            if (this.clickAwayElements.size > 0) {
                let clickedOnClickAwayElement = false;
                target = event.target;
                while (target && target !== document.body) {
                    if (this.clickAwayElements.has(target)) {
                        clickedOnClickAwayElement = true;
                        break;
                    }
                    target = target.parentElement;
                }
                
                if (!clickedOnClickAwayElement) {
                    return; // Don't deselect unless clicked on a registered click away element
                }
            }
            
            // Clicked away from any selectable element (and on a click away element if specified)
            // Attempt to deselect all, respecting allowNoSelection rules.
            if (!this.config.allowNoSelection && !this.config.allowMultiSelect && this.selectedElements.size === 1) {
                // Do not deselect the last item in single-select mode if no selection is disallowed.
                return;
            }
            this.deselectAllElements();
        }
    }

    /**
     * Handles keydown events on the document (for Escape key deselection).
     * @private
     * @param {KeyboardEvent} event The keydown event.
     */
    _handleKeyDown(event) {
        if (event.key === 'Escape' && this.config.canDeselectOnEscape && this.selectedElements.size > 0) {
            // Attempt to deselect all, respecting allowNoSelection rules.
             if (!this.config.allowNoSelection && !this.config.allowMultiSelect && this.selectedElements.size === 1) {
                // Do not deselect the last item in single-select mode if no selection is disallowed.
                return;
            }
            this.deselectAllElements();
        }
    }
}
