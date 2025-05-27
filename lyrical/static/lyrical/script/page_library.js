import { makeVerticallyResizable } from './util_sliders_vertical.js'
import { makeHorizontallyResizable } from './util_sliders_horizontal.js'
import { toastSystem } from './util_toast.js';


/**
 * Initialize the page when the DOM is fully loaded
 */
document.addEventListener('DOMContentLoaded', () => {
    // Setup the resize elements of the page
    setupResizeElements();
});


/**
 * Setup the horizontal and vertical resizable elements on the page.
 */
function setupResizeElements() {    
    // Make the panel header resizable with auto-sizing to fit bottom content
    makeVerticallyResizable(
        document.getElementById(''),
        document.getElementById('panel-vertical-splitter'),
        document.getElementById('disliked-songs-container'),
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

