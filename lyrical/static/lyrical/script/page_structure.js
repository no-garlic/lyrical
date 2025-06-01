import { apiRenderComponent } from './api_render_component.js';

let draggedItem = null;
let placeholder = null;

/*
    x btn-generate - songId

    btn-clear
    badge-add-item-divider

    btn-load-from-template
    btn-save-to-template
    btn-cancel
    btn-save

    input-intro-lines
    input-outro-lines
    input-verse-count
    input-verse-lines
    input-pre-chorus-lines
    input-chorus-lines
    input-bridge-lines
    input-syllables-per-line
    input-vocalisation-level
    input-vocalisation-lines
    input-vocalisation-terms
    input-custom-request

    drag and drop not working to the last slot

*/







document.addEventListener('DOMContentLoaded', () => {
    initPageActions();
    initSongSections();
    initDragAndDrop();
});



function initPageActions() {
    const songId = document.body.dataset.songId;

    document.getElementById('btn-navigate-next').classList.remove('btn-disabled');
    document.getElementById('btn-navigate-next').onclick = () => { 
        window.location.href = `/hook/${songId}`; 
    };

    document.getElementById('btn-navigate-prev').classList.remove('btn-disabled');
    document.getElementById('btn-navigate-prev').onclick = () => { 
        window.location.href = `/style/${songId}`; 
    };
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
    updateAddButtonUI();
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
            updateAddButtonUI();
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
    updateAddButtonUI();
}


function updateAddButtonUI() {
    const songSections = document.getElementById('song-sections');
    const divider = document.getElementById('badge-add-item-divider');

    if (songSections.childElementCount > 1) {
        divider.classList.remove('hidden')
    } else {
        divider.classList.add('hidden')
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
        
        // Only drop if there's an afterElement (prevents dropping at the end)
        if (afterElement != null) {
            songSectionsContainer.insertBefore(draggedItem, afterElement);
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

