
/**
 * UI state management for the names page.
 * Handles button states, navigation updates, and visual feedback.
 */

import { getContainerChildCount } from './page_names_utils.js';
import { setNavigationNext } from './util_navigation.js';

/**
 * Update the button styles based on the selected song card.
 * @param {HTMLElement} selectedElement - the selected song card element
 */
export function updateButtonStylesForSelection(selectedElement) {
    // if there are no items left in the 'new' song names container, then disable the dislike all button,
    // otherwise enable it.
    const newItemsCount = getContainerChildCount('new-songs-container');
    const dislikeAllButton = document.getElementById('btn-dislike-all-new-song-names');
    if (dislikeAllButton) {
        console.log(`new panel child count: ${newItemsCount}`);
        if (newItemsCount === 0) {
            dislikeAllButton.classList.add('btn-disabled');
        } else {
            dislikeAllButton.classList.remove('btn-disabled');
        }
    }

    // if there are no items left in the 'disliked' song names container, then disable the archive all button,
    // otherwise enable it.
    const dislikedItemsCount = getContainerChildCount('disliked-songs-container');
    const archiveAllButton = document.getElementById('btn-archive-all-disliked-song-names');
    if (archiveAllButton) {
        console.log(`disliked panel child count: ${dislikedItemsCount}`);
        if (dislikedItemsCount === 0) {
            archiveAllButton.classList.add('btn-disabled');
        } else {
            archiveAllButton.classList.remove('btn-disabled');
        }
    }

    if (selectedElement === null) {
        // use querySelectorAll with attribute selectors to find all relevant edit and delete buttons
        // and add the 'btn-disabled' class to them
        document.querySelectorAll('[id$="-edit-song-name"], [id$="-delete-song-name"], [id$="btn-create-song-lyrics"]').forEach(button => {
            button.classList.add('btn-disabled');
        });
        setNavigationNext(false);
        
        return;
    } else {
        // set the disabled state of the Create Lyrics button based on what stage the selected song is
        const createLyricsButton = document.getElementById('btn-create-song-lyrics');
        if (selectedElement.dataset.songStage === 'liked') {
            createLyricsButton.classList.remove('btn-disabled');
            setNavigationNext(true);
        } else {
            createLyricsButton.classList.add('btn-disabled');
            setNavigationNext(false);
        }
    }

    // get the parent container of the selected element
    const parentContainer = selectedElement.parentElement;

    // associate buttons with their respective containers
    const associatedButtons = [
        {'liked-songs-container': ['liked', 'disliked', 'new']},
        {'disliked-songs-container': ['disliked', 'liked', 'new']},
        {'new-songs-container': ['new', 'liked', 'disliked']}
    ];

    // loop through the associated buttons and update their styles based on the selected element's parent container
    associatedButtons.forEach(button => {
        const containerId = Object.keys(button)[0];
        const buttonTypes = button[containerId];

        // check if the parent container matches the current containerId
        // and update the button styles accordingly
        if (parentContainer.id === containerId) {        
            document.getElementById(`btn-${buttonTypes[0]}-edit-song-name`).classList.remove('btn-disabled');
            document.getElementById(`btn-${buttonTypes[0]}-delete-song-name`).classList.remove('btn-disabled');
            document.getElementById(`btn-${buttonTypes[1]}-edit-song-name`).classList.add('btn-disabled');
            document.getElementById(`btn-${buttonTypes[1]}-delete-song-name`).classList.add('btn-disabled');
            document.getElementById(`btn-${buttonTypes[2]}-edit-song-name`).classList.add('btn-disabled');
            document.getElementById(`btn-${buttonTypes[2]}-delete-song-name`).classList.add('btn-disabled');
        }
    });
}

/**
 * Handle UI changes when loading starts.
 */
export function handleLoadingStart() {
    // get the buttons
    const generateButton = document.getElementById('btn-generate-song-names');
    const generatingButton = document.getElementById('btn-generating-song-names');
    
    // hide the generate button
    if (generateButton) {
        generateButton.classList.add('hidden');
    }

    // show the generating button in disabled state
    if (generatingButton) {
        generatingButton.classList.remove('hidden');
    }
}

/**
 * Handle UI changes when loading ends.
 */
export function handleLoadingEnd() {
    // get the buttons
    const generateButton = document.getElementById('btn-generate-song-names');
    const generatingButton = document.getElementById('btn-generating-song-names');
    
    // hide the generate button
    if (generateButton) {
        generateButton.classList.remove('hidden');
    }

    // show the generating button in disabled state
    if (generatingButton) {
        generatingButton.classList.add('hidden');
    }
}

/**
 * Apply selection styles to an element.
 * @param {HTMLElement} element - The element to apply styles to.
 */
export function applySelectionStyles(element) {
    const selectionStyleToAdd = ['border-2', 'border-primary'];
    const selectionStyleToRemove = ['border-base-300'];
    
    element.classList.add(...selectionStyleToAdd);
    element.classList.remove(...selectionStyleToRemove);
}

/**
 * Remove selection styles from an element.
 * @param {HTMLElement} element - The element to remove styles from.
 */
export function removeSelectionStyles(element) {
    const selectionStyleToAdd = ['border-2', 'border-primary'];
    const selectionStyleToRemove = ['border-base-300'];
    
    element.classList.add(...selectionStyleToRemove);
    element.classList.remove(...selectionStyleToAdd);
}
