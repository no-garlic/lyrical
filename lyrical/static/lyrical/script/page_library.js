import { makeVerticallyResizable } from './util_sliders_vertical.js'
import { makeHorizontallyResizable } from './util_sliders_horizontal.js'
import { ToastSystem } from './util_toast.js';


/**
 * Declare the toast system at the module level
 */
let toastSystem;


/**
 * Initialize the page when the DOM is fully loaded
 */
document.addEventListener('DOMContentLoaded', () => {
    // Setup the resize elements of the page
    setupResizeElements();

    // Initialize the toast system
    initToastSystem();
});


/**
 * Initialize the toast system.
 * Creates and configures the toast system for displaying user feedback messages.
 */
function initToastSystem() {
    // create the toast system and assign to module-level variable
    toastSystem = new ToastSystem();

    // initialize the toast system
    toastSystem.init();
}


/**
 * Setup the horizontal and vertical resizable elements on the page.
 */
function setupResizeElements() {    
    // Make the panel header resizable with auto-sizing to fit bottom content
    makeVerticallyResizable(
        document.getElementById('panel-top-content'),
        document.getElementById('panel-vertical-splitter'),
        document.getElementById('panel-bottom-content'),
        { autoSizeToFitBottomContent: true }
    );
    // Make the first panel splitter resizable
    makeHorizontallyResizable(
        document.getElementById('panel2'), 
        document.getElementById('splitter1'), 
        document.getElementById('panel1'));
    // Make the second panel splitter resizable
    makeHorizontallyResizable(
        document.getElementById('panel3'), 
        document.getElementById('splitter2'), 
        document.getElementById('panel2'));
}

