import { apiSongDelete } from './api_song_delete.js';
import { apiSongEdit } from './api_song_edit.js';


/*
 * Register the song cards' edit and delete buttons
 */
export function initSongCards() {
    // Bind the click events for the song edit and delete buttons
    Array.from(document.getElementsByClassName('btn-song-edit')).forEach(element => {
        element.onclick = (event) => { songEditButtonClick(element) };
    });
    Array.from(document.getElementsByClassName('btn-song-delete')).forEach(element => {
        element.onclick = (event) => { songDeleteButtonClick(element) };
    });
    
    // Bind the hover events for the song cards
    document.querySelectorAll('.song-card').forEach(card => {
        // Get the song ID from the card
        const songId = card.dataset.songId;

        // Show the song card hover elements when hovering over the card
        card.onmouseover = (event) => {
            showSongCardElements(['hover'], songId);
        }
        // Hide the song card hover elements when not hovering over the card
        card.onmouseout = (event) => {
            hideSongCardElements(['hover'], songId);
        }
    });
}


/*
 * Initialise a new song card
 */
export function initSongCard(songCard) {
    // Get the song ID from the card
    const songId = songCard.dataset.songId;

    // Show the song card hover elements when hovering over the card
    songCard.onmouseover = (event) => {
        showSongCardElements(['hover'], songId);
    }
    // Hide the song card hover elements when not hovering over the card
    songCard.onmouseout = (event) => {
        hideSongCardElements(['hover'], songId);
    }

    // Get the edit and delete buttons from the card
    const btnEdit = document.getElementById(`song-edit-${songId}`);
    const btnDelete = document.getElementById(`song-delete-${songId}`);

    // Bind the click events for the song edit and delete buttons
    btnEdit.onclick = (event) => { songEditButtonClick(btnEdit) };
    btnDelete.onclick = (event) => { songDeleteButtonClick(btnDelete) };
}


/*
 * Show the song card elements
 * @param {Array} elementNameList - List of element names to show
 * @param {string} songId - The ID of the song
 */
function showSongCardElements(elementNameList, songId) {
    elementNameList.forEach(name => {
        const elementId = `song-${name}-${songId}`;
        document.getElementById(elementId).classList.remove('hidden');
    })
}


/*
 * Hide the song card elements
 * @param {Array} elementNameList - List of element names to hide
 * @param {string} songId - The ID of the song
 */
function hideSongCardElements(elementNameList, songId) {
    elementNameList.forEach(name => {
        const elementId = `song-${name}-${songId}`;
        document.getElementById(elementId).classList.add('hidden');
    })
}


/*
 * Handle the click event for the edit button on a song card
 * @param {HTMLElement} element - The edit button element
 */
function songEditButtonClick(element) {
    const songId = element.dataset.songId;

    // swap the visible elements of the card
    hideSongCardElements(['text', 'edit', 'delete'], songId);
    showSongCardElements(['input', 'save', 'cancel'], songId);

    // set focus to the input control
    const songInput = document.getElementById(`song-input-${songId}`);
    songInput.focus();
    songInput.select();

    // Function to handle saving the song name
    const saveSongName = () => {
        // get the new song name that was entered
        const songName = songInput.value;

        // call the API to update the song name on the backend
        apiSongEdit(songId, songName)
            .then(() => {
                // update the text on the song card
                document.getElementById(`song-text-${songId}`).innerHTML = songName;
                // Update the data-song-name attribute on the card itself for consistency
                songInput.closest('.song-card').dataset.songName = songName;

                // swap the visible elements of the card back to the default
                hideSongCardElements(['input', 'save', 'cancel'], songId);
                showSongCardElements(['text', 'edit', 'delete'], songId);
            })
            .catch(error => {
                console.error('Failed to edit song:', error);
                // TODO: Add visual error display to user
            });
    };

    // event handler for clicking the save button
    document.getElementById(`song-save-${songId}`).onclick = saveSongName;

    // event handler for pressing Enter in the input field
    songInput.onkeydown = (event) => {
        if (event.key === 'Enter') {
            event.preventDefault(); // Prevent default form submission if any
            saveSongName();
        }
    };

    // event handler for clicking the cancel button
    document.getElementById(`song-cancel-${songId}`).onclick = (event) => {

        // swap the visible elements of the card back to the default
        hideSongCardElements(['input', 'save', 'cancel'], songId);
        showSongCardElements(['text', 'edit', 'delete'], songId);
    }
}


/*
 * Handle the click event for the delete button on the modal
 * @param {HTMLElement} element - The delete button element
 */
function songDeleteButtonClick(element) {
    document.getElementById('modal-delete-yes').onclick = (event) => {
        apiSongDelete(element.dataset.songId)
            .then(() => {
                const card = element.parentElement.parentElement.parentElement;
                const container = card.parentElement;
                container.removeChild(card);
            })
            .catch(error => {
                console.error('Failed to delete song:', error);
                // TODO: Add visual error display to user
            });
    }
    const card = element.parentElement.parentElement;
    document.getElementById('modal-delete-message').innerHTML = `Are you sure you want to delete the song: '${card.dataset.songName}'?`;
    document.getElementById('modal-delete').showModal();
}
