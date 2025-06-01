
import { apiRenderComponent } from './api_render_component.js';
import { apiSongEdit } from './api_song_edit.js';

let draggedItem = null;
let placeholder = null;
let saveDirty = false;

const songId = document.body.dataset.songId;


document.addEventListener('DOMContentLoaded', () => {
    initPageActions();
    initSongSections();
    initDragAndDrop();
});


function initPageActions() {
    

    document.getElementById('btn-navigate-next').classList.remove('btn-disabled');
    document.getElementById('btn-navigate-next').onclick = () => { 
        window.location.href = `/hook/${songId}`; 
    };

    document.getElementById('btn-navigate-prev').classList.remove('btn-disabled');
    document.getElementById('btn-navigate-prev').onclick = () => { 
        window.location.href = `/style/${songId}`; 
    };

    document.getElementById('btn-clear').onclick = clearAllSongSections;
    document.getElementById('btn-save').onclick = saveSongStructure;

    document.querySelectorAll('[id*="input-').forEach(input => {
        input.addEventListener('input', setSaveDirty);
    });
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
        document.getElementById('modal-select').showModal();
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


function createAndAddSongSection(sectionName) {
    // get the server to make a new item from the django-cotton template
    apiRenderComponent('badge_edit', 'song-sections', { slot: sectionName })
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
            setSaveDirty();
            updateSongSectionsUIElements();
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
    const newVerseCount = parseInt(document.getElementById('input-verse-count').value.trim());
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
        structure_verse_count: newVerseCount,
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
            saveButton.classList.add('btn-disabled');

            // update the state of the navigation buttons
            updateNavigationButtonStates();
        })
        .catch(error => {
            // handle the error if the API call fails
            console.error('Failed to edit the song structure:', error);
            toastSystem.showError('Failed to update the song structure. Please try again.');
        });
}


function setSaveDirty() {
    if (!saveDirty) {
        saveDirty = true;

        const saveButton = document.getElementById('btn-save');
        saveButton.classList.remove('btn-disabled');

        // update the state of the navigation buttons
        updateNavigationButtonStates();
    }
}


function updateNavigationButtonStates() {

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
        
        // Only drop if there's an afterElement (prevents dropping at the end)
        if (afterElement != null) {
            songSectionsContainer.insertBefore(draggedItem, afterElement);
            setSaveDirty();
        }
        // If afterElement is null, don't move the item (prevents dropping at end)
    }
    if (placeholder.parentNode) {
        placeholder.parentNode.removeChild(placeholder);
    }
    placeholder.style.display = 'none';
}


function getDragAfterElement(container, y) {
    // Only get badge-edit-item elements, excluding the song-sections-end area
    const draggableElements = [...container.querySelectorAll('.badge-edit-item:not(.dragging)')];
    
    // If no draggable elements exist, return null (can't drop anywhere)
    if (draggableElements.length === 0) {
        return null;
    }

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

