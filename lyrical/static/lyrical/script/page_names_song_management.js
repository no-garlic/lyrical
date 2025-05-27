
/**
 * Song management functionality.
 * Handles CRUD operations for individual songs, modal interactions, and card creation.
 */

import { apiSongAdd } from './api_song_add.js';
import { apiSongDelete } from './api_song_delete.js';
import { apiSongEdit } from './api_song_edit.js';
import { apiRenderComponent } from './api_render_component.js';
import { sortCardsInPanel, setupNewCardVisualState, getSongDataFromCard } from './page_names_utils.js';
import { registerCardForDragDrop } from './page_names_drag_drop.js';
import { registerCardForSelect, getSelectedElement, removeElement } from './page_names_selection.js';
import { updateButtonStylesForSelection } from './page_names_ui_state.js';
import { toastSystem } from './util_toast.js';

/**
 * Initialize song management system.
 */
export function initSongManagement() {

    // Bind the song management buttons
    document.getElementById('btn-add-song-name').onclick = addSongName;
    document.getElementById('btn-liked-edit-song-name').onclick = editSongName;
    document.getElementById('btn-liked-delete-song-name').onclick = deleteSongName;
    document.getElementById('btn-disliked-edit-song-name').onclick = editSongName;
    document.getElementById('btn-disliked-delete-song-name').onclick = deleteSongName;
    document.getElementById('btn-new-edit-song-name').onclick = editSongName;
    document.getElementById('btn-new-delete-song-name').onclick = deleteSongName;
    document.getElementById('btn-create-song-lyrics').onclick = createSongLyrics;

    // Listen for custom events
    document.addEventListener('editSelectedSong', editSongName);
    document.addEventListener('newSongGenerated', handleNewSongGenerated);
}

/**
 * Handle new song generated event.
 * @param {CustomEvent} event - The custom event containing song data.
 */
function handleNewSongGenerated(event) {
    const { songId, songName } = event.detail;
    addNewSongCard(songId, songName);
}

/**
 * Add a new song name.
 * This function is typically called as an event handler for a button click.
 * @param {Event} event - The click event that triggered the function.
 */
function addSongName(event) {
    // set event handler for the ok button
    document.getElementById('modal-textinput-ok').onclick = handleAddSongConfirm;

    // set event handler for the cancel button
    document.getElementById('modal-textinput-cancel').onclick = handleAddSongCancel;

    // set the dialog params
    document.getElementById('modal-textinput-title').innerHTML = 'Add Song Name';
    document.getElementById('modal-textinput-message').innerHTML = 'Enter the new song name:';
    document.getElementById('modal-textinput-text').value = '';

    // show the dialog and set focus to the input field after 50ms delay
    document.getElementById('modal-textinput').showModal();
    setTimeout(() => { document.getElementById('modal-textinput-text').focus(); }, 50);
}

/**
 * Handle the confirmation of adding a new song name.
 * @param {Event} event - The click event that triggered the function.
 */
function handleAddSongConfirm(event) {
    // get the new song name from the input field
    const newSongName = document.getElementById('modal-textinput-text').value.trim();
    console.log(`New song name: ${newSongName}.`);

    // call the api to add the song
    apiSongAdd(newSongName)
        .then(songId => {
            // add the new song card to the page
            addNewSongCard(songId, newSongName);
        })
        .catch(error => {
            // handle the error if the API call fails
            console.error('Failed to add the new song name:', error);
            toastSystem.showError('Failed to add the song. Please try again.');
        });
}

/**
 * Handle the cancellation of adding a new song name.
 * @param {Event} event - The click event that triggered the function.
 */
function handleAddSongCancel(event) {
    // stop the validator from triggering and close the modal
    document.getElementById('modal-textinput-text').value = ' ';
    document.getElementById('modal-textinput').close();
}

/**
 * Add a new song card to the page by rendering it and then initializing it.
 * @param {string} songId - The ID of the song to add.
 * @param {string} songName - The name of the song to add.
 */
function addNewSongCard(songId, songName) {
    // render the new song card component
    apiRenderComponent('card_song', 'new-songs-container', { song: { id: songId, name: songName, stage: 'new' }})
        .then(html => {
            // initialize the new song card for interactions
            initNewSongCard(songId, songName);
        })
        .catch(error => {
            // handle the error if the component rendering fails
            console.error('Failed to render or initialize new song card:', error);
            toastSystem.showError('Failed to display the new song. Please refresh the page.');
        });
}

/**
 * Initializes a newly added song card.
 * This includes setting up its interactions like drag-and-drop and selection.
 * @param {string} songId - The ID of the new song card.
 * @param {string} songName - The name of the new song.
 */
function initNewSongCard(songId, songName) {
    // get the new song card element
    const newCard = document.querySelector(`.song-card[data-song-id="${songId}"]`);

    // check we found the new card
    if (!newCard) {
        console.error('Could not find the newly added song card for songId:', songId);
        return;
    }

    // setup visual state for new card
    setupNewCardVisualState(newCard);

    // register the new song card for drag and drop
    registerCardForDragDrop(newCard);

    // register the new song card for selection
    registerCardForSelect(newCard);

    // sort the cards alphabetically
    sortCardsInPanel('new-songs-container');
}

/**
 * Edit the name of the selected song.
 * This function is typically called as an event handler for a button click.
 */
function editSongName() {
    // get the selected song card
    const card = getSelectedElement();

    // check that a card is selected
    if (!card) {
        console.error('No song card is selected for edit.');
        return;
    }

    // get the song id and name from the card
    const { songId, songName } = getSongDataFromCard(card);
    console.log(`Editing the song name [${songName}] for songId: ${songId}`);

    // set event handler for the ok button
    document.getElementById('modal-textinput-ok').onclick = handleEditSongConfirm;

    // set event handler for the cancel button
    document.getElementById('modal-textinput-cancel').onclick = handleEditSongCancel;

    // set the dialog params
    document.getElementById('modal-textinput-title').innerHTML = 'Edit Song Name';
    document.getElementById('modal-textinput-message').innerHTML = 'Enter the new song name:';
    document.getElementById('modal-textinput-text').value = songName;
    
    // show the dialog and set focus to the input field after 50ms delay
    document.getElementById('modal-textinput').showModal();
    setTimeout(() => { document.getElementById('modal-textinput-text').focus(); }, 50);
}

/**
 * Handle the confirmation of editing a song name.
 * @param {Event} event - The click event that triggered the function.
 */
function handleEditSongConfirm(event) {
    // get the selected song card and new name
    const card = getSelectedElement();
    const { songId } = getSongDataFromCard(card);
    const newSongName = document.getElementById('modal-textinput-text').value.trim();
    console.log(`New song name: ${newSongName}.`);

    // call the api to update the song name
    apiSongEdit(songId, { song_name: newSongName })
        .then(songId => {
            // update the text on the song card
            console.log(`Successfully updated song name for songId: ${songId}`);
            document.getElementById(`song-text-${songId}`).innerHTML = newSongName;
            card.dataset.songName = newSongName;

            // sort the container
            sortCardsInPanel(card.parentElement.id);
        })
        .catch(error => {
            // handle the error if the API call fails
            console.error('Failed to edit the song name:', error);
            toastSystem.showError('Failed to update the song name. Please try again.');
        });
}

/**
 * Handle the cancellation of editing a song name.
 * @param {Event} event - The click event that triggered the function.
 */
function handleEditSongCancel(event) {
    // stop the validator from triggering and close the modal
    if (document.getElementById('modal-textinput-text').value === '') {
        document.getElementById('modal-textinput-text').value = ' ';
    }
    document.getElementById('modal-textinput').close();
}

/**
 * Delete the selected song.
 * This function is typically called as an event handler for a button click.
 */
function deleteSongName() {
    // get the selected song card
    const card = getSelectedElement();

    // check that a card is selected
    if (!card) {
        console.error('No song card is selected for deletion.');
        return;
    }

    // get the song id from the card
    const { songId, songName } = getSongDataFromCard(card);
    console.log(`Deleting song name for songId: ${songId}`);

    // set the event handler for the delete confirmation dialog
    document.getElementById('modal-delete-yes').onclick = handleDeleteSongConfirm;

    // show the delete confirmation dialog
    document.getElementById('modal-delete-message').innerHTML = `Are you sure you want to delete the song: '${songName}'?`;
    document.getElementById('modal-delete').showModal();
}

/**
 * Handle the confirmation of deleting a song.
 * @param {Event} event - The click event that triggered the function.
 */
function handleDeleteSongConfirm(event) {
    // get the selected song card
    const card = getSelectedElement();
    const { songId } = getSongDataFromCard(card);

    // call the api to delete the song
    apiSongDelete(songId)
        .then(() => {
            // deselect the song card and update button styles
            removeElement(card);
            updateButtonStylesForSelection(getSelectedElement());

            // remove from the drag and drop system
            const dragDropEvent = new CustomEvent('removeSongCard', {
                detail: { card }
            });
            document.dispatchEvent(dragDropEvent);

            // remove the song card from the DOM
            const container = card.parentElement;
            container.removeChild(card);
        })
        .catch(error => {
            // handle the error if the API call fails
            console.error('Failed to delete song:', error);
            toastSystem.showError('Failed to delete the song. Please try again.');
        });
}

/**
 * Create song lyrics for the selected song.
 * This function is typically called as an event handler for a button click.
 */
function createSongLyrics() {
    // placeholder function - implementation to be added
}
