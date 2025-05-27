
/**
 * Selection system functionality for song cards.
 * Handles card selection, keyboard navigation, and selection events.
 */

import { SelectSystem } from './util_select.js';
import { applySelectionStyles, removeSelectionStyles, updateButtonStylesForSelection } from './page_names_ui_state.js';

let selectSystem;

/**
 * Initialize the selection system.
 * @returns {SelectSystem} The initialized select system.
 */
export function initSelection() {
    // create the select system and assign to module-level variable
    selectSystem = new SelectSystem();

    // initialise the select system
    selectSystem.init(
        {
            allowMultiSelect: false,
            allowSelectOnClick: true,
            allowDeselectOnClick: false,
            allowNoSelection: true,
            autoSelectFirstElement: false,
            canDeselectOnEscape: true,
            canDeselectOnClickAway: true,
            selectOnMouseDown: true
        },
        {
            onElementSelected: (element, allSelectedElements) => {
                applySelectionStyles(element);
                updateButtonStylesForSelection(element);
            },
            onElementDeselected: (element, allSelectedElements) => {
                removeSelectionStyles(element);
            },
            onAfterElementChanged: (allSelectedElements, changedElement) => {
                // if no elements are selected, update the button styles to disabled
                const selectedElement = selectSystem.getSelectedElement();
                if (selectedElement === null) {
                    updateButtonStylesForSelection(null);
                }
            }
        }
    );

    // begin with all buttons disabled
    updateButtonStylesForSelection(null);

    // register existing song cards with the select system
    document.querySelectorAll('.song-card').forEach(card => {
        selectSystem.addElement(card);
    });

    // register click away elements
    selectSystem.addClickAwayElement(document.getElementById('liked-songs-container'));
    selectSystem.addClickAwayElement(document.getElementById('disliked-songs-container'));
    selectSystem.addClickAwayElement(document.getElementById('new-songs-container'));

    // add event listener for Enter key press when no input is focused to
    // edit the selected song
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            if (document.activeElement === document.body) {
                if (selectSystem.hasSelectedElement()) {
                    // Dispatch custom event for edit action
                    const event = new CustomEvent('editSelectedSong');
                    document.dispatchEvent(event);
                }
            }
        }
    });

    return selectSystem;
}

/**
 * Register a card for the select system.
 * @param {HTMLElement} card - The card element to register.
 */
export function registerCardForSelect(card) {
    if (selectSystem && card) {
        selectSystem.addElement(card);
        selectSystem.selectElement(card);
    }
}

/**
 * Get the currently selected element.
 * @returns {HTMLElement|null} The selected element or null.
 */
export function getSelectedElement() {
    return selectSystem ? selectSystem.getSelectedElement() : null;
}

/**
 * Remove an element from the selection system.
 * @param {HTMLElement} element - The element to remove.
 */
export function removeElement(element) {
    if (selectSystem) {
        selectSystem.removeElement(element);
    }
}

/**
 * Check if there is a selected element.
 * @returns {boolean} True if an element is selected.
 */
export function hasSelectedElement() {
    return selectSystem ? selectSystem.hasSelectedElement() : false;
}
