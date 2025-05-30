
document.addEventListener('DOMContentLoaded', () => {
    initPageActions();
});


function initPageActions() {
    document.getElementById('btn-navigate-next').onclick = exportSong;
    document.getElementById('btn-navigate-prev').onclick = navigatePrevious;

    document.getElementById('btn-navigate-next').classList.remove('btn-disabled');
    document.getElementById('btn-navigate-prev').classList.remove('btn-disabled');

    document.getElementById('btn-navigate-next').innerHTML = '<p>Export Song</p>';
}


function exportSong() {
    
}


function navigatePrevious() {
    const generateButton = document.getElementById('btn-generate');
    const songId = parseInt(generateButton.dataset.songId);
    window.location.href = `/hook/${songId}`;
}
