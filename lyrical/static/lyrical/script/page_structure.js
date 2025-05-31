
import { apiRenderComponent } from './api_render_component.js';



document.addEventListener('DOMContentLoaded', () => {
    initPageActions();
    initSongSections();
});


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

                    // add event listeners to the new badge edit buttons
                    lastChild.querySelector('.badge-edit-close-button').onclick = () => {
                        removeBadge(lastChild.querySelector('.badge-edit-close-button'));
                    }
                    lastChild.querySelector('.badge-edit-up-button').onclick = () => {
                        moveBadgeUp(lastChild.querySelector('.badge-edit-up-button'));
                    }
                    lastChild.querySelector('.badge-edit-down-button').onclick = () => {
                        moveBadgeDown(lastChild.querySelector('.badge-edit-down-button'));
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

    document.querySelectorAll('.badge-edit-up-button').forEach(badge => {
        badge.onclick = () => {
            moveBadgeUp(badge);
        }
    });

    document.querySelectorAll('.badge-edit-down-button').forEach(badge => {
        badge.onclick = () => {
            moveBadgeDown(badge);
        }
    });
}


function moveBadgeUp(badge) {
    const parent = badge.parentElement;
    const song_sections = document.getElementById('song-sections');
    const previousSibling = parent.previousElementSibling;
    if (previousSibling) {
        song_sections.insertBefore(parent, previousSibling);
    }
}


function moveBadgeDown(badge) {
    const parent = badge.parentElement;
    const song_sections = document.getElementById('song-sections');
    const nextSibling = parent.nextElementSibling;
    if (nextSibling) {
        song_sections.insertBefore(nextSibling, parent);
    }
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
