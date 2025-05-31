
import { apiRenderComponent } from './api_render_component.js';

document.addEventListener('DOMContentLoaded', () => {
    initPageActions();


    const menuChoices = ['verse', 'chorus', 'bridge', 'pre-chorus', 'outro', 'hook', 'vocalisation', 'interlude', 'solo', 'intro'];

    menuChoices.forEach(choice => {
        document.getElementById(`menu-item-${choice}`).onclick = () => {
            apiRenderComponent('badge', 'song-sections', { slot: choice })
                .then(html => {
                    // Optionally, you can do something with the rendered HTML here
                }
                )
                .catch(error => {
                    console.error('Failed to render or initialize new list item:', error);
                    toastSystem.showError('Failed to display the list item. Please refresh the page.');
                });
            document.activeElement.blur();
        }
    });


});


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
