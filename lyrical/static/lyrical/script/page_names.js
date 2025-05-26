import { apiSongAdd } from './api_song_add.js';
import { apiSongDelete } from './api_song_delete.js';
import { apiSongEdit } from './api_song_edit.js';
import { apiSongEditBulk } from './api_song_edit_bulk.js';
import { apiRenderComponent } from './api_render_component.js'; 
import { makeVerticallyResizable } from './util_sliders_vertical.js'
import { makeHorizontallyResizable } from './util_sliders_horizontal.js'
import { DragDropSystem } from './util_dragdrop.js';
import { SelectSystem } from './util_select.js';
import { ToastSystem } from './util_toast.js';
import { StreamHelper } from "./util_stream_helper.js";
import { setNavigationNext, setNavigationPrevious, setNavigationIndex, setNavigationRange } from './util_navigation.js';


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
 * Declare the stream helper at the module level
 */
let streamHelper;


/**
 * Initialize the page when the DOM is fully loaded
 */
document.addEventListener('DOMContentLoaded', () => {
    // Setup the resize elements of the page
    setupResizeElements();

    // Initialize the toast system
    initToastSystem();

    // Cannot navigate back from this page
    setNavigationIndex(1);
    setNavigationPrevious(false);

    // Bind the add song names button
    document.getElementById('btn-add-song-name').onclick = addSongName;
    document.getElementById('btn-dislike-all-new-song-names').onclick = dislikeAllNewSongNames;
    document.getElementById('btn-create-song-lyrics').onclick = createSongLyrics;
    document.getElementById('btn-archive-all-disliked-song-names').onclick = archiveAllDislikedSongNames;

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

    // Initialise the Stream Handler
    initStreamHandler();
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

    // when a new card is created, change its background color to a brighter color until it
    // is clicked on once.
    newCard.classList.remove('bg-base-200');
    newCard.classList.add('bg-neutral');

    // the first time the card is clicked, change it's background back to the regualr color
    const handleClickOnce = () => {
        newCard.classList.remove('bg-neutral');
        newCard.classList.add('bg-base-200');
        newCard.removeEventListener('click', handleClickOnce);
    };

    // add the event listner to the new card to revert the background color
    newCard.addEventListener('click', handleClickOnce);
    
    // register the new song card for drag and drop
    registerCardForDragDrop(newCard, dragDropSystem);

    // register the new song card for selection
    registerCardForSelect(newCard, selectSystem);

    // sort the cards alphabetically
    sortCardsInPanel('panel-top-content');
}


/**
 * Setup the horizontal and vertical resizable elements on the page.
 */
function setupResizeElements() {    
    // make the panel header resizable with auto-sizing to fit bottom content
    makeVerticallyResizable(
        document.getElementById('panel-top-content'),
        document.getElementById('panel-vertical-splitter'),
        document.getElementById('panel-bottom-content'),
        { autoSizeToFitBottomContent: true }
    );
    // make the first panel splitter resizable
    makeHorizontallyResizable(
        document.getElementById('panel2'), 
        document.getElementById('splitter1'), 
        document.getElementById('panel1'));
    // make the second panel splitter resizable
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
        registerCardForDragDrop(card, dragDropSystem);
    });
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
        console.log(`moving song ${songId} to stage ${songStage}.`)
        apiSongEdit(songId, { song_stage: songStage })
            .then(() => {
                console.log(`successfully moved song ${songId} to stage ${songStage}.`)

                // update the card's song stage
                item.element.dataset.songStage = songStage;

                // update the ui buttons enabled and disabled states
                updateButtonStylesForSelection(selectSystem.getSelectedElement());

                // sort the cards in the new container
                sortCardsInPanel(item.element.parentElement.id);
            })
            .catch(error => {
                console.error(`failed to move song ${songId} to stage ${songStage}:`, error)
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
 * @param {DragDropSystem} dragDropSystem - The drag and drop system instance.
 */
function registerCardForDragDrop(card, dragDropSystem) {
    const songId = card.dataset.songId;
    const songName = card.dataset.songName;
    const originalZone = card.closest('[data-drop-zone="true"]').dataset.zoneName; // get initial zone
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
    // set the selection style for the song cards
    const selectionStyleToAdd = ['border-2', 'border-primary']; // ['outline-4', 'outline-offset-0', 'outline-primary'];
    const selectionStyleToRemove = ['border-base-300'];

    // create the select system and assign to module-level variable
    selectSystem = new SelectSystem();

    // initialise the select system
    selectSystem.init(
        {
            allowMultiSelect: false,
            allowSelectOnClick: true,
            allowDeselectOnClick: false,
            allowNoSelection: true,
            autoSelectFirstElement: false,
            canDeselectOnEscape: true,
            canDeselectOnClickAway: true,
            selectOnMouseDown: true
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
                // if no elements are selected, update the button styles to disabled
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
    // if there are no items left in the 'new' song names container, then disable the dislike all button,
    // otherwise enable it.
    const newItemsPanel = document.getElementById('panel-top-content');
    if (newItemsPanel) {
        console.log(`new panel child count: ${newItemsPanel.childElementCount}`)
        if (newItemsPanel.childElementCount === 0) {
            document.getElementById('btn-dislike-all-new-song-names').classList.add('btn-disabled');
        } else {
            document.getElementById('btn-dislike-all-new-song-names').classList.remove('btn-disabled');
        }
    }

    // if there are no items left in the 'disliked' song names container, then disable the archive all button,
    // otherwise enable it.
    const dislikedItemsPanel = document.getElementById('disliked-songs-container');
    if (dislikedItemsPanel) {
        console.log(`disliked panel child count: ${dislikedItemsPanel.childElementCount}`)
        if (dislikedItemsPanel.childElementCount === 0) {
            document.getElementById('btn-archive-all-disliked-song-names').classList.add('btn-disabled');
        } else {
            document.getElementById('btn-archive-all-disliked-song-names').classList.remove('btn-disabled');
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
        if (selectedElement.dataset.songStage === 'liked') {
            document.getElementById('btn-create-song-lyrics').classList.remove('btn-disabled');
            setNavigationNext(true);
        } else {
            document.getElementById('btn-create-song-lyrics').classList.add('btn-disabled');
            setNavigationNext(false);
        }
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
 * Dislike all new song names by moving them to the disliked stage.
 * This function is typically called as an event handler for a button click.
 */
function dislikeAllNewSongNames() {
    apiSongEditBulk({ song_stage_from: 'new', song_stage_to: 'disliked'})
        .then(data => {
            console.log(`Successfully moved all songs from new to disliked, id's: ${data}.`);

            // move each song card from the list of id's returned
            data.forEach(songId => {
                moveSongCardById(songId, 'disliked-songs-container')
            });

            // potentially re-select or update selection if needed
            updateButtonStylesForSelection(selectSystem.getSelectedElement());

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
                dragDropSystem.unregisterDraggable(card);

                // remove the song card from the select system
                selectSystem.removeElement(card);

                // remove the song card from the container
                songsContainer.removeChild(card);
            });

            // potentially re-select or update selection if needed
            updateButtonStylesForSelection(selectSystem.getSelectedElement());
        })
        .catch(error => {
            console.error(`Failed to move all new songs to disliked:`, error);
            toastSystem.showError('Failed to move one or more songs. Please try again.');
        });
}


/**
 * Create song lyrics for the selected song.
 * This function is typically called as an event handler for a button click.
 */
function createSongLyrics() {
    // placeholder function - implementation to be added
}


/**
 * Move a song card to a new container by song ID.
 * @param {string} songId - The ID of the song to move.
 * @param {string} newContainer - The ID of the destination container.
 */
function moveSongCardById(songId, newContainer) {
    console.log(`Moving song card: ${songId}`);

    // get the destination panel and the song card
    const destinationPanel = document.getElementById(newContainer);
    const songCard = document.getElementById(`song-card-${songId}`);

    if (destinationPanel && songCard) {
        // move the song card
        destinationPanel.appendChild(songCard);

        // update the cards stage
        songCard.dataset.songStage = destinationPanel.dataset.zoneName;

        // update the drag drop zone
        console.log(`setting the card's drag and drop zone to: ${destinationPanel.dataset.zoneName}`)
        dragDropSystem.updateItemData(songCard, { originalZone: destinationPanel.dataset.zoneName });
    } else {
        console.error(`Error occured moving song card for songId: ${songId} to container ${newContainer}`)
    }
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


/**
 * Sort song cards alphabetically within a panel.
 * @param {string} panelName - The ID of the panel containing the cards to sort.
 */
function sortCardsInPanel(panelName) {
    const panel = document.getElementById(panelName);
    if (!panel) {
        console.error(`Panel with ID ${panelName} not found.`);
        return;
    }

    // get all child elements (song cards) of the panel
    const cards = Array.from(panel.children);

    // sort the cards alphabetically by their songName dataset property
    cards.sort((a, b) => {
        const nameA = a.dataset.songName ? a.dataset.songName.toLowerCase() : '';
        const nameB = b.dataset.songName ? b.dataset.songName.toLowerCase() : '';
        if (nameA < nameB) {
            return -1;
        }
        if (nameA > nameB) {
            return 1;
        }
        return 0;
    });

    // remove existing cards from the panel
    while (panel.firstChild) {
        panel.removeChild(panel.firstChild);
    }

    // append sorted cards back to the panel
    cards.forEach(card => {
        panel.appendChild(card);
    });
}


/**
 * Initialize the stream handler and set up event listeners.
 * Sets up the generate button click handler and creates the stream helper.
 */
function initStreamHandler() {
    const generateButton = document.getElementById('btn-generate-song-names');
    if (!generateButton) return;

    streamHelper = createStreamHelper();
    generateButton.addEventListener('click', handleGenerateClick);
}


/**
 * Handle the generate button click event.
 * Builds request parameters and initiates the stream request.
 */
function handleGenerateClick() {
    const requestParams = buildRequestParams();
    streamHelper.initiateRequest(requestParams);
}


/**
 * Create and configure the stream helper.
 * Sets up callbacks for handling stream events and data.
 * @returns {StreamHelper} Configured stream helper instance.
 */
function createStreamHelper() {
    return new StreamHelper('/api_gen_song_names', {
        callbacks: {
            onPreRequest: () => {
                console.log("stream prerequest");
            },
            onIncomingData: (data) => {
                console.log(`incoming stream data ${JSON.stringify(data, null, 2)}`);
                handleIncomingData(data);
            },
            onStreamEnd: () => {
                console.log("stream end");
            },
            onComplete: () => {
                console.log("stream complete");
            },
            onError: (error) => {
                console.error("stream error:", error);
            }
        }
    });
}


/**
 * Build the request parameters for the stream.
 * Configures the parameters for generating song names.
 * @returns {Object} Request parameters object.
 */
function buildRequestParams() {
    return {
        prompt: 'song_names',
        include_themes: document.getElementById('input-include-themes').value,
        exclude_themes: document.getElementById('input-exclude-themes').value,
        include_words: document.getElementById('input-include-words').value,
        exclude_words: document.getElementById('input-exclude-words').value,
        starts_with: document.getElementById('input-starts-with').value,
        ends_with: document.getElementById('input-ends-with').value,
        count: parseInt(document.getElementById('input-count').value, 10),
        min_words: parseInt(document.getElementById('input-min-words').value, 10),
        max_words: parseInt(document.getElementById('input-max-words').value, 10)
    };
}


/**
 * Handle incoming data from the stream.
 * Processes new song data and adds it to the page.
 * @param {Object} data - The incoming song data containing id and name.
 */
function handleIncomingData(data) {
    if (data && data.id && typeof data.id === 'number') {
        addNewSongCard(data.id, data.name);
    } else {
        if (data && data.name) {
            console.error(`received LLM response without an id: ${data.name}.`)
        }
    }
}
