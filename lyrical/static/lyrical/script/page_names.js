import { initSongCards, initSongCard } from './c_card_song.js'
import { apiSongStage } from './api_song_stage.js';
import { apiSongAdd } from './api_song_add.js';
import { apiSongDelete } from './api_song_delete.js';
import { apiSongEdit } from './api_song_edit.js';
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
 * Declare selectSystem at the module level
 */
let selectSystem;


/**
 * Initialize the page when the DOM is fully loaded
 */
document.addEventListener('DOMContentLoaded', () => {
    // Setup the resize elements of the page
    setupResizeElements();

    // Bind the generate song names and add song buttons
    document.getElementById('btn-generate-song-names').onclick = generateSongNames;
    document.getElementById('btn-add-song-name').onclick = addSongName;

    // Bind the click events for the song edit and delete buttons
    document.getElementById('btn-liked-edit-song-name').onclick = editSongName;
    document.getElementById('btn-liked-delete-song-name').onclick = deleteSongName;
    document.getElementById('btn-disliked-edit-song-name').onclick = editSongName;
    document.getElementById('btn-disliked-delete-song-name').onclick = deleteSongName;
    document.getElementById('btn-new-edit-song-name').onclick = editSongName;
    document.getElementById('btn-new-delete-song-name').onclick = deleteSongName;

    // Register the song cards
    initSongCards();

    // Initialize Drag and Drop
    initDragDropSystem();

    // Initialize Select System
    initSelectSystem();
});


/**
 * Add a new song name.
 * This function is typically called as an event handler for a button click.
 * @param {Event} event - The click event that triggered the function.
 */
function addSongName(event) {
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
 * Add a new song card to the page by rendering it and then initializing it.
 * @param {string} songId - The ID of the song to add.
 * @param {string} songName - The name of the song to add.
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


/**
 * Initializes a newly added song card.
 * This includes setting up its interactions like drag-and-drop and selection.
 * @param {string} songId - The ID of the new song card.
 * @param {string} songName - The name of the new song.
 */
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

    // Register the new song card for selection
    registerCardForSelect(newCard, selectSystem);
}


/**
 * Generate song names (placeholder function).
 */
function generateSongNames() {
    alert("Generate Song Names")
}


/**
 * Setup the horizontal and vertical resizable elements on the page.
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
 * Initialize the drag and drop system.
 * Sets up callbacks for drag events and registers draggable items and drop zones.
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
 * Register a drop zone for the drag and drop system.
 * @param {string} zoneId - The ID of the drop zone element.
 * @param {DragDropSystem} dragDropSystem - The drag and drop system instance.
 */
function registerZoneForDragDrop(zoneId, dragDropSystem) {
    const container = document.getElementById(zoneId);
    if (container) dragDropSystem.registerDropZone(container, { 
        name: container.dataset.zoneName 
    });
}


/**
 * Register a card for the drag and drop system.
 * @param {HTMLElement} card - The card element to register.
 * @param {DragDropSystem} dragDropSystem - The drag and drop system instance.
 */
function registerCardForDragDrop(card, dragDropSystem) {
    const songId = card.dataset.songId;
    const songName = card.dataset.songName;
    const originalZone = card.closest('[data-drop-zone="true"]').dataset.zoneName; // Get initial zone
    dragDropSystem.registerDraggable(card, { songId, songName, originalZone });
}


/**
 * Register a card for the select system.
 * @param {HTMLElement} card - The card element to register.
 * @param {SelectSystem} selectSystem - The select system instance.
 */
function registerCardForSelect(card, selectSystem) {
    if (selectSystem && card) {
        selectSystem.addElement(card);
        selectSystem.selectElement(card);
    }
}


/**
 * Initialize the select system.
 * Sets up configuration and callbacks for selecting song cards.
 */
function initSelectSystem() {
    // Set the selection style for the song cards
    const selectionStyleToAdd = ['border-2', 'border-primary']; // ['outline-4', 'outline-offset-0', 'outline-primary'];
    const selectionStyleToRemove = ['border-base-300'];

    // Create the select system and assign to module-level variable
    selectSystem = new SelectSystem();

    // Initialise the select system
    selectSystem.init(
        {
            allowMultiSelect: false,
            allowSelectOnClick: true,
            allowDeselectOnClick: false,
            allowNoSelection: false,
            autoSelectFirstElement: true,
            canDeselectOnEscape: false,
            canDeselectOnClickAway: false
        },
        {
            onElementSelected: (element, allSelectedElements) => {
                element.classList.add(...selectionStyleToAdd);
                element.classList.remove(...selectionStyleToRemove);

                updateButtonStylesForSelection(element);
            },
            onElementDeselected: (element, allSelectedElements) => {
                element.classList.add(...selectionStyleToRemove);
                element.classList.remove(...selectionStyleToAdd);
            }
        }
    );

    // Register existing song cards with the select system
    document.querySelectorAll('.song-card').forEach(card => {
        selectSystem.addElement(card);
    });
}


/**
 * Update the button styles based on the selected song card.
 * @param {HTMLElement} selectedElement - the selected song card element
 */
function updateButtonStylesForSelection(selectedElement) {
    // Get the parent container of the selected element
    const parentContainer = selectedElement.parentElement;

    const associatedButtons = [
        {'liked-songs-container': ['liked', 'disliked', 'new']},
        {'disliked-songs-container': ['disliked', 'liked', 'new']},
        {'panel-top-content': ['new', 'liked', 'disliked']}
      ];

      associatedButtons.forEach(button => {
        const containerId = Object.keys(button)[0];
        const buttonTypes = button[containerId];

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











/*
 * 
 */
function editSongName() {
    // get the selected song card
    const card = selectSystem.getSelectedElement();

    // check that a card is selected
    if (!card) {
        console.error('No song card is selected for edit.');
        return;
    }

    // get the song id from the card
    const songId = card.dataset.songId;
    console.log(`Editing the song name for songId: ${songId}`);

    // show a new dialog with the current song name
    return;

    // set focus to the input control
    const songInput = document.getElementById(`song-input-${songId}`);
    songInput.focus();
    songInput.select();

    // Function to handle saving the song name
    const saveSongName = () => {
        // get the new song name that was entered
        const songName = songInput.value;

        // call the API to update the song name on the backend
        if (apiSongEdit(songId, songName)) {
            // update the text on the song card
            document.getElementById(`song-text-${songId}`).innerHTML = songName;
            // Update the data-song-name attribute on the card itself for consistency
            songInput.closest('.song-card').dataset.songName = songName;

            // swap the visible elements of the card back to the default
            hideSongCardElements(['input', 'save', 'cancel'], songId);
            showSongCardElements(['text', 'edit', 'delete'], songId);
        } else {
            // API call returned and error, do nothing
            console.log('apiSongEdit() returned an error, check the log.')
        }
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
 * 
 * 
 */
function deleteSongName() {
    // get the selected song card
    const card = selectSystem.getSelectedElement();

    // check that a card is selected
    if (!card) {
        console.error('No song card is selected for deletion.');
        return;
    }

    // get the song id from the card
    const songId = card.dataset.songId;
    console.log(`Deleting song name for songId: ${songId}`);

    // set the event handler for the delete confirmation dialog
    document.getElementById('modal-delete-yes').onclick = (event) => {
        if (apiSongDelete(songId)) {
            const container = card.parentElement;
            container.removeChild(card);
        }
    }

    // show the delete confirmation dialog
    document.getElementById('modal-delete-message').innerHTML = `Are you sure you want to delete the song: '${card.dataset.songName}'?`;
    document.getElementById('modal-delete').showModal();

    // TODO: Remove from the drag and drop system

    // TODO: Remove from the select system

    // TODO: Make sure a new song card is selected, otherwise disable all edit and delete buttons

}




