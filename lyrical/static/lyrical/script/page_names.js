import { initSongCards, initSongCard } from './c_card_song.js'
import { apiSongStage } from './api_song_stage.js';
import { apiSongAdd } from './api_song_add.js';
import { apiRenderComponent } from './api_render_component.js'; 
import { makeVerticallyResizable } from './util_sliders_vertical.js'
import { makeHorizontallyResizable } from './util_sliders_horizontal.js'
import { DragDropSystem } from './util_dragdrop.js';
import { SelectSystem } from './util_select.js';


/**
 * Declare dragDropSystem at the module level
 */
let dragDropSystem; 


/**
 * Initialize the page when the DOM is fully loaded
 */
document.addEventListener('DOMContentLoaded', () => {
    // Setup the resize elements of the page
    setupResizeElements();

    // Bind the generate song names button
    document.getElementById('btn-generate-song-names').onclick = generateSongNames;
    document.getElementById('btn-add-song-name').onclick = addSongName;

    // Register the song cards
    initSongCards();

    // Initialize Drag and Drop
    initDragDropSystem();

    // Initialize Select System
    initSelectSystem();
});


/**
 * Add a new song name
 */
function addSongName(element) {
    document.getElementById('modal-textinput-ok').onclick = (event) => {
        const newSongName = document.getElementById('modal-textinput-text').value;
        console.log(`New song name: ${newSongName}.`)

        apiSongAdd(newSongName)
            .then(songId => {
                // If apiSongAdd resolves, songId should be valid.
                // If songId were missing or invalid, apiSongAdd should have thrown an error,
                // which would be caught by the .catch block below.
                addNewSongCard(songId, newSongName);
            })
            .catch(error => {
                // TODO: Handle the error (e.g., show a user-friendly message)
                console.log('Failed to add the new song name:', error);
            });
    }

    document.getElementById('modal-textinput-cancel').onclick = (event) => {
        // stop the validator from triggering and close the modal
        document.getElementById('modal-textinput-text').value = ' ';
        document.getElementById('modal-textinput').close();
    }

    // set the dialog params
    document.getElementById('modal-textinput-title').innerHTML = 'Add Song Name';
    document.getElementById('modal-textinput-message').innerHTML = 'Enter the new song name:'
    document.getElementById('modal-textinput-text').value = ''
    
    // show the dialog and set focus to the input field after 50ms delay
    document.getElementById('modal-textinput').showModal();
    setTimeout(() => { document.getElementById('modal-textinput-text').focus(); }, 50);
}


/**
 * Add a new song card to the page
 * @param {string} songName - The name of the song to add
 */
function addNewSongCard(songId, songName) {
    apiRenderComponent('card_song', 'panel-top-content', { song: { id: songId, name: songName, stage: 'new' }})
        .then(html => {
            // Assuming initNewSongCard needs the songId and songName, 
            // and potentially the newly added HTML element if it can be identified.
            // For now, it just calls initNewSongCard with songId and songName as before.
            initNewSongCard(songId, songName);
        })
        .catch(error => {
            console.error('Failed to render or initialize new song card:', error);
            // TODO: Implement user-facing error handling here, e.g., show an alert.
        });
}


function initNewSongCard(songId, songName) {
    // Get the new song card
    const newCard = document.querySelector(`.song-card[data-song-id="${songId}"]`);

    // Check we found the new card
    if (!newCard) {
        console.error('Could not find the newly added song card for songId:', songId);
        return;
    }
    
    // Initialize the new song card
    initSongCard(newCard);

    // Register the new song card for drag and drop
    registerCardForDragDrop(newCard, dragDropSystem);
}


/**
 * Generate song names
 */
function generateSongNames() {
    alert("Generate Song Names")
}


/**
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


/**
 * Initialize the drag and drop system
 */
function initDragDropSystem() {
    // Create the drag and drop system and assign to module-level variable
    dragDropSystem = new DragDropSystem();

    // Initialise it
    dragDropSystem.init({
        onDragStart: (item, event) => {
        },
        onDrop: (item, zone, event) => {
            // Check if the song is being dropped into a new zone or not
            if (item.data.originalZone != zone.name) {
                item.data.originalZone = zone.name;

                // Get the song Id and the name of the new stage
                const songId = item.element.dataset.songId;
                const songStage = zone.name;

                // Call the API
                console.log(`moving song ${songId} to stage ${songStage}.`)
                if (!apiSongStage(songId, songStage)) {
                    console.log(`failed to move song ${songId} to stage ${songStage}.`)
                }
            }
        },
        canDrop: (item, zone, event) => {
            // Allow dropping anywhere for now
            return true;
        },
        onDragEnterZone: (item, zone, event) => {
        },
        onDragLeaveZone: (item, zone, event) => {
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


/**
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


/**
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


/**
 * Initialize the select system
 */
function initSelectSystem() {
}




