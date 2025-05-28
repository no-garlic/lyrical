
/**
 * Main entry point for the names page.
 * Coordinates initialization of all subsystems and handles page setup.
 */

import { makeHorizontallyResizable } from './util_sliders_horizontal.js';
import { setNavigationIndex, setNavigationPrevious } from './util_navigation.js';

import { initSelection } from './page_names_selection.js';
import { initDragDrop } from './page_names_drag_drop.js';
import { initSongManagement } from './page_names_song_management.js';
import { initBulkOperations } from './page_names_bulk_operations.js';
import { initGeneration } from './page_names_generation.js';
import { updateItemData } from './page_names_drag_drop.js';

/**
 * Declare system instances at the module level
 */
let selectSystem;
let dragDropSystem;

/**
 * Initialize the page when the DOM is fully loaded
 */
document.addEventListener('DOMContentLoaded', () => {
    // Setup the resize elements of the page
    setupResizeElements();

    // Cannot navigate back from this page
    setNavigationIndex(1);
    setNavigationPrevious(false);

    // Initialize all subsystems
    initializeSubsystems();

    // Setup inter-system communication
    setupEventListeners();
});

/**
 * Initialize all subsystems in the correct order.
 */
function initializeSubsystems() {
    // Initialize systems that don't depend on others first
    selectSystem = initSelection();
    dragDropSystem = initDragDrop();
    
    // Initialize systems that use the above systems
    initSongManagement();
    initBulkOperations();
    initGeneration();
}

/**
 * Setup event listeners for inter-system communication.
 */
function setupEventListeners() {
    // Listen for drag drop zone updates
    document.addEventListener('updateCardDragDropZone', (event) => {
        const { card, zoneName } = event.detail;
        updateItemData(card, { originalZone: zoneName });
    });
}

/**
 * Setup the horizontal and vertical resizable elements on the page.
 */
function setupResizeElements() {
    // make the second panel splitter resizable
    makeHorizontallyResizable(
        document.getElementById('panel3'), 
        document.getElementById('splitter1'), 
        document.getElementById('panel2')
    );
    
    // make the third panel splitter resizable
    makeHorizontallyResizable(
        document.getElementById('panel4'), 
        document.getElementById('splitter2'), 
        document.getElementById('panel3')
    );
}
