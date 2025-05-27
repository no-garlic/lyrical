
/**
 * Bulk operations for song management.
 * Handles operations that affect multiple songs at once.
 */

import { apiSongEditBulk } from './api_song_edit_bulk.js';
import { moveSongCardById, sortCardsInPanel } from './page_names_utils.js';
import { updateButtonStylesForSelection } from './page_names_ui_state.js';
import { getSelectedElement, removeElement } from './page_names_selection.js';
import { unregisterDraggable } from './page_names_drag_drop.js';
import { toastSystem } from './util_toast.js';

/**
 * Initialize bulk operations system.
 */
export function initBulkOperations() {

    // Bind the bulk operation buttons
    document.getElementById('btn-dislike-all-new-song-names').onclick = dislikeAllNewSongNames;
    document.getElementById('btn-archive-all-disliked-song-names').onclick = archiveAllDislikedSongNames;

    // Listen for card removal events
    document.addEventListener('removeSongCard', handleRemoveSongCard);
}

/**
 * Handle song card removal event.
 * @param {CustomEvent} event - The custom event containing card data.
 */
function handleRemoveSongCard(event) {
    const { card } = event.detail;
    unregisterDraggable(card);
}

/**
 * Dislike all new song names by moving them to the disliked stage.
 * This function is typically called as an event handler for a button click.
 */
function dislikeAllNewSongNames() {
    apiSongEditBulk({ song_stage_from: 'new', song_stage_to: 'disliked'})
        .then(data => {
            console.log(`Successfully moved all songs from new to disliked, id's: ${data}.`);

            // move each song card from the list of id's returned
            data.forEach(songId => {
                const moveResult = moveSongCardById(songId, 'disliked-songs-container');
                if (moveResult) {
                    // Update drag drop zone data
                    const updateEvent = new CustomEvent('updateCardDragDropZone', {
                        detail: { 
                            card: moveResult.songCard, 
                            zoneName: moveResult.destinationPanel.dataset.zoneName 
                        }
                    });
                    document.dispatchEvent(updateEvent);
                }
            });

            // potentially re-select or update selection if needed
            updateButtonStylesForSelection(getSelectedElement());

            // sort the cards in the dislike panel
            sortCardsInPanel('disliked-songs-container');
        })
        .catch(error => {
            console.error(`Failed to move all new songs to disliked:`, error);
            toastSystem.showError('Failed to move one or more songs. Please try again.');
        });
}

/**
 * Archive all disliked song names by moving them to the archived stage.
 * This function is typically called as an event handler for a button click.
 */
function archiveAllDislikedSongNames() {
    apiSongEditBulk({ song_stage_from: 'disliked', song_stage_to: 'archived'})
        .then(data => {
            console.log(`Successfully moved all songs from disliked to archived, id's: ${data}.`);

            // get the disliked songs container
            const songsContainer = document.getElementById('disliked-songs-container');

            data.forEach(songId => {
                console.log(`removing song card id: ${songId}`);
                const card = document.getElementById(`song-card-${songId}`);

                // remove the song card from the drag and drop system
                unregisterDraggable(card);

                // remove the song card from the select system
                removeElement(card);

                // remove the song card from the container
                songsContainer.removeChild(card);
            });

            // potentially re-select or update selection if needed
            updateButtonStylesForSelection(getSelectedElement());
        })
        .catch(error => {
            console.error(`Failed to move all disliked songs to archived:`, error);
            toastSystem.showError('Failed to move one or more songs. Please try again.');
        });
}
