
import { apiRenderComponent } from './api_render_component.js';
import { apiSongEdit } from './api_song_edit.js';
import { apiStructureTemplateEdit } from './api_structure_template_edit.js'
import { apiStructureTemplateGet } from './api_structure_template_get.js';


let draggedItem = null;
let placeholder = null;
let saveDirty = false;
let saveHistory = {};

const songId = document.body.dataset.songId;


document.addEventListener('DOMContentLoaded', () => {
    initPageActions();
    initSongSections();
    initSongStructureTemplates();
    initDragAndDrop();

    updateSaveHistory();
    updateNavigationButtonStates();
});


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


function initSongSections() {
    // register an onclick callback for all menu options on the modal window
    document.querySelectorAll('[id*="modal-add-"').forEach(choice => {
        document.getElementById(choice.id).onclick = () => {
            createAndAddSongSection(choice.innerHTML);
        };
    });

    // register the onclick callback for the ADD ITEM button
    document.getElementById('badge-add-item').onclick = (event) => {
        document.getElementById('modal-select-song-section').showModal();
    }

    // register the close button for all badges already on the page that were loaded by
    // the django template
    document.querySelectorAll('.badge-edit-close-button').forEach(badge => {
        badge.onclick = () => {
            removeSongSection(badge);
        }
    });

    // update the add button based on the number of items in the list
    updateSongSectionsUIElements();
}


function createAndAddSongSection(sectionName, suppressDirty = false) {
    // get the server to make a new item from the django-cotton template
    apiRenderComponent('badge_edit', 'song-sections', { slot: sectionName }, 'beforeend')
        .then(html => {
            // get the song sections container
            const songSections = document.getElementById('song-sections');
            
            // the item we just created is now the last child of the song sections container
            const lastChild = songSections.lastElementChild;

            // make the item we just created draggable
            if (lastChild && lastChild.classList.contains('badge-edit-item')) {
                makeItemDraggable(lastChild);
            }

            // add an event listener to the close button on the item we just created
            lastChild.querySelector('.badge-edit-close-button').onclick = () => {
                removeSongSection(lastChild.querySelector('.badge-edit-close-button'));
            }

            // move the item up 1 slot, above the add button
            const addButton = lastChild.previousElementSibling;
            songSections.insertBefore(lastChild, addButton);

            // update the add button based on the number of items in the list
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

    // close the menu
    document.activeElement.blur();
}


function removeSongSection(badge) {
    const parent = badge.parentElement;
    const songSections = document.getElementById('song-sections');
    songSections.removeChild(parent);
    setSaveDirty();
    updateSongSectionsUIElements();
}


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


function clearAllSongSections() {
    const songSections = document.getElementById('song-sections');

    while (songSections.childElementCount > 1) {
        songSections.removeChild(songSections.firstChild);
    }

    setSaveDirty();
    updateSongSectionsUIElements();
}


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


function saveSongStructure() {
    // get the data values to save
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

    // call the api to update the song styles
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

            // update the dirty state and the UI for the save button
            saveDirty = false;
            const saveButton = document.getElementById('btn-save');
            const cancelButton = document.getElementById('btn-cancel');
            const saveToTemplateButton = document.getElementById('btn-save-to-template');
            saveButton.classList.add('btn-disabled');
            cancelButton.classList.add('btn-disabled');
            saveToTemplateButton.classList.remove('btn-disabled');

            updateSaveHistory();

            // update the state of the navigation buttons
            updateNavigationButtonStates();
        })
        .catch(error => {
            // handle the error if the API call fails
            console.error('Failed to edit the song structure:', error);
            toastSystem.showError('Failed to update the song structure. Please try again.');
        });
}


function cancelSongStructureChanges() {
    revertSaveHistory();
}


function updateSaveHistory() {
    console.log('Updating save history...');

    // record the current state of the song structure in the save history
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


function revertSaveHistory() {
    console.log('Reverting to the last saved state...');

    // temporarily remove event listeners to prevent triggering setSaveDirty
    const inputs = document.querySelectorAll('[id*="input-"]');
    inputs.forEach(input => {
        input.removeEventListener('input', setSaveDirty);
    });

    // revert the last save by restoring the last saved state from the history
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

    // clear existing song sections
    while (songSections.childElementCount > 1) {
        songSections.removeChild(songSections.firstChild);
    }

    // add the song sections from the saved history
    const sections = saveHistory.structure.split(',');
    console.log(`Reverting song sections: ${sections}`);
    sections.forEach(section => {
        if (!section.trim()) return;
        createAndAddSongSection(section.trim(), true); // suppress dirty state
    });
    
    // update the UI elements based on the reverted song sections
    updateSongSectionsUIElements();

    // reset the save dirty state
    saveDirty = false;

    // get the save and cancel buttons
    const saveButton = document.getElementById('btn-save');
    const cancelButton = document.getElementById('btn-cancel');
    const saveToTemplateButton = document.getElementById('btn-save-to-template');

    // update the UI to reflect the saved state
    saveButton.classList.add('btn-disabled');
    cancelButton.classList.add('btn-disabled');
    saveToTemplateButton.classList.remove('btn-disabled');

    // update the state of the navigation buttons
    updateNavigationButtonStates();

    // re-add event listeners
    inputs.forEach(input => {
        input.addEventListener('input', setSaveDirty);
    });

    console.log('Reverting to the last saved state...done.');
}


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

        // update the state of the navigation buttons
        updateNavigationButtonStates();
    }
}


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



function makeItemDraggable(item) {
    item.setAttribute('draggable', true);
    item.addEventListener('dragstart', handleDragStart);
    item.addEventListener('dragend', handleDragEnd);
}


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


function handleDragLeave(e) {
    // Only hide placeholder if leaving the container itself, not just moving between items
    const songSectionsContainer = document.getElementById('song-sections');
    if (!songSectionsContainer.contains(e.relatedTarget) && placeholder.parentNode) {
         placeholder.parentNode.removeChild(placeholder);
         placeholder.style.display = 'none';
    }
}


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


function initSongStructureTemplates() {
    
    // testing
    // showSaveTemplateModal();

    // setup callback when the ok (save/load) button is pressed
    document.getElementById('modal-song-structure-ok').onclick = onSongStructureTemplateOkClicked;

    // setup callbacks for when the radio options are selected
    document.querySelectorAll('[id*="radio-option-"').forEach(option => {
        option.onclick = onSongStructureTemplateOptionSelected;
    });
    
    document.querySelectorAll('[id*="text-option-"').forEach(option => {
        option.onclick = onSongStructureTextInputClicked;
    });

    if (document.getElementById('modal-song-structure-ok').innerHTML === 'Save') {

        // setup callbacks for the edit buttons on each template
        document.querySelectorAll('[id*="btn-edit-option-"').forEach(button => {
            button.onclick = onSongStructureTemplateEditClicked;
        });

        // setup callbacks for the save buttons on each template
        document.querySelectorAll('[id*="btn-save-option-"').forEach(button => {
            button.onclick = onSongStructureTemplateSaveClicked;
        });

        // setup callbacks for the cancel buttons on each template
        document.querySelectorAll('[id*="btn-cancel-option-"').forEach(button => {
            button.onclick = onSongStructureTemplateCancelClicked;
        });

        // setup callbacks for the text input on each template
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


function showSaveTemplateModal() {
    document.getElementById('modal-song-structure-title').innerHTML = 'Save Template';
    document.getElementById('modal-song-structure-message').innerHTML = 'Select the template to save to:';
    document.getElementById('modal-song-structure-ok').innerHTML = 'Save';

    const modalDialog = document.getElementById('modal-song-structure-template');
    modalDialog.showModal();
}


function showLoadTemplateModal() {
    document.getElementById('modal-song-structure-title').innerHTML = 'Load Template';
    document.getElementById('modal-song-structure-message').innerHTML = 'Select the template to load from:';
    document.getElementById('modal-song-structure-ok').innerHTML = 'Load';

    const modalDialog = document.getElementById('modal-song-structure-template');
    modalDialog.showModal();
}


function onSongStructureTemplateOkClicked() {
    const selectedTemplateId = this.dataset.selectedTemplateId;

    console.log(`ok clicked: ${this.innerHTML} - for templateId: ${selectedTemplateId}`);

    if (this.innerHTML === "Save") {
        saveSongStructureToTemplate(selectedTemplateId);
    } else {
        loadSongStructurefromTemplate(selectedTemplateId);
    }
}


function onSongStructureTemplateOptionSelected() {
    console.log(`option selected: ${this.dataset.index}`);
    handleSongStructureTemplateOptionSelected(this.dataset.index);
}


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


function onSongStructureTemplateEnterKeyPressed(element) {
    console.log(`enter key pressed: ${element.dataset.index}`);
    saveSongStructureTemplate(element.dataset.index);
}


function onSongStructureTemplateSaveClicked() {
    console.log(`save item clicked: ${this.dataset.index}`);
    saveSongStructureTemplate(this.dataset.index);
}


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
            // handle the error if the API call fails
            console.error('Failed to edit the song structure template:', error);
            toastSystem.showError('Failed to update the song structure template. Please try again.');
        });
}


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


function saveSongStructureToTemplate(templateId) {
    console.log('saving current structure to template ${templateId} ...');

    // get the data values to save
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

    // call the api to update the song styles
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
            // handle the error if the API call fails
            console.error('Failed to edit the song structure template:', error);
            toastSystem.showError('Failed to update the song structure template. Please try again.');
        });
}


function loadSongStructurefromTemplate(templateId) {
    console.log('loading saved structure template for templateId: ${templateId} ...');


    apiStructureTemplateGet(templateId)
        .then(templateData => {
            console.log(`Successfully loaded the structure template for templateId: ${templateData}`);
            console.log(`Loaded template data:`, JSON.stringify(templateData, null, 2));

            // update the UI with the loaded template data
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

            // clear existing song sections
            clearAllSongSections();

            // add the song sections from the loaded template
            const songSectionsContainer = document.getElementById('song-sections');
            const sections = templateData.structure.split(',');

            console.log(`Loaded song sections: ${sections}`);
            
            sections.forEach(section => {
                if (!section.trim()) return;
                createAndAddSongSection(section.trim());
            });

            // update the UI elements based on the new song sections
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





