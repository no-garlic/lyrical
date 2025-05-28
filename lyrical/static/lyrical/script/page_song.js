
/**
 * Initialize the page when the DOM is fully loaded
 */
document.addEventListener('DOMContentLoaded', () => {
    applyFilter();
    createEventHandlers();
});


function createEventHandlers() {
    const filterTerm = document.getElementById('filter-term');
    const filterNew = document.getElementById('filter-new');
    const filterLiked = document.getElementById('filter-liked');
    const filterGenerated = document.getElementById('filter-generated');
    const filterPublished = document.getElementById('filter-published');

    filterTerm.onkeyup = applyFilter;
    filterNew.onchange = applyFilter;
    filterLiked.onchange = applyFilter;
    filterGenerated.onchange = applyFilter;
    filterPublished.onchange = applyFilter;
}


function applyFilter() {
    // get the form filters
    const filterTerm = document.getElementById('filter-term');
    const filterNew = document.getElementById('filter-new');
    const filterLiked = document.getElementById('filter-liked');
    const filterGenerated = document.getElementById('filter-generated');
    const filterPublished = document.getElementById('filter-published');

    // get the song list
    const songList = document.getElementById('song-list');

    const searchTerm = filterTerm.value.trim();
    console.log(`search term: ${searchTerm}`)

    Array.from(songList.children).forEach(node => {
        if (searchTerm === '' || node.dataset.songName.toLowerCase().includes(searchTerm.toLowerCase())) {
            if (node.dataset.songStage === 'new' && filterNew.checked) {
                node.classList.remove('hidden');
            } else if (node.dataset.songStage === 'liked' && filterLiked.checked) {
                node.classList.remove('hidden');
            } else if (node.dataset.songStage === 'generated' && filterGenerated.checked) {
                node.classList.remove('hidden');
            } else if (node.dataset.songStage === 'published' && filterPublished.checked) {
                node.classList.remove('hidden');
            } else {
                node.classList.add('hidden');
            }
        } else {
            node.classList.add('hidden');
        }
    });



}
