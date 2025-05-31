import { apiRenderComponent } from './api_render_component.js';

let draggedItem = null;
let placeholder = null;

document.addEventListener('DOMContentLoaded', () => {
    initPageActions();
    initSongSections();
    initDragAndDrop(); // Initialize drag and drop for existing items
});

function makeItemDraggable(item) {
    item.setAttribute('draggable', true);
    item.addEventListener('dragstart', handleDragStart);
    item.addEventListener('dragend', handleDragEnd);
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
    e.preventDefault(); // Necessary to allow dropping
    const songSectionsContainer = document.getElementById('song-sections');
    if (!songSectionsContainer.contains(e.target)) return;

    const afterElement = getDragAfterElement(songSectionsContainer, e.clientY);
    if (afterElement == null) {
        if (placeholder.style.display === 'none' || songSectionsContainer.lastChild !== placeholder) {
            songSectionsContainer.appendChild(placeholder);
            placeholder.style.display = 'block';
        }
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
        if (afterElement == null) {
            songSectionsContainer.appendChild(draggedItem);
        } else {
            songSectionsContainer.insertBefore(draggedItem, afterElement);
        }
    }
    if (placeholder.parentNode) {
        placeholder.parentNode.removeChild(placeholder);
    }
    placeholder.style.display = 'none';
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.badge-edit-item:not(.dragging)')];

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


function initSongSections() {
    const menuChoices = ['verse', 'chorus', 'bridge', 'pre-chorus', 'outro', 'hook', 'vocalisation', 'interlude', 'solo', 'intro'];

    menuChoices.forEach(choice => {
        document.getElementById(`menu-item-${choice}`).onclick = () => {
            apiRenderComponent('badge_edit', 'song-sections', { slot: choice })
                .then(html => {
                    // get the song sections container
                    const song_sections = document.getElementById('song-sections');
                    
                    // get the last child of the song sections container
                    const lastChild = song_sections.lastElementChild;

                    // Make the new item draggable
                    if (lastChild && lastChild.classList.contains('badge-edit-item')) {
                        makeItemDraggable(lastChild);
                    }

                    // add event listeners to the new badge edit buttons
                    lastChild.querySelector('.badge-edit-close-button').onclick = () => {
                        removeBadge(lastChild.querySelector('.badge-edit-close-button'));
                    }
                })             
                .catch(error => {
                    console.error('Failed to render or initialize new list item:', error);
                    toastSystem.showError('Failed to display the list item. Please refresh the page.');
                });
            document.activeElement.blur();
        }
    });

    document.querySelectorAll('.badge-edit-close-button').forEach(badge => {
        badge.onclick = () => {
            removeBadge(badge);
        }
    });
}


function removeBadge(badge) {
    const parent = badge.parentElement;
    const song_sections = document.getElementById('song-sections');
    song_sections.removeChild(parent);
}


function initPageActions() {
    document.getElementById('btn-navigate-next').onclick = navigateNext;
    document.getElementById('btn-navigate-prev').onclick = navigatePrevious;
    document.getElementById('btn-navigate-next').classList.remove('btn-disabled');
    document.getElementById('btn-navigate-prev').classList.remove('btn-disabled');
}


function navigateNext() {
    const generateButton = document.getElementById('btn-generate');
    const songId = parseInt(generateButton.dataset.songId);
    window.location.href = `/hook/${songId}`;
}


function navigatePrevious() {
    const generateButton = document.getElementById('btn-generate');
    const songId = parseInt(generateButton.dataset.songId);
    window.location.href = `/style/${songId}`;
}
