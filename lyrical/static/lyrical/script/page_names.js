import { apiSongDelete } from './api_song_delete.js';
import { apiSongEdit } from './api_song_edit.js';
import { makeVerticallyResizable } from './util_sliders_vertical.js'
import { makeHorizontallyResizable } from './util_sliders_horizontal.js'
import { DragDropSystem } from './util_dragdrop.js';


document.addEventListener('DOMContentLoaded', () => {
    // Setup the resize elements of the page
    setupResizeElements();

    // Bind the generate song names button
    document.getElementById('btn-generate-song-names').onclick = generateSongNames;

    // Register the song cards
    registerSongCards();

    // Initialize Drag and Drop
    initDragDropSystem();
});


/*
 * Generate song names
 */
function generateSongNames() {
    alert("Generate Song Names")
}


/*
 * Setup the horizontal and vertical resizable elements
 */
function setupResizeElements() {    
    // Make the panel header resizable
    makeVerticallyResizable(
        document.getElementById('panel-top-content'),
        document.getElementById('panel-vertical-splitter'),
        document.getElementById('panel-bottom-content')
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


/*
 * Initialize the drag and drop system
 */
function initDragDropSystem() {
    // Create the drag and drop system
    const dragDropSystem = new DragDropSystem();

    // Initialise it
    dragDropSystem.init({
        onDragStart: (item, event) => {
            // TODO: Move to system
            item.element.classList.add('opacity-50');
        },
        onDrop: (item, zone, event) => {
            // TODO: Move to system
            zone.element.appendChild(item.element);
            item.element.classList.remove('opacity-50');

            // Make an API call to update the song on the backend
            if (item.data.originalZone != zone.name) {
                // TODO:
            }
        },
        canDrop: (item, zone, event) => {
            // Allow dropping anywhere for now
            return true;
        },
        onDragEnterZone: (item, zone, event) => {
            zone.element.classList.add('bg-primary-focus', 'opacity-50');
        },
        onDragLeaveZone: (item, zone, event) => {
            zone.element.classList.remove('bg-primary-focus', 'opacity-50');
        }
    });

    // Register Draggable Items (Song Cards)
    document.querySelectorAll('.song-card').forEach(card => {
        registerCardForDragDrop(card, dragDropSystem);
    });

    // Register Drop Zones (Containers)
    registerZoneForDragDrop('liked-songs-container', dragDropSystem);
    registerZoneForDragDrop('new-songs-container', dragDropSystem);
    registerZoneForDragDrop('disliked-songs-container', dragDropSystem);
}


/*
 * Register a drop zone for the drag and drop system
 * @param {string} zoneId - The ID of the drop zone element
 * @param {DragDropSystem} dragDropSystem - The drag and drop system instance
 */
function registerZoneForDragDrop(zoneId, dragDropSystem) {
    const container = document.getElementById(zoneId);
    if (container) dragDropSystem.registerDropZone(container, { 
        name: container.dataset.zoneName 
    });
}


/*
 * Register a card for the drag and drop system
 * @param {HTMLElement} card - The card element to register
 * @param {DragDropSystem} dragDropSystem - The drag and drop system instance
 */
function registerCardForDragDrop(card, dragDropSystem) {
    const songId = card.dataset.songId;
    const songName = card.dataset.songName;
    const originalZone = card.closest('[data-drop-zone="true"]').dataset.zoneName; // Get initial zone
    dragDropSystem.registerDraggable(card, { songId, songName, originalZone });
}

/*
 * Register the song cards' edit and delete buttons
 */
function registerSongCards() {
    Array.from(document.getElementsByClassName('btn-song-edit')).forEach(element => {
        element.onclick = (event) => { songEditButtonClick(element) };
    });
    Array.from(document.getElementsByClassName('btn-song-delete')).forEach(element => {
        element.onclick = (event) => { songDeleteButtonClick(element) };
    });
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
    document.getElementById(`song-input-${songId}`).focus();
    document.getElementById(`song-input-${songId}`).select();

    // event handler for clicking the save button
    document.getElementById(`song-save-${songId}`).onclick = (event) => {

        // get the new song name that was entered
        const inputField = `song-input-${songId}`;
        const songName = document.getElementById(inputField).value;

        // call the API to update the song name on the backend
        if (apiSongEdit(songId, songName)) {
            // update the text on the song card
            document.getElementById(`song-text-${songId}`).innerHTML = songName;

            // swap the visible elements of the card back to the default
            hideSongCardElements(['input', 'save', 'cancel'], songId);
            showSongCardElements(['text', 'edit', 'delete'], songId);
        } else {
            // API call returned and error, do nothing
            console.log('apiSongEdit() returned an error, check the log.')
        }
    }

    // event handler for clicking the cancel button
    document.getElementById(`song-cancel-${songId}`).onclick = (event) => {

        // swap the visible elements of the card back to the default
        hideSongCardElements(['input', 'save', 'cancel'], songId);
        showSongCardElements(['text', 'edit', 'delete'], songId);
    }
}


/*
 * Handle the click event for the delete button on a song card
 * @param {HTMLElement} element - The delete button element
 */
function songDeleteButtonClick(element) {
    document.getElementById('modal-delete-yes').onclick = (event) => {
        if (apiSongDelete(element.dataset.songId)) {
            const card = element.parentElement.parentElement;
            const container = card.parentElement;
            container.removeChild(card);
        }
    }
    const card = element.parentElement.parentElement;
    document.getElementById('modal-delete-message').innerHTML = `Are you sure you want to delete the song: '${card.dataset.songName}'?`;
    document.getElementById('modal-delete').showModal();
}
