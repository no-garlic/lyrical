/**
 * Names page - Combined functionality
 * Handles song name generation, management, selection, drag-drop, and bulk operations
 */

// External imports
import { makeHorizontallyResizable } from './util_sliders_horizontal.js';
import { setNavigationIndex, setNavigationPrevious, setNavigationNext } from './util_navigation.js';
import { SelectSystem } from './util_select.js';
import { DragDropSystem } from './util_dragdrop.js';
import { StreamHelper } from "./util_stream_helper.js";
import { toastSystem } from './util_toast.js';

// API imports
import { apiSongAdd } from './api_song_add.js';
import { apiSongDelete } from './api_song_delete.js';
import { apiSongEdit } from './api_song_edit.js';
import { apiSongEditBulk } from './api_song_edit_bulk.js';
import { apiRenderComponent } from './api_render_component.js';

// =============================================================================
// GLOBAL VARIABLES
// =============================================================================

let selectSystem;
let dragDropSystem;
let streamHelper;

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize the page when the DOM is fully loaded
 */
document.addEventListener('DOMContentLoaded', () => {
    setupResizeElements();
    setupNavigation();
    initializeAllSystems();
});

/**
 * Setup navigation state
 */
function setupNavigation() {
    setNavigationIndex(1);
    setNavigationPrevious(false);
}

/**
 * Setup the horizontal resizable elements on the page
 */
function setupResizeElements() {
    makeHorizontallyResizable(
        document.getElementById('panel3'), 
        document.getElementById('splitter2'), 
        document.getElementById('panel2')
    );
    
    makeHorizontallyResizable(
        document.getElementById('panel4'), 
        document.getElementById('splitter3'), 
        document.getElementById('panel3')
    );
}

/**
 * Initialize all subsystems in the correct order
 */
function initializeAllSystems() {
    initSelection();
    initDragDrop();
    initSongManagement();
    initBulkOperations();
    initGeneration();
    
    setupDragDropZones();
}

/**
 * Setup drop zones for the drag drop system
 */
function setupDragDropZones() {
    if (dragDropSystem) {
        dragDropSystem.registerDropZone(document.getElementById('new-songs-container'), { name: 'new', acceptedTypes: [] });
        dragDropSystem.registerDropZone(document.getElementById('liked-songs-container'), { name: 'liked', acceptedTypes: [] });
        dragDropSystem.registerDropZone(document.getElementById('disliked-songs-container'), { name: 'disliked', acceptedTypes: [] });
    }
}

// =============================================================================
// SELECTION SYSTEM
// =============================================================================

/**
 * Initialize the selection system
 */
function initSelection() {
    selectSystem = new SelectSystem();

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
                applySelectionStyles(element);
                updateButtonStatesForSelection(element);
            },
            onElementDeselected: (element, allSelectedElements) => {
                removeSelectionStyles(element);
            },
            onAfterElementChanged: (allSelectedElements, changedElement) => {
                const selectedElement = getSelectedElement();
                if (selectedElement === null) {
                    updateButtonStatesForSelection(null);
                }
            }
        }
    );

    updateButtonStatesForSelection(null);

    // Register existing song cards
    document.querySelectorAll('.song-card').forEach(card => {
        selectSystem.addElement(card);
    });

    // Register click away elements
    selectSystem.addClickAwayElement(document.getElementById('liked-songs-container'));
    selectSystem.addClickAwayElement(document.getElementById('disliked-songs-container'));
    selectSystem.addClickAwayElement(document.getElementById('new-songs-container'));

    // Handle Enter key for editing when no input focused
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            if (document.activeElement === document.body) {
                if (hasSelectedElement()) {
                    editSelectedSong();
                }
            }
        }
    });
}

/**
 * Register a card for selection
 */
function registerCardForSelection(card) {
    if (selectSystem && card) {
        selectSystem.addElement(card);
        selectSystem.selectElement(card);
    }
}

/**
 * Get the currently selected element
 */
function getSelectedElement() {
    return selectSystem ? selectSystem.getSelectedElement() : null;
}

/**
 * Remove an element from the selection system
 */
function removeElementFromSelection(element) {
    if (selectSystem) {
        selectSystem.removeElement(element);
    }
}

/**
 * Check if there is a selected element
 */
function hasSelectedElement() {
    return selectSystem ? selectSystem.hasSelectedElement() : false;
}

/**
 * Apply selection styles to an element
 */
function applySelectionStyles(element) {
    const selectionStyleToAdd = ['border-2', 'border-primary'];
    const selectionStyleToRemove = ['border-base-300'];
    
    element.classList.add(...selectionStyleToAdd);
    element.classList.remove(...selectionStyleToRemove);
}

/**
 * Remove selection styles from an element
 */
function removeSelectionStyles(element) {
    const selectionStyleToAdd = ['border-2', 'border-primary'];
    const selectionStyleToRemove = ['border-base-300'];
    
    element.classList.add(...selectionStyleToRemove);
    element.classList.remove(...selectionStyleToAdd);
}

// =============================================================================
// DRAG AND DROP SYSTEM
// =============================================================================

/**
 * Initialize the drag and drop system
 */
function initDragDrop() {
    dragDropSystem = new DragDropSystem();

    dragDropSystem.init({
        onDragStart: (item, event) => {
        },
        onDrop: handleCardDragDrop,
        canDrop: (item, zone, event) => {
            return true;
        },
        onDragEnterZone: (item, zone, event) => {
        },
        onDragLeaveZone: (item, zone, event) => {
        }
    });

    // Register existing draggable items
    document.querySelectorAll('.song-card').forEach(card => {
        registerCardForDragDrop(card);
    });
}

/**
 * Handle drag and drop of a song card
 */
function handleCardDragDrop(item, zone, event) {
    if (item.data.originalZone != zone.name) {
        item.data.originalZone = zone.name;

        const songId = item.element.dataset.songId;
        const songStage = zone.name;

        console.log(`moving song ${songId} to stage ${songStage}.`);
        apiSongEdit(songId, { song_stage: songStage })
            .then(() => {
                console.log(`successfully moved song ${songId} to stage ${songStage}.`);

                updateSongCardData(item.element, { songStage: songStage });
                updateButtonStatesForSelection(getSelectedElement());
                sortCardsInContainer(item.element.parentElement.id);
            })
            .catch(error => {
                console.error(`failed to move song ${songId} to stage ${songStage}:`, error);
                toastSystem.showError('Failed to move the song. Please try again.');
            });
    } else {
        sortCardsInContainer(item.element.parentElement.id);
    }
}

/**
 * Register a card for drag and drop
 */
function registerCardForDragDrop(card) {
    const { songId, songName } = getSongDataFromCard(card);
    const originalZone = card.closest('[data-drop-zone="true"]').dataset.zoneName;
    dragDropSystem.registerDraggable(card, { songId, songName, originalZone });
}

/**
 * Update drag drop item data
 */
function updateDragDropItemData(element, data) {
    if (dragDropSystem) {
        dragDropSystem.updateItemData(element, data);
    }
}

/**
 * Unregister a draggable element
 */
function unregisterDraggableElement(element) {
    if (dragDropSystem) {
        dragDropSystem.unregisterDraggable(element);
    }
}

// =============================================================================
// SONG MANAGEMENT
// =============================================================================

/**
 * Initialize song management system
 */
function initSongManagement() {
    // Bind buttons
    document.getElementById('btn-add-song-name').onclick = addSongName;
    document.getElementById('btn-liked-edit-song-name').onclick = editSelectedSong;
    document.getElementById('btn-liked-delete-song-name').onclick = deleteSelectedSong;
    document.getElementById('btn-disliked-edit-song-name').onclick = editSelectedSong;
    document.getElementById('btn-disliked-delete-song-name').onclick = deleteSelectedSong;
    document.getElementById('btn-new-edit-song-name').onclick = editSelectedSong;
    document.getElementById('btn-new-delete-song-name').onclick = deleteSelectedSong;
    document.getElementById('btn-create-song-lyrics').onclick = createSongLyrics;
}

/**
 * Add a new song name
 */
function addSongName(event) {
    document.getElementById('modal-textinput-ok').onclick = handleAddSongConfirm;
    document.getElementById('modal-textinput-cancel').onclick = handleAddSongCancel;

    document.getElementById('modal-textinput-title').innerHTML = 'Add Song Name';
    document.getElementById('modal-textinput-message').innerHTML = 'Enter the new song name:';
    document.getElementById('modal-textinput-text').value = '';

    document.getElementById('modal-textinput').showModal();
    setTimeout(() => { document.getElementById('modal-textinput-text').focus(); }, 50);
}

/**
 * Handle add song confirmation
 */
function handleAddSongConfirm(event) {
    const newSongName = document.getElementById('modal-textinput-text').value.trim();
    console.log(`New song name: ${newSongName}.`);

    apiSongAdd(newSongName)
        .then(songId => {
            addNewSongCard(songId, newSongName);
        })
        .catch(error => {
            console.error('Failed to add the new song name:', error);
            toastSystem.showError('Failed to add the song. Please try again.');
        });
}

/**
 * Handle add song cancellation
 */
function handleAddSongCancel(event) {
    document.getElementById('modal-textinput-text').value = ' ';
    document.getElementById('modal-textinput').close();
}

/**
 * Add a new song card to the page
 */
function addNewSongCard(songId, songName) {
    apiRenderComponent('card_song', 'new-songs-container', { song: { id: songId, name: songName, stage: 'new' }})
        .then(html => {
            initializeNewSongCard(songId, songName);
        })
        .catch(error => {
            console.error('Failed to render or initialize new song card:', error);
            toastSystem.showError('Failed to display the new song. Please refresh the page.');
        });
}

/**
 * Initialize a newly added song card
 */
function initializeNewSongCard(songId, songName) {
    const newCard = document.querySelector(`.song-card[data-song-id="${songId}"]`);

    if (!newCard) {
        console.error('Could not find the newly added song card for songId:', songId);
        return;
    }

    setupNewCardVisualState(newCard);
    registerCardForDragDrop(newCard);
    registerCardForSelection(newCard);
    sortCardsInContainer('new-songs-container');
}

/**
 * Edit the name of the selected song
 */
function editSelectedSong() {
    const card = getSelectedElement();

    if (!card) {
        console.error('No song card is selected for edit.');
        return;
    }

    const { songId, songName } = getSongDataFromCard(card);
    console.log(`Editing the song name [${songName}] for songId: ${songId}`);

    document.getElementById('modal-textinput-ok').onclick = handleEditSongConfirm;
    document.getElementById('modal-textinput-cancel').onclick = handleEditSongCancel;

    document.getElementById('modal-textinput-title').innerHTML = 'Edit Song Name';
    document.getElementById('modal-textinput-message').innerHTML = 'Enter the new song name:';
    document.getElementById('modal-textinput-text').value = songName;
    
    document.getElementById('modal-textinput').showModal();
    setTimeout(() => { document.getElementById('modal-textinput-text').focus(); }, 50);
}

/**
 * Handle edit song confirmation
 */
function handleEditSongConfirm(event) {
    const card = getSelectedElement();
    const { songId } = getSongDataFromCard(card);
    const newSongName = document.getElementById('modal-textinput-text').value.trim();
    console.log(`New song name: ${newSongName}.`);

    apiSongEdit(songId, { song_name: newSongName })
        .then(songId => {
            console.log(`Successfully updated song name for songId: ${songId}`);
            document.getElementById(`song-text-${songId}`).innerHTML = newSongName;
            card.dataset.songName = newSongName;
            sortCardsInContainer(card.parentElement.id);
        })
        .catch(error => {
            console.error('Failed to edit the song name:', error);
            toastSystem.showError('Failed to update the song name. Please try again.');
        });
}

/**
 * Handle edit song cancellation
 */
function handleEditSongCancel(event) {
    if (document.getElementById('modal-textinput-text').value === '') {
        document.getElementById('modal-textinput-text').value = ' ';
    }
    document.getElementById('modal-textinput').close();
}

/**
 * Delete the selected song
 */
function deleteSelectedSong() {
    const card = getSelectedElement();

    if (!card) {
        console.error('No song card is selected for deletion.');
        return;
    }

    const { songId, songName } = getSongDataFromCard(card);
    console.log(`Deleting song name for songId: ${songId}`);

    document.getElementById('modal-delete-yes').onclick = handleDeleteSongConfirm;

    document.getElementById('modal-delete-message').innerHTML = `Are you sure you want to delete the song: '${songName}'?`;
    document.getElementById('modal-delete').showModal();
}

/**
 * Handle delete song confirmation
 */
function handleDeleteSongConfirm(event) {
    const card = getSelectedElement();
    const { songId } = getSongDataFromCard(card);

    apiSongDelete(songId)
        .then(() => {
            removeElementFromSelection(card);
            updateButtonStatesForSelection(getSelectedElement());
            
            // Remove from drag and drop
            unregisterDraggableElement(card);

            // Remove from DOM
            const container = card.parentElement;
            container.removeChild(card);
        })
        .catch(error => {
            console.error('Failed to delete song:', error);
            toastSystem.showError('Failed to delete the song. Please try again.');
        });
}

/**
 * Create song lyrics for the selected song
 */
function createSongLyrics() {
    // placeholder function - implementation to be added
}

// =============================================================================
// BULK OPERATIONS
// =============================================================================

/**
 * Initialize bulk operations system
 */
function initBulkOperations() {
    document.getElementById('btn-dislike-all-new-song-names').onclick = dislikeAllNewSongs;
    document.getElementById('btn-archive-all-disliked-song-names').onclick = archiveAllDislikedSongs;
}

/**
 * Dislike all new song names
 */
function dislikeAllNewSongs() {
    apiSongEditBulk({ song_stage_from: 'new', song_stage_to: 'disliked'})
        .then(data => {
            console.log(`Successfully moved all songs from new to disliked, id's: ${data}.`);

            data.forEach(songId => {
                const moveResult = moveSongCardById(songId, 'disliked-songs-container');
                if (moveResult) {
                    updateDragDropItemData(moveResult.songCard, { originalZone: moveResult.destinationPanel.dataset.zoneName });
                }
            });

            updateButtonStatesForSelection(getSelectedElement());
            sortCardsInContainer('disliked-songs-container');
        })
        .catch(error => {
            console.error(`Failed to move all new songs to disliked:`, error);
            toastSystem.showError('Failed to move one or more songs. Please try again.');
        });
}

/**
 * Archive all disliked song names
 */
function archiveAllDislikedSongs() {
    apiSongEditBulk({ song_stage_from: 'disliked', song_stage_to: 'archived'})
        .then(data => {
            console.log(`Successfully moved all songs from disliked to archived, id's: ${data}.`);

            const songsContainer = document.getElementById('disliked-songs-container');

            data.forEach(songId => {
                console.log(`removing song card id: ${songId}`);
                const card = document.getElementById(`song-card-${songId}`);

                unregisterDraggableElement(card);
                removeElementFromSelection(card);
                songsContainer.removeChild(card);
            });

            updateButtonStatesForSelection(getSelectedElement());
        })
        .catch(error => {
            console.error(`Failed to move all disliked songs to archived:`, error);
            toastSystem.showError('Failed to move one or more songs. Please try again.');
        });
}

// =============================================================================
// GENERATION SYSTEM
// =============================================================================

/**
 * Initialize the generation system
 */
function initGeneration() {
    const generatingButton = document.getElementById('btn-generating-song-names');
    if (generatingButton) {
        generatingButton.disabled = true;
        generatingButton.classList.add('hidden', 'btn-disabled');
    }

    const generateButton = document.getElementById('btn-generate-song-names');
    if (generateButton) {
        streamHelper = createStreamHelper();
        generateButton.addEventListener('click', handleGenerateClick);
    }

    // Add Enter key support for inputs
    document.querySelectorAll('.input-control').forEach(inputControl => {
        if (inputControl) {
            inputControl.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    handleGenerateClick();
                }
            });
        }
    });
}

/**
 * Handle generate button click
 */
function handleGenerateClick() {
    const requestParams = buildGenerationRequestParams();
    streamHelper.initiateRequest(requestParams);
}

/**
 * Create and configure the stream helper
 */
function createStreamHelper() {
    return new StreamHelper('/api_gen_song_names', {
        callbacks: {
            onPreRequest: () => {
                console.log("stream prerequest");
                handleGenerationLoadingStart();
            },
            onIncomingData: (data) => {
                console.log(`incoming stream data ${JSON.stringify(data, null, 2)}`);
                handleGeneratedSongData(data);
            },
            onStreamEnd: () => {
                console.log("stream end");
            },
            onComplete: () => {
                console.log("stream complete");
                handleGenerationLoadingEnd();
            },
            onError: (error) => {
                console.error("stream error:", error);
                handleGenerationError(error);
            }
        }
    });
}

/**
 * Build request parameters for generation
 */
function buildGenerationRequestParams() {
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
 * Handle incoming song data from generation
 */
function handleGeneratedSongData(data) {
    if (data && data.id && typeof data.id === 'number') {
        addNewSongCard(data.id, data.name);
    } else {
        handleGenerationError(data);
    }
}

/**
 * Handle generation errors
 */
function handleGenerationError(error) {
    const errorStr = JSON.stringify(error, null, 2);
    toastSystem.showError(errorStr);
}

/**
 * Handle UI changes when generation starts
 */
function handleGenerationLoadingStart() {
    const generateButton = document.getElementById('btn-generate-song-names');
    const generatingButton = document.getElementById('btn-generating-song-names');
    
    if (generateButton) {
        generateButton.classList.add('hidden');
    }

    if (generatingButton) {
        generatingButton.classList.remove('hidden');
    }
}

/**
 * Handle UI changes when generation ends
 */
function handleGenerationLoadingEnd() {
    const generateButton = document.getElementById('btn-generate-song-names');
    const generatingButton = document.getElementById('btn-generating-song-names');
    
    if (generateButton) {
        generateButton.classList.remove('hidden');
    }

    if (generatingButton) {
        generatingButton.classList.add('hidden');
    }
}

// =============================================================================
// UI STATE MANAGEMENT
// =============================================================================

/**
 * Update button states based on selection and container counts
 */
function updateButtonStatesForSelection(selectedElement) {
    // Update bulk operation buttons based on container counts
    const newItemsCount = getContainerChildCount('new-songs-container');
    const dislikeAllButton = document.getElementById('btn-dislike-all-new-song-names');
    if (dislikeAllButton) {
        console.log(`new panel child count: ${newItemsCount}`);
        if (newItemsCount === 0) {
            dislikeAllButton.classList.add('btn-disabled');
        } else {
            dislikeAllButton.classList.remove('btn-disabled');
        }
    }

    const dislikedItemsCount = getContainerChildCount('disliked-songs-container');
    const archiveAllButton = document.getElementById('btn-archive-all-disliked-song-names');
    if (archiveAllButton) {
        console.log(`disliked panel child count: ${dislikedItemsCount}`);
        if (dislikedItemsCount === 0) {
            archiveAllButton.classList.add('btn-disabled');
        } else {
            archiveAllButton.classList.remove('btn-disabled');
        }
    }

    if (selectedElement === null) {
        // Disable all selection-dependent buttons
        document.querySelectorAll('[id$="-edit-song-name"], [id$="-delete-song-name"], [id$="btn-create-song-lyrics"]').forEach(button => {
            button.classList.add('btn-disabled');
        });
        setNavigationNext(false);
        return;
    } else {
        // Update Create Lyrics button based on stage
        const createLyricsButton = document.getElementById('btn-create-song-lyrics');
        if (selectedElement.dataset.songStage === 'liked') {
            createLyricsButton.classList.remove('btn-disabled');
            setNavigationNext(true);
        } else {
            createLyricsButton.classList.add('btn-disabled');
            setNavigationNext(false);
        }
    }

    // Update stage-specific buttons
    const parentContainer = selectedElement.parentElement;
    const associatedButtons = [
        {'liked-songs-container': ['liked', 'disliked', 'new']},
        {'disliked-songs-container': ['disliked', 'liked', 'new']},
        {'new-songs-container': ['new', 'liked', 'disliked']}
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

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Sort song cards alphabetically within a container
 */
function sortCardsInContainer(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container with ID ${containerId} not found.`);
        return;
    }

    const cards = Array.from(container.children);

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

    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }

    cards.forEach(card => {
        container.appendChild(card);
    });
}

/**
 * Move a song card to a new container by song ID
 */
function moveSongCardById(songId, newContainerId) {
    console.log(`Moving song card: ${songId}`);

    const destinationPanel = document.getElementById(newContainerId);
    const songCard = document.getElementById(`song-card-${songId}`);

    if (destinationPanel && songCard) {
        destinationPanel.appendChild(songCard);

        songCard.classList.remove('bg-neutral');
        songCard.classList.add('bg-base-200');

        songCard.dataset.songStage = destinationPanel.dataset.zoneName;

        return { destinationPanel, songCard };
    } else {
        console.error(`Error occurred moving song card for songId: ${songId} to container ${newContainerId}`);
        return null;
    }
}

/**
 * Get the count of child elements in a container
 */
function getContainerChildCount(containerId) {
    const container = document.getElementById(containerId);
    return container ? container.childElementCount : 0;
}

/**
 * Setup visual state for new cards
 */
function setupNewCardVisualState(card) {
    card.classList.remove('bg-base-200');
    card.classList.add('bg-neutral');

    const handleClickOnce = () => {
        card.classList.remove('bg-neutral');
        card.classList.add('bg-base-200');
        card.removeEventListener('click', handleClickOnce);
    };

    card.addEventListener('click', handleClickOnce);
}

/**
 * Get song data from a card element
 */
function getSongDataFromCard(card) {
    return {
        songId: card.dataset.songId,
        songName: card.dataset.songName,
        songStage: card.dataset.songStage
    };
}

/**
 * Update song card data attributes
 */
function updateSongCardData(card, data) {
    if (data.songName !== undefined) {
        card.dataset.songName = data.songName;
    }
    if (data.songStage !== undefined) {
        card.dataset.songStage = data.songStage;
    }
}