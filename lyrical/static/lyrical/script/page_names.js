import { apiSongAdd } from './api_song_add.js';
import { apiSongDelete } from './api_song_delete.js';
import { apiSongEdit } from './api_song_edit.js';
import { apiRenderComponent } from './api_render_component.js'; 
import { makeVerticallyResizable } from './util_sliders_vertical.js'
import { makeHorizontallyResizable } from './util_sliders_horizontal.js'
import { DragDropSystem } from './util_dragdrop.js';
import { SelectSystem } from './util_select.js';
import { ToastSystem } from './util_toast.js';


/**
 * Declare dragDropSystem at the module level
 */
let dragDropSystem; 


/**
 * Declare selectSystem at the module level
 */
let selectSystem;


/**
 * Declare the toast system at the module level
 */
let toastSystem;


/**
 * Initialize the page when the DOM is fully loaded
 */
document.addEventListener('DOMContentLoaded', () => {
    // Setup the resize elements of the page
    setupResizeElements();

    // Initialize the toast system
    initToastSystem();

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

    // Initialize Drag and Drop
    initDragDropSystem();

    // Initialize Select System
    initSelectSystem();
});


/**
 * Initialize the toast system.
 * Creates and configures the toast system for displaying user feedback messages.
 */
function initToastSystem() {
    // create the toast system and assign to module-level variable
    toastSystem = new ToastSystem();

    // initialize the toast system
    toastSystem.init();
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
    document.getElementById('modal-textinput-message').innerHTML = 'Enter the new song name:'
    document.getElementById('modal-textinput-text').value = ''

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
    const newSongName = document.getElementById('modal-textinput-text').value;
    console.log(`New song name: ${newSongName}.`)

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
    apiRenderComponent('card_song', 'panel-top-content', { song: { id: songId, name: songName, stage: 'new' }})
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
    
    // register the new song card for drag and drop
    registerCardForDragDrop(newCard, dragDropSystem);

    // register the new song card for selection
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

    // initialise it
    dragDropSystem.init({
        onDragStart: (item, event) => {
        },
        onDrop: (item, zone, event) => {
            // check if the song is being dropped into a new zone or not
            if (item.data.originalZone != zone.name) {
                item.data.originalZone = zone.name;

                // get the song Id and the name of the new stage
                const songId = item.element.dataset.songId;
                const songStage = zone.name;

                // call the API
                console.log(`moving song ${songId} to stage ${songStage}.`)
                apiSongEdit(songId, { song_stage: songStage })
                    .then(() => {
                        console.log(`successfully moved song ${songId} to stage ${songStage}.`)
                        updateButtonStylesForSelection(selectSystem.getSelectedElement());
                    })
                    .catch(error => {
                        console.error(`failed to move song ${songId} to stage ${songStage}:`, error)
                        toastSystem.showError('Failed to move the song. Please try again.');
                    });
            }
        },
        canDrop: (item, zone, event) => {
            // allow dropping anywhere for now
            return true;
        },
        onDragEnterZone: (item, zone, event) => {
        },
        onDragLeaveZone: (item, zone, event) => {
        }
    });

    // register draggable items (song cards)
    document.querySelectorAll('.song-card').forEach(card => {
        registerCardForDragDrop(card, dragDropSystem);
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

    // create the select system and assign to module-level variable
    selectSystem = new SelectSystem();

    // initialise the select system
    selectSystem.init(
        {
            allowMultiSelect: false,
            allowSelectOnClick: true,
            allowDeselectOnClick: true,
            allowNoSelection: true,
            autoSelectFirstElement: false,
            canDeselectOnEscape: true,
            canDeselectOnClickAway: true
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
            },
            onAfterElementChanged: (allSelectedElements, changedElement) => {
                // If no elements are selected, update the button styles to disabled
                const selectedElement = selectSystem.getSelectedElement();
                if (selectedElement === null) {
                    updateButtonStylesForSelection(null);
                }
            }
        }
    );

    // begin with all buttons disabled
    updateButtonStylesForSelection(null)

    // register existing song cards with the select system
    document.querySelectorAll('.song-card').forEach(card => {
        selectSystem.addElement(card);
    });

    // register click away elements
    selectSystem.addClickAwayElement(document.getElementById('liked-songs-container'));
    selectSystem.addClickAwayElement(document.getElementById('disliked-songs-container'));
    selectSystem.addClickAwayElement(document.getElementById('panel-top-content'));
}


/**
 * Update the button styles based on the selected song card.
 * @param {HTMLElement} selectedElement - the selected song card element
 */
function updateButtonStylesForSelection(selectedElement) {
    if (selectedElement === null) {
        // use querySelectorAll with attribute selectors to find all relevant edit and delete buttons
        // and add the 'btn-disabled' class to them
        document.querySelectorAll('[id$="-edit-song-name"], [id$="-delete-song-name"]').forEach(button => {
            button.classList.add('btn-disabled');
        });
        
        return;
    }

    // get the parent container of the selected element
    const parentContainer = selectedElement.parentElement;

    // associate buttons with their respective containers
    const associatedButtons = [
        {'liked-songs-container': ['liked', 'disliked', 'new']},
        {'disliked-songs-container': ['disliked', 'liked', 'new']},
        {'panel-top-content': ['new', 'liked', 'disliked']}
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
 * Edit the name of the selected song.
 * This function is typically called as an event handler for a button click.
 */
function editSongName() {
    // get the selected song card
    const card = selectSystem.getSelectedElement();

    // check that a card is selected
    if (!card) {
        console.error('No song card is selected for edit.');
        return;
    }

    // get the song id and name from the card
    const songId = card.dataset.songId;
    const songName = card.dataset.songName;
    console.log(`Editing the song name [${songName}] for songId: ${songId}`);

    // set event handler for the ok button
    document.getElementById('modal-textinput-ok').onclick = handleEditSongConfirm;

    // set event handler for the cancel button
    document.getElementById('modal-textinput-cancel').onclick = handleEditSongCancel;

    // set the dialog params
    document.getElementById('modal-textinput-title').innerHTML = 'Edit Song Name';
    document.getElementById('modal-textinput-message').innerHTML = 'Enter the new song name:'
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
    const card = selectSystem.getSelectedElement();
    const songId = card.dataset.songId;
    const newSongName = document.getElementById('modal-textinput-text').value;
    console.log(`New song name: ${newSongName}.`)

    // call the api to update the song name
    apiSongEdit(songId, { song_name: newSongName })
        .then(songId => {
            // update the text on the song card
            console.log(`Successfully updated song name for songId: ${songId}`);
            document.getElementById(`song-text-${songId}`).innerHTML = newSongName;
            card.dataset.songName = newSongName;
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
    document.getElementById('modal-delete-yes').onclick = handleDeleteSongConfirm;

    // show the delete confirmation dialog
    document.getElementById('modal-delete-message').innerHTML = `Are you sure you want to delete the song: '${card.dataset.songName}'?`;
    document.getElementById('modal-delete').showModal();
}


/**
 * Handle the confirmation of deleting a song.
 * @param {Event} event - The click event that triggered the function.
 */
function handleDeleteSongConfirm(event) {
    // get the selected song card
    const card = selectSystem.getSelectedElement();
    const songId = card.dataset.songId;

    // call the api to delete the song
    apiSongDelete(songId)
        .then(() => {
            // deselect the song card and update button styles
            selectSystem.removeElement(card);
            updateButtonStylesForSelection(selectSystem.getSelectedElement());

            // remove from the drag and drop system
            dragDropSystem.unregisterDraggable(card);

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




