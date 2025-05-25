import { makeVerticallyResizable } from './util_sliders_vertical.js'


/**
 * Initialize the page when the DOM is fully loaded
 */
document.addEventListener('DOMContentLoaded', () => {
    // setup the resize elements of the page
    setupResizeElements();

    // bind the edit song name button
    document.getElementById('btn-edit-song-name').onclick = editSongName;
});


/**
 * Setup the vertical resizable elements on the page.
 */
function setupResizeElements() {
    makeVerticallyResizable(
        document.getElementById('panel1-top-content'),
        document.getElementById('panel1-vertical-splitter'),
        document.getElementById('panel1-bottom-content')
    );
}


/**
 * Edit song name (placeholder function).
 * @param {Event} event - The click event that triggered the function.
 */
function editSongName(event) {
    alert("clicked!")
}


