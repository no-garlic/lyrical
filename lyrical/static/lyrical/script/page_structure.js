/**
 * Song structure page functionality.
 * Handles song structure editing, drag and drop, template management, and save/load operations.
 */

import { apiRenderComponent } from './api_render_component.js';
import { apiSongEdit } from './api_song_edit.js';
import { apiStructureTemplateEdit } from './api_structure_template_edit.js'
import { apiStructureTemplateGet } from './api_structure_template_get.js';

let draggedItem = null;
let placeholder = null;
let saveDirty = false;
let saveHistory = {};

const songId = document.body.dataset.songId;

/**
 * Initialize page when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', () => {
    initPageActions();
    initSongSections();
    initSongStructureTemplates();
    initDragAndDrop();

    updateSaveHistory();
    updateNavigationButtonStates();
});

/**
 * Initialize page action buttons and navigation
 */
function initPageActions() {    
    document.getElementById('btn-navigate-next').classList.remove('btn-disabled');
    document.getElementById('btn-navigate-next').onclick = () => { 
        window.location.href = `/lyrics/${songId}`; 
    };

    document.getElementById('btn-navigate-prev').classList.remove('btn-disabled');
    document.getElementById('btn-navigate-prev').onclick = () => { 
        window.location.href = `/style/${songId}`; 
    };

    document.getElementById('btn-clear').onclick = clearAllSongSections;
    document.getElementById('btn-save').onclick = saveSongStructure;
    document.getElementById('btn-cancel').onclick = cancelSongStructureChanges;

    document.querySelectorAll('[id*="input-').forEach(input => {
        input.addEventListener('input', setSaveDirty);
    });

    document.getElementById('btn-load-from-template').onclick = showLoadTemplateModal;
    document.getElementById('btn-save-to-template').onclick = showSaveTemplateModal;
}

/**
 * Initialize song section management functionality
 */
function initSongSections() {
    // Register an onclick callback for all menu options on the modal window
    document.querySelectorAll('[id*="modal-add-"').forEach(choice => {
        document.getElementById(choice.id).onclick = () => {
            createAndAddSongSection(choice.innerHTML);
        };
    });

    // Register the onclick callback for the ADD ITEM button
    document.getElementById('badge-add-item').onclick = (event) => {
        document.getElementById('modal-select-song-section').showModal();
    }

    // Register the close button for all badges already on the page that were loaded by
    // the Django template
    document.querySelectorAll('.badge-edit-close-button').forEach(badge => {
        badge.onclick = () => {
            removeSongSection(badge);
        }
    });

    // Update the add button based on the number of items in the list
    updateSongSectionsUIElements();
}

/**
 * Create and add a new song section
 * @param {string} sectionName - The name of the section to add
 * @param {boolean} [suppressDirty=false] - Whether to suppress the dirty state flag
 */
function createAndAddSongSection(sectionName, suppressDirty = false) {
    // Get the server to make a new item from the django-cotton template
    apiRenderComponent('badge_edit', 'song-sections', { slot: sectionName }, 'beforeend')
        .then(html => {
            // Get the song sections container
            const songSections = document.getElementById('song-sections');
            
            // The item we just created is now the last child of the song sections container
            const lastChild = songSections.lastElementChild;

            // Make the item we just created draggable
            if (lastChild && lastChild.classList.contains('badge-edit-item')) {
                makeItemDraggable(lastChild);
            }

            // Add an event listener to the close button on the item we just created
            lastChild.querySelector('.badge-edit-close-button').onclick = () => {
                removeSongSection(lastChild.querySelector('.badge-edit-close-button'));
            }

            // Move the item up 1 slot, above the add button
            const addButton = lastChild.previousElementSibling;
            songSections.insertBefore(lastChild, addButton);

            // Update the add button based on the number of items in the list
            if (!suppressDirty) {
                setSaveDirty();
            }
            updateSongSectionsUIElements();
            updateNavigationButtonStates();
        })             
        .catch(error => {
            console.error('Failed to render or initialize new list item:', error);
            toastSystem.showError('Failed to display the list item. Please refresh the page.');
        });

    // Close the menu
    document.activeElement.blur();
}

/**
 * Remove a song section from the list
 * @param {HTMLElement} badge - The badge element to remove
 */
function removeSongSection(badge) {
    const parent = badge.parentElement;
    const songSections = document.getElementById('song-sections');
    songSections.removeChild(parent);
    setSaveDirty();
    updateSongSectionsUIElements();
}

/**
 * Update UI elements based on the number of song sections
 */
function updateSongSectionsUIElements() {
    const songSections = document.getElementById('song-sections');
    const divider = document.getElementById('badge-add-item-divider');
    const clearButton = document.getElementById('btn-clear');

    if (songSections.childElementCount > 1) {
        divider.classList.remove('hidden')
        clearButton.classList.remove('btn-disabled');
    } else {
        divider.classList.add('hidden')
        clearButton.classList.add('btn-disabled');
    }
}

/**
 * Clear all song sections from the list
 */
function clearAllSongSections() {
    const songSections = document.getElementById('song-sections');

    while (songSections.childElementCount > 1) {
        songSections.removeChild(songSections.firstChild);
    }

    setSaveDirty();
    updateSongSectionsUIElements();
}

/**
 * Get song sections as a comma-separated text string
 * @returns {string} Comma-separated list of section names
 */
function getSongSectionsAsText() {
    const songSections = document.getElementById('song-sections');
    const sections = Array.from([]);

    Array.from(songSections.childNodes).forEach(child => {
        if (child && child.dataset && child.dataset.sectionName) {
            const sectionName = child.dataset.sectionName;
            sections.push(sectionName);
        }
    });

    const sectionsAsText = sections.join(',');
    return sectionsAsText;
}

/**
 * Save the current song structure to the database
 */
function saveSongStructure() {
    // Get the data values to save
    const newIntroLines = parseInt(document.getElementById('input-intro-lines').value.trim());
    const newOutroLines = parseInt(document.getElementById('input-outro-lines').value.trim());
    const newVerseLines = parseInt(document.getElementById('input-verse-lines').value.trim());
    const newPreChorusLines = parseInt(document.getElementById('input-pre-chorus-lines').value.trim());
    const newChorusLines = parseInt(document.getElementById('input-chorus-lines').value.trim());
    const newBridgeLines = parseInt(document.getElementById('input-bridge-lines').value.trim());
    const newSyllables = parseInt(document.getElementById('input-syllables-per-line').value.trim());
    const newVocalisationLevel = parseInt(document.getElementById('input-vocalisation-level').value.trim());
    const newVocalisationLines = parseInt(document.getElementById('input-vocalisation-lines').value.trim());
    const newVocalisationTerms = document.getElementById('input-vocalisation-terms').value.trim();
    const newCustomRequest = document.getElementById('input-custom-request').value.trim();
    const songSectionsText = getSongSectionsAsText().trim();

    // Call the API to update the song styles
    apiSongEdit(songId, {
        structure_intro_lines: newIntroLines,
        structure_outro_lines: newOutroLines,
        structure_verse_lines: newVerseLines,
        structure_pre_chorus_lines: newPreChorusLines,
        structure_chorus_lines: newChorusLines,
        structure_bridge_lines: newBridgeLines,
        structure_average_syllables: newSyllables,
        structure_vocalisation_level: newVocalisationLevel,
        structure_vocalisation_lines: newVocalisationLines,
        structure_vocalisation_terms: newVocalisationTerms,
        structure_custom_request: newCustomRequest,
        structure: songSectionsText
    })
        .then(songId => {
            console.log(`Successfully updated the song structure for songId: ${songId}`);

            // Update the dirty state and the UI for the save button
            saveDirty = false;
            const saveButton = document.getElementById('btn-save');
            const cancelButton = document.getElementById('btn-cancel');
            const saveToTemplateButton = document.getElementById('btn-save-to-template');
            saveButton.classList.add('btn-disabled');
            cancelButton.classList.add('btn-disabled');
            saveToTemplateButton.classList.remove('btn-disabled');

            updateSaveHistory();

            // Update the state of the navigation buttons
            updateNavigationButtonStates();
        })
        .catch(error => {
            // Handle the error if the API call fails
            console.error('Failed to edit the song structure:', error);
            toastSystem.showError('Failed to update the song structure. Please try again.');
        });
}

/**
 * Cancel song structure changes and revert to saved state
 */
function cancelSongStructureChanges() {
    revertSaveHistory();
}

/**
 * Update the save history with current form values
 */
function updateSaveHistory() {
    console.log('Updating save history...');

    // Record the current state of the song structure in the save history
    saveHistory.intro_lines = parseInt(document.getElementById('input-intro-lines').value.trim());
    saveHistory.outro_lines = parseInt(document.getElementById('input-outro-lines').value.trim());
    saveHistory.verse_lines = parseInt(document.getElementById('input-verse-lines').value.trim());
    saveHistory.pre_chorus_lines = parseInt(document.getElementById('input-pre-chorus-lines').value.trim());
    saveHistory.chorus_lines = parseInt(document.getElementById('input-chorus-lines').value.trim());
    saveHistory.bridge_lines = parseInt(document.getElementById('input-bridge-lines').value.trim());
    saveHistory.average_syllables = parseInt(document.getElementById('input-syllables-per-line').value.trim());
    saveHistory.vocalisation_level = parseInt(document.getElementById('input-vocalisation-level').value.trim());
    saveHistory.vocalisation_lines = parseInt(document.getElementById('input-vocalisation-lines').value.trim());
    saveHistory.vocalisation_terms = document.getElementById('input-vocalisation-terms').value.trim();
    saveHistory.custom_request = document.getElementById('input-custom-request').value.trim();
    saveHistory.structure = getSongSectionsAsText().trim();
}

/**
 * Revert form values to the last saved state
 */
function revertSaveHistory() {
    console.log('Reverting to the last saved state...');

    // Temporarily remove event listeners to prevent triggering setSaveDirty
    const inputs = document.querySelectorAll('[id*="input-"]');
    inputs.forEach(input => {
        input.removeEventListener('input', setSaveDirty);
    });

    // Revert the last save by restoring the last saved state from the history
    document.getElementById('input-intro-lines').value = saveHistory.intro_lines;
    document.getElementById('input-outro-lines').value = saveHistory.outro_lines;
    document.getElementById('input-verse-lines').value = saveHistory.verse_lines;
    document.getElementById('input-pre-chorus-lines').value = saveHistory.pre_chorus_lines;
    document.getElementById('input-chorus-lines').value = saveHistory.chorus_lines;
    document.getElementById('input-bridge-lines').value = saveHistory.bridge_lines;
    document.getElementById('input-syllables-per-line').value = saveHistory.average_syllables;
    document.getElementById('input-vocalisation-level').value = saveHistory.vocalisation_level;
    document.getElementById('input-vocalisation-lines').value = saveHistory.vocalisation_lines;
    document.getElementById('input-vocalisation-terms').value = saveHistory.vocalisation_terms;
    document.getElementById('input-custom-request').value = saveHistory.custom_request;

    const songSections = document.getElementById('song-sections');

    // Clear existing song sections
    while (songSections.childElementCount > 1) {
        songSections.removeChild(songSections.firstChild);
    }

    // Add the song sections from the saved history
    const sections = saveHistory.structure.split(',');
    console.log(`Reverting song sections: ${sections}`);
    sections.forEach(section => {
        if (!section.trim()) return;
        createAndAddSongSection(section.trim(), true); // suppress dirty state
    });
    
    // Update the UI elements based on the reverted song sections
    updateSongSectionsUIElements();

    // Reset the save dirty state
    saveDirty = false;

    // Get the save and cancel buttons
    const saveButton = document.getElementById('btn-save');
    const cancelButton = document.getElementById('btn-cancel');
    const saveToTemplateButton = document.getElementById('btn-save-to-template');

    // Update the UI to reflect the saved state
    saveButton.classList.add('btn-disabled');
    cancelButton.classList.add('btn-disabled');
    saveToTemplateButton.classList.remove('btn-disabled');

    // Update the state of the navigation buttons
    updateNavigationButtonStates();

    // Re-add event listeners
    inputs.forEach(input => {
        input.addEventListener('input', setSaveDirty);
    });

    console.log('Reverting to the last saved state...done.');
}

/**
 * Set the save dirty state to indicate unsaved changes
 */
function setSaveDirty() {
    if (!saveDirty) {
        saveDirty = true;

        console.log('Setting save dirty state to true.');

        const saveButton = document.getElementById('btn-save');
        const cancelButton = document.getElementById('btn-cancel');
        const saveToTemplateButton = document.getElementById('btn-save-to-template');
        
        saveButton.classList.remove('btn-disabled');
        cancelButton.classList.remove('btn-disabled');
        saveToTemplateButton.classList.add('btn-disabled');

        // Update the state of the navigation buttons
        updateNavigationButtonStates();
    }
}

/**
 * Update the state of navigation buttons based on current conditions
 */
function updateNavigationButtonStates() {
    const nextButton = document.getElementById('btn-navigate-next');
    const prevButton = document.getElementById('btn-navigate-prev');
    const songSections = document.getElementById('song-sections');

    const isSaved = !saveDirty;

    let hasSections = songSections.childElementCount > 1;

    if (!hasSections) {
        hasSections = saveHistory.structure.trim().length > 0;
    }

    if (isSaved && hasSections) {
        nextButton.classList.remove('btn-disabled');
    } else {
        nextButton.classList.add('btn-disabled');
    }

    if (isSaved) {
        prevButton.classList.remove('btn-disabled');
    } else {
        prevButton.classList.add('btn-disabled');
    }
}

/* 
 * **************************************************************
 *
 * Drag and Drop Functionality
 * 
 * **************************************************************
 */

/**
 * Initialize drag and drop functionality for song sections
 */
function initDragAndDrop() {
    const songSectionsContainer = document.getElementById('song-sections');
    if (!songSectionsContainer) return;

    // Make existing items draggable
    songSectionsContainer.querySelectorAll('.badge-edit-item').forEach(makeItemDraggable);

    songSectionsContainer.addEventListener('dragover', handleDragOver);
    songSectionsContainer.addEventListener('dragleave', handleDragLeave);
    songSectionsContainer.addEventListener('drop', handleDrop);

    // Create a placeholder element (hidden by default)
    placeholder = document.createElement('div');
    placeholder.classList.add('placeholder', 'h-10', 'bg-base-300', 'my-1', 'rounded'); // Style as needed
    placeholder.style.display = 'none'; // Hidden by default
}

/**
 * Make an item draggable
 * @param {HTMLElement} item - The item to make draggable
 */
function makeItemDraggable(item) {
    item.setAttribute('draggable', true);
    item.addEventListener('dragstart', handleDragStart);
    item.addEventListener('dragend', handleDragEnd);
}

/**
 * Handle drag start event
 * @param {Event} e - The drag event
 */
function handleDragStart(e) {
    draggedItem = e.target.closest('.badge-edit-item');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedItem.id || ''); // ID is optional but good practice
    
    // Add a class to the dragged item for styling (e.g., opacity)
    draggedItem.classList.add('dragging');
    
    // Ensure placeholder is initially hidden when a new drag starts
    if (placeholder.parentNode) {
        placeholder.parentNode.removeChild(placeholder);
    }
    placeholder.style.display = 'none';
}

/**
 * Handle drag end event
 * @param {Event} e - The drag event
 */
function handleDragEnd(e) {
    if (draggedItem) {
        draggedItem.classList.remove('dragging');
    }
    draggedItem = null;
    if (placeholder.parentNode) {
        placeholder.parentNode.removeChild(placeholder);
    }
    placeholder.style.display = 'none';
}

/**
 * Handle drag over event
 * @param {Event} e - The drag event
 */
function handleDragOver(e) {
    e.preventDefault();
    const songSectionsContainer = document.getElementById('song-sections');
    if (!songSectionsContainer.contains(e.target)) return;

    const afterElement = getDragAfterElement(songSectionsContainer, e.clientY);
    
    // Don't allow dropping at the end - only between items or at the beginning
    if (afterElement == null) {
        // Hide placeholder if trying to drop at the end
        if (placeholder.parentNode) {
            placeholder.parentNode.removeChild(placeholder);
        }
        placeholder.style.display = 'none';
    } else {
        if (placeholder.style.display === 'none' || afterElement.previousSibling !== placeholder) {
            songSectionsContainer.insertBefore(placeholder, afterElement);
            placeholder.style.display = 'block';
        }
    }
}

/**
 * Handle drag leave event
 * @param {Event} e - The drag event
 */
function handleDragLeave(e) {
    // Only hide placeholder if leaving the container itself, not just moving between items
    const songSectionsContainer = document.getElementById('song-sections');
    if (!songSectionsContainer.contains(e.relatedTarget) && placeholder.parentNode) {
         placeholder.parentNode.removeChild(placeholder);
         placeholder.style.display = 'none';
    }
}

/**
 * Handle drop event
 * @param {Event} e - The drop event
 */
function handleDrop(e) {
    e.preventDefault();
    const songSectionsContainer = document.getElementById('song-sections');
    if (draggedItem && songSectionsContainer.contains(e.target)) {
        const afterElement = getDragAfterElement(songSectionsContainer, e.clientY);
        
        // Only drop if there's an afterElement
        if (afterElement != null) {
            songSectionsContainer.insertBefore(draggedItem, afterElement);
            setSaveDirty();
        }
        // If afterElement is null, don't move the item (prevents dropping at absolute end)
    }
    if (placeholder.parentNode) {
        placeholder.parentNode.removeChild(placeholder);
    }
    placeholder.style.display = 'none';
}

/**
 * Get the element after which the dragged item should be dropped
 * @param {HTMLElement} container - The container element
 * @param {number} y - The Y coordinate of the mouse
 * @returns {HTMLElement|null} The element after which to drop, or null
 */
function getDragAfterElement(container, y) {
    // Get badge-edit-item elements and the song-sections-end element
    const draggableElements = [...container.querySelectorAll('.badge-edit-item:not(.dragging)')];
    const songSectionsEnd = container.querySelector('#song-sections-end');
    
    // If no draggable elements exist, return the song-sections-end to allow dropping before it
    if (draggableElements.length === 0 && songSectionsEnd) {
        return songSectionsEnd;
    }
    
    // Combine draggable elements with song-sections-end for position calculation
    const allElements = [...draggableElements];
    if (songSectionsEnd) {
        allElements.push(songSectionsEnd);
    }

    return allElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

/* 
 * **************************************************************
 *
 * Song Structure Template Editing and Saving on the Modal Dialog
 * 
 * **************************************************************
 */

/**
 * Initialize song structure template functionality
 */
function initSongStructureTemplates() {
    // Setup callback when the ok (save/load) button is pressed
    document.getElementById('modal-song-structure-ok').onclick = onSongStructureTemplateOkClicked;

    // Setup callbacks for when the radio options are selected
    document.querySelectorAll('[id*="radio-option-"').forEach(option => {
        option.onclick = onSongStructureTemplateOptionSelected;
    });
    
    document.querySelectorAll('[id*="text-option-"').forEach(option => {
        option.onclick = onSongStructureTextInputClicked;
    });

    if (document.getElementById('modal-song-structure-ok').innerHTML === 'Save') {
        // Setup callbacks for the edit buttons on each template
        document.querySelectorAll('[id*="btn-edit-option-"').forEach(button => {
            button.onclick = onSongStructureTemplateEditClicked;
        });

        // Setup callbacks for the save buttons on each template
        document.querySelectorAll('[id*="btn-save-option-"').forEach(button => {
            button.onclick = onSongStructureTemplateSaveClicked;
        });

        // Setup callbacks for the cancel buttons on each template
        document.querySelectorAll('[id*="btn-cancel-option-"').forEach(button => {
            button.onclick = onSongStructureTemplateCancelClicked;
        });

        // Setup callbacks for the text input on each template
        document.querySelectorAll('[id*="text-option-"').forEach(element => {
            element.addEventListener('keydown', function(event) {
                if (event.key === "Enter") {
                    event.preventDefault();
                    onSongStructureTemplateEnterKeyPressed(element);
                }
            })
        });
    } else {
        document.querySelectorAll('[id*="btn-edit-option-').forEach(button => button.classList.add('hidden'));
    }
}

/**
 * Show the save template modal dialog
 */
function showSaveTemplateModal() {
    document.getElementById('modal-song-structure-title').innerHTML = 'Save Template';
    document.getElementById('modal-song-structure-message').innerHTML = 'Select the template to save to:';
    document.getElementById('modal-song-structure-ok').innerHTML = 'Save';

    const modalDialog = document.getElementById('modal-song-structure-template');
    modalDialog.showModal();
}

/**
 * Show the load template modal dialog
 */
function showLoadTemplateModal() {
    document.getElementById('modal-song-structure-title').innerHTML = 'Load Template';
    document.getElementById('modal-song-structure-message').innerHTML = 'Select the template to load from:';
    document.getElementById('modal-song-structure-ok').innerHTML = 'Load';

    const modalDialog = document.getElementById('modal-song-structure-template');
    modalDialog.showModal();
}

/**
 * Handle OK button click in template modal
 */
function onSongStructureTemplateOkClicked() {
    const selectedTemplateId = this.dataset.selectedTemplateId;

    console.log(`ok clicked: ${this.innerHTML} - for templateId: ${selectedTemplateId}`);

    if (this.innerHTML === "Save") {
        saveSongStructureToTemplate(selectedTemplateId);
    } else {
        loadSongStructurefromTemplate(selectedTemplateId);
    }
}

/**
 * Handle template option selection
 */
function onSongStructureTemplateOptionSelected() {
    console.log(`option selected: ${this.dataset.index}`);
    handleSongStructureTemplateOptionSelected(this.dataset.index);
}

/**
 * Handle text input click in template modal
 */
function onSongStructureTextInputClicked() {
    const index = this.dataset.index;

    console.log(`clicked on text input index: ${index}`);
    
    document.querySelectorAll('[id*="radio-option-').forEach(button => {
        if (button.dataset.index === index) {
            button.checked = true;
        } else {
            button.checked = false;
        }
    });

    handleSongStructureTemplateOptionSelected(index);
}

/**
 * Handle template option selection logic
 * @param {string} index - The template index
 */
function handleSongStructureTemplateOptionSelected(index) {
    const templateId = document.getElementById(`radio-option-${index}`).dataset.templateId;
    document.getElementById('modal-song-structure-ok').dataset.selectedTemplateId = templateId;

    document.querySelectorAll('[id*="btn-edit-option-').forEach(button => button.classList.add('hidden'));
    document.querySelectorAll('[id*="btn-save-option-"').forEach(button => button.classList.add('hidden'));
    document.querySelectorAll('[id*="btn-cancel-option-"').forEach(button => button.classList.add('hidden'));

    document.querySelectorAll('[id*="text-option-').forEach(element => {
        element.value = element.dataset.origText;
        element.readOnly = true;
    });
    
    if (document.getElementById('modal-song-structure-ok').innerHTML === 'Save') {
        document.getElementById(`btn-edit-option-${index}`).classList.remove('hidden');
    }
}

/**
 * Handle template edit button click
 */
function onSongStructureTemplateEditClicked() {
    console.log(`edit item clicked: ${this.id}`);

    const saveButton = document.getElementById(`btn-save-option-${this.dataset.index}`);
    const cancelButton = document.getElementById(`btn-cancel-option-${this.dataset.index}`);

    const textInput = document.getElementById(`text-option-${this.dataset.index}`);
    textInput.dataset.origText = textInput.value;
    
    saveButton.classList.remove('hidden');
    cancelButton.classList.remove('hidden');

    this.classList.add('hidden');

    const editControl = document.getElementById(`text-option-${this.dataset.index}`);
    editControl.readOnly = false;
    editControl.focus();
    const length = editControl.value.length;
    editControl.setSelectionRange(length, length);
}

/**
 * Handle Enter key press in template text input
 * @param {HTMLElement} element - The input element
 */
function onSongStructureTemplateEnterKeyPressed(element) {
    console.log(`enter key pressed: ${element.dataset.index}`);
    saveSongStructureTemplate(element.dataset.index);
}

/**
 * Handle template save button click
 */
function onSongStructureTemplateSaveClicked() {
    console.log(`save item clicked: ${this.dataset.index}`);
    saveSongStructureTemplate(this.dataset.index);
}

/**
 * Save a song structure template
 * @param {string} index - The template index
 */
function saveSongStructureTemplate(index) {
    const editControl = document.getElementById(`text-option-${index}`);

    const templateId = editControl.dataset.templateId;
    const templateName = editControl.value;

    console.log(`saving template to the database: id=${templateId}, name="${templateName}"`);

    apiStructureTemplateEdit(templateId, {
        template_name: templateName,
    })
        .then(templateId => {
            console.log(`Successfully updated the song structure template for templateId: ${templateId}`);

            editControl.dataset.origText = editControl.value;
            editControl.readOnly = true;

            document.getElementById(`btn-edit-option-${index}`).classList.remove('hidden');
            document.getElementById(`btn-save-option-${index}`).classList.add('hidden');
            document.getElementById(`btn-cancel-option-${index}`).classList.add('hidden');
        })
        .catch(error => {
            // Handle the error if the API call fails
            console.error('Failed to edit the song structure template:', error);
            toastSystem.showError('Failed to update the song structure template. Please try again.');
        });
}

/**
 * Handle template cancel button click
 */
function onSongStructureTemplateCancelClicked() {
    console.log(`cancel item clicked: ${this.dataset.index}`);

    const index = this.dataset.index;
    document.getElementById(`btn-edit-option-${index}`).classList.remove('hidden');
    document.getElementById(`btn-save-option-${index}`).classList.add('hidden');
    document.getElementById(`btn-cancel-option-${index}`).classList.add('hidden');

    const editControl = document.getElementById(`text-option-${index}`);
    editControl.value = editControl.dataset.origText;
    editControl.readOnly = true;
}

/**
 * Save current song structure to a template
 * @param {string} templateId - The template ID to save to
 */
function saveSongStructureToTemplate(templateId) {
    console.log('saving current structure to template ${templateId} ...');

    // Get the data values to save
    const newIntroLines = parseInt(document.getElementById('input-intro-lines').value.trim());
    const newOutroLines = parseInt(document.getElementById('input-outro-lines').value.trim());
    const newVerseLines = parseInt(document.getElementById('input-verse-lines').value.trim());
    const newPreChorusLines = parseInt(document.getElementById('input-pre-chorus-lines').value.trim());
    const newChorusLines = parseInt(document.getElementById('input-chorus-lines').value.trim());
    const newBridgeLines = parseInt(document.getElementById('input-bridge-lines').value.trim());
    const newSyllables = parseInt(document.getElementById('input-syllables-per-line').value.trim());
    const newVocalisationLevel = parseInt(document.getElementById('input-vocalisation-level').value.trim());
    const newVocalisationLines = parseInt(document.getElementById('input-vocalisation-lines').value.trim());
    const newVocalisationTerms = document.getElementById('input-vocalisation-terms').value.trim();
    const newCustomRequest = document.getElementById('input-custom-request').value.trim();
    const songSectionsText = getSongSectionsAsText().trim();

    // Call the API to update the song styles
    apiStructureTemplateEdit(templateId, {
        intro_lines: newIntroLines,
        outro_lines: newOutroLines,
        verse_lines: newVerseLines,
        pre_chorus_lines: newPreChorusLines,
        chorus_lines: newChorusLines,
        bridge_lines: newBridgeLines,
        average_syllables: newSyllables,
        vocalisation_level: newVocalisationLevel,
        vocalisation_lines: newVocalisationLines,
        vocalisation_terms: newVocalisationTerms,
        custom_request: newCustomRequest,
        structure: songSectionsText
    })
        .then(templateId => {
            console.log(`Successfully updated the structure template for templateId: ${templateId}`);
        })
        .catch(error => {
            // Handle the error if the API call fails
            console.error('Failed to edit the song structure template:', error);
            toastSystem.showError('Failed to update the song structure template. Please try again.');
        });
}

/**
 * Load song structure from a template
 * @param {string} templateId - The template ID to load from
 */
function loadSongStructurefromTemplate(templateId) {
    console.log('loading saved structure template for templateId: ${templateId} ...');

    apiStructureTemplateGet(templateId)
        .then(templateData => {
            console.log(`Successfully loaded the structure template for templateId: ${templateData}`);
            console.log(`Loaded template data:`, JSON.stringify(templateData, null, 2));

            // Update the UI with the loaded template data
            document.getElementById('input-intro-lines').value = templateData.intro_lines;
            document.getElementById('input-outro-lines').value = templateData.outro_lines;
            document.getElementById('input-verse-lines').value = templateData.verse_lines;
            document.getElementById('input-pre-chorus-lines').value = templateData.pre_chorus_lines;
            document.getElementById('input-chorus-lines').value = templateData.chorus_lines;
            document.getElementById('input-bridge-lines').value = templateData.bridge_lines;
            document.getElementById('input-syllables-per-line').value = templateData.average_syllables;
            document.getElementById('input-vocalisation-level').value = templateData.vocalisation_level;
            document.getElementById('input-vocalisation-lines').value = templateData.vocalisation_lines;
            document.getElementById('input-vocalisation-terms').value = templateData.vocalisation_terms;
            document.getElementById('input-custom-request').value = templateData.custom_request;

            // Clear existing song sections
            clearAllSongSections();

            // Add the song sections from the loaded template
            const songSectionsContainer = document.getElementById('song-sections');
            const sections = templateData.structure.split(',');

            console.log(`Loaded song sections: ${sections}`);
            
            sections.forEach(section => {
                if (!section.trim()) return;
                createAndAddSongSection(section.trim());
            });

            // Update the UI elements based on the new song sections
            updateSongSectionsUIElements();
            setSaveDirty();
            const saveButton = document.getElementById('btn-save');
            const cancelButton = document.getElementById('btn-cancel');
            saveButton.classList.remove('btn-disabled');
            cancelButton.classList.remove('btn-disabled');
            updateNavigationButtonStates();
            console.log('Song structure loaded successfully from the template.');
        })
        .catch(error => {
            console.error('Failed to load the song structure from the template:', error);
            toastSystem.showError('Failed to load the song structure from the selected template. Please try again.');
        });
}