import { initSongCards } from './c_card_song.js'
import { apiSongStage } from './api_song_stage.js';
import { makeVerticallyResizable } from './util_sliders_vertical.js'
import { makeHorizontallyResizable } from './util_sliders_horizontal.js'
import { DragDropSystem } from './util_dragdrop.js';


document.addEventListener('DOMContentLoaded', () => {
    // Setup the resize elements of the page
    setupResizeElements();

    // Bind the generate song names button
    document.getElementById('btn-generate-song-names').onclick = generateSongNames;

    // Register the song cards
    initSongCards();

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


