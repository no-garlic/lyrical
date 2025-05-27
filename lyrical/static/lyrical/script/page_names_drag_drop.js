
/**
 * Drag and drop functionality for song cards.
 * Handles drag operations, drop zones, and card movement between containers.
 */

import { DragDropSystem } from './util_dragdrop.js';
import { apiSongEdit } from './api_song_edit.js';
import { sortCardsInPanel, getSongDataFromCard, updateSongCardData } from './page_names_utils.js';
import { updateButtonStylesForSelection } from './page_names_ui_state.js';
import { getSelectedElement } from './page_names_selection.js';
import { toastSystem } from './util_toast.js';

let dragDropSystem;

/**
 * Initialize the drag and drop system.
 * @returns {DragDropSystem} The initialized drag drop system.
 */
export function initDragDrop() {
    
    // create the drag and drop system and assign to module-level variable
    dragDropSystem = new DragDropSystem();

    // initialise it
    dragDropSystem.init({
        onDragStart: (item, event) => {
        },
        onDrop: handleDragDrop,
        canDrop: (item, zone, event) => {
            return true;
        },
        onDragEnterZone: (item, zone, event) => {
        },
        onDragLeaveZone: (item, zone, event) => {
        }
    });

    // register draggable items (song cards)
    document.querySelectorAll('.song-card').forEach(card => {
        registerCardForDragDrop(card);
    });

    return dragDropSystem;
}

/**
 * Handle the drag and drop of a song card.
 * Updates the song stage when dropped into a new zone and sorts the cards.
 * @param {Object} item - The dragged item containing element and data.
 * @param {Object} zone - The drop zone where the item was dropped.
 * @param {Event} event - The drop event.
 */
function handleDragDrop(item, zone, event) {
    // check if the song is being dropped into a new zone or not
    if (item.data.originalZone != zone.name) {
        item.data.originalZone = zone.name;

        // get the song id and the name of the new stage
        const songId = item.element.dataset.songId;
        const songStage = zone.name;

        // call the api to update the song stage
        console.log(`moving song ${songId} to stage ${songStage}.`);
        apiSongEdit(songId, { song_stage: songStage })
            .then(() => {
                console.log(`successfully moved song ${songId} to stage ${songStage}.`);

                // update the card's song stage
                updateSongCardData(item.element, { songStage: songStage });

                // update the ui buttons enabled and disabled states
                updateButtonStylesForSelection(getSelectedElement());

                // sort the cards in the new container
                sortCardsInPanel(item.element.parentElement.id);
            })
            .catch(error => {
                console.error(`failed to move song ${songId} to stage ${songStage}:`, error);
                toastSystem.showError('Failed to move the song. Please try again.');
            });
    } else {
        // sort the cards in the new container
        sortCardsInPanel(item.element.parentElement.id);
    }
}

/**
 * Register a card for the drag and drop system.
 * @param {HTMLElement} card - The card element to register.
 */
export function registerCardForDragDrop(card) {
    const { songId, songName } = getSongDataFromCard(card);
    const originalZone = card.closest('[data-drop-zone="true"]').dataset.zoneName; // get initial zone
    dragDropSystem.registerDraggable(card, { songId, songName, originalZone });
}

/**
 * Update item data in the drag drop system.
 * @param {HTMLElement} element - The element to update.
 * @param {Object} data - The new data.
 */
export function updateItemData(element, data) {
    if (dragDropSystem) {
        dragDropSystem.updateItemData(element, data);
    }
}

/**
 * Unregister a draggable element.
 * @param {HTMLElement} element - The element to unregister.
 */
export function unregisterDraggable(element) {
    if (dragDropSystem) {
        dragDropSystem.unregisterDraggable(element);
    }
}
