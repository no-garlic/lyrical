/**
 * Names page - Combined functionality
 * Handles song name generation, management, selection, drag-drop, and bulk operations
 */

// External imports
import { SelectSystem } from './util_select.js';
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
let streamHelper;

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize the page when the DOM is fully loaded
 */
document.addEventListener('DOMContentLoaded', () => {
    initSelection();
    initSongManagement();
    initBulkOperations();
    initGeneration();
    applyFilter();
});


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
            canDeselectOnClickAway: false,
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
}

/**
 * Register a card for selection
 */
function registerCardForSelection(card) {
    if (selectSystem && card) {
        selectSystem.addElement(card);
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
// SONG MANAGEMENT
// =============================================================================

/**
 * Initialize song management system
 */
function initSongManagement() {
    // Bind buttons
    document.getElementById('btn-add-song-name').onclick = addSongName;
    document.getElementById('btn-edit-song-name').onclick = editSelectedSong;
    
    document.getElementById('tab-filter-new').onclick = applyFilter;
    document.getElementById('tab-filter-liked').onclick = applyFilter;
    document.getElementById('tab-filter-disliked').onclick = applyFilter;
    
    document.querySelectorAll('[id*="song-like"').forEach(button => {
        button.onclick = () => {
            likeSong(button.dataset.songId);
        }
    });

    document.querySelectorAll('[id*="song-dislike"').forEach(button => {
        button.onclick = () => {
            dislikeSong(button.dataset.songId);
        }
    });

    // register the song cards dblclick event to go to the style page
    document.querySelectorAll('.song-card').forEach(card => {
        addEventListenerToCard(card);
    });
}


function addEventListenerToCard(card) {
    card.addEventListener('dblclick', (event) => {
        const songId = card.dataset.songId;
        const url = `/style/${songId}`
        window.location.href = url;
    });
}


function getFilterStage() {
    let filterStage = undefined;

    document.querySelectorAll('[id*="tab-filter-"]').forEach(tab => {
        if (tab.checked) {
            filterStage = tab.dataset.filterStage;
        }
    });

    return filterStage;
}


function applyFilter() {
    const filterStage = getFilterStage();
    const container = document.getElementById('songs-container');

    console.log(`Applying filter: ${filterStage}`)

    if (filterStage === undefined) {
        Array.from(container.children).forEach(node => {
            node.classList.remove('hidden');
        });
    } else {

        let numVisible = 0;

        Array.from(container.children).forEach(node => {
            if (node.dataset.songStage === filterStage) {
                node.classList.remove('hidden');
                numVisible++;
            } else {
                node.classList.add('hidden');
            }
        });

        if (filterStage === 'new') {
            document.getElementById('btn-add-song-name').classList.remove('btn-disabled');
            if (numVisible > 0) {
                document.getElementById('btn-dislike-all-new-song-names').classList.remove('btn-disabled');
            } else {
                document.getElementById('btn-dislike-all-new-song-names').classList.add('btn-disabled');    
            }
        } else {
            document.getElementById('btn-add-song-name').classList.add('btn-disabled');
            document.getElementById('btn-dislike-all-new-song-names').classList.add('btn-disabled');
        }
    }

    const selectedElement = selectSystem.getSelectedElement();
    if (selectedElement) {
        if (selectedElement.dataset.songStage != filterStage) {
            console.log('deslecting the selected element as it is no longer visible');
            selectSystem.deselectElement(selectedElement);
        }
    }
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
    apiRenderComponent('card_song', 'songs-container', { song: { id: songId, name: songName, stage: 'new' }})
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
    console.log(`initialising new song card (${songName}) with id=${songId}`)
    const newCard = document.querySelector(`.song-card[data-song-id="${songId}"]`);

    if (!newCard) {
        console.error('Could not find the newly added song card for songId:', songId);
        return;
    }

    /*
    <div class="song-card" id="song-card-163" data-song-id="163" data-song-name="Victory In My Heart" data-song-stage="new">
    <p id="song-text-163">Victory In My Heart</p>
    <div id="song-hover-163" data-class="hidden">
    <a class="bi-hand-thumbs-up btn-song-like" id="song-like-163" data-song-id="163">
    <a class="bi-hand-thumbs-down btn-song-dislike" id="song-dislike-163" data-song-id="163">
    */

    document.getElementById(`song-like-${songId}`).onclick = () => {
        likeSong(songId);
    }

    document.getElementById(`song-dislike-${songId}`).onclick = () => {
        dislikeSong(songId);
    }

    setupNewCardVisualState(newCard);
    registerCardForSelection(newCard);
    addEventListenerToCard(newCard);
    sortCardsInContainer('songs-container');

    applyFilter();
}


function likeSong(songId) {
    const card = document.getElementById(`song-card-${songId}`);

    let vars = [];
    if (card.dataset.songStage === 'liked') {
        vars = ['new', 'bi-hand-thumbs-up-fill', 'bi-hand-thumbs-up'];
    } else {
        vars = ['liked', 'bi-hand-thumbs-up', 'bi-hand-thumbs-up-fill'];
    }

    console.log(`Setting song stage of song id=${songId} to '${vars[0]}'.`);

    apiSongEdit(songId, { song_stage: vars[0] })
        .then(songId => {
            console.log(`Successfully updated song stage for songId: ${songId}`);

            document.getElementById(`song-card-${songId}`).dataset.songStage = vars[0];
            document.getElementById(`song-like-${songId}`).classList.remove(vars[1]);
            document.getElementById(`song-like-${songId}`).classList.add(vars[2]);     
            document.getElementById(`song-dislike-${songId}`).classList.remove('bi-hand-thumbs-down-fill');
            document.getElementById(`song-dislike-${songId}`).classList.add('bi-hand-thumbs-down');     

            applyFilter();
        })
        .catch(error => {
            console.error('Failed to edit the song stage:', error);
            toastSystem.showError('Failed to update the song stage. Please try again.');
        });
}


function dislikeSong(songId) {
    const card = document.getElementById(`song-card-${songId}`);

    let vars = [];
    if (card.dataset.songStage === 'disliked') {
        vars = ['new', 'bi-hand-thumbs-down-fill', 'bi-hand-thumbs-down'];
    } else {
        vars = ['disliked', 'bi-hand-thumbs-down', 'bi-hand-thumbs-down-fill'];
    }

    console.log(`Setting song stage of song id=${songId} to '${vars[0]}'.`);

    apiSongEdit(songId, { song_stage: vars[0] })
        .then(songId => {
            console.log(`Successfully updated song stage for songId: ${songId}`);

            document.getElementById(`song-card-${songId}`).dataset.songStage = vars[0];
            document.getElementById(`song-like-${songId}`).classList.remove('bi-hand-thumbs-up-fill');     
            document.getElementById(`song-like-${songId}`).classList.add('bi-hand-thumbs-up');
            document.getElementById(`song-dislike-${songId}`).classList.remove(vars[1]);
            document.getElementById(`song-dislike-${songId}`).classList.add(vars[2]);     

            applyFilter();
        })
        .catch(error => {
            console.error('Failed to edit the song stage:', error);
            toastSystem.showError('Failed to update the song stage. Please try again.');
        });
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
            
            // Remove from DOM
            const container = card.parentElement;
            container.removeChild(card);
        })
        .catch(error => {
            console.error('Failed to delete song:', error);
            toastSystem.showError('Failed to delete the song. Please try again.');
        });
}


// =============================================================================
// BULK OPERATIONS
// =============================================================================

/**
 * Initialize bulk operations system
 */
function initBulkOperations() {
    document.getElementById('btn-dislike-all-new-song-names').onclick = dislikeAllNewSongs;
}

/**
 * Dislike all new song names
 */
function dislikeAllNewSongs() {
    apiSongEditBulk({ song_stage_from: 'new', song_stage_to: 'disliked'})
        .then(data => {
            console.log(`Successfully moved all songs from new to disliked, id's: ${data}.`);

            selectSystem.deselectElement(selectSystem.getSelectedElement());

            const container = document.getElementById('songs-container');
            Array.from(container.children).forEach(child => {
                if (child.dataset.songStage === 'new') {

                    const songId = child.dataset.songId;
                    document.getElementById(`song-card-${songId}`).dataset.songStage = 'disliked';
                    document.getElementById(`song-dislike-${songId}`).classList.remove('bi-hand-thumbs-up');
                    document.getElementById(`song-dislike-${songId}`).classList.add('bi-hand-thumbs-up-fill');     

                    applyFilter();
                }
            });

            updateButtonStatesForSelection(null);
        })
        .catch(error => {
            console.error(`Failed to move all new songs to disliked:`, error);
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

    const generateButton = document.getElementById('btn-generate');
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
            onComplete: (summaryInfo) => {
                console.log("stream complete");
                handleGenerationLoadingEnd(summaryInfo);
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
        max_words: parseInt(document.getElementById('input-max-words').value, 10),
        custom_prompt: document.getElementById('prompt-text').value,
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

    sortCardsInContainer('songs-container');
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
    const generateButton = document.getElementById('btn-generate');
    const generatingButton = document.getElementById('btn-generating');
    
    if (generateButton) {
        generateButton.classList.add('hidden');
    }

    if (generatingButton) {
        generatingButton.classList.remove('hidden');
    }

    const newTab = document.getElementById('tab-filter-new');
    if (newTab.checked != true) {
        newTab.checked = true;
        applyFilter();
        updateButtonStatesForSelection();
    }
}

/**
 * Handle UI changes when generation ends
 */
function handleGenerationLoadingEnd(summaryInfo) {
    const generateButton = document.getElementById('btn-generate');
    const generatingButton = document.getElementById('btn-generating');
    
    if (generateButton) {
        generateButton.classList.remove('hidden');
    }

    if (generatingButton) {
        generatingButton.classList.add('hidden');
    }

    // Names generation doesn't use conversation history, so no summarization needed
}

// =============================================================================
// UI STATE MANAGEMENT
// =============================================================================

/**
 * Update button states based on selection and container counts
 */
function updateButtonStatesForSelection(selectedElement) {
    if (selectedElement === null) {
        document.getElementById('btn-edit-song-name').classList.add('btn-disabled');
        return;
    } else {
        document.getElementById(`btn-edit-song-name`).classList.remove('btn-disabled');
    }
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