document.addEventListener('DOMContentLoaded', () => {
    makeVerticallyResizable(
        document.getElementById('panel-top-content'),
        document.getElementById('panel-vertical-splitter'),
        document.getElementById('panel-bottom-content')
    );

    document.getElementById('btn-generate-song-names').onclick = (event) => {
        alert("clicked!")
    }

    // Initialize Drag and Drop
    const dragDropSystem = new DragDropSystem();

    dragDropSystem.init({
        onDragStart: (item, event) => {
            console.log('Drag started:', item.data.songName, 'from zone:', item.data.originalZone);
            // Add any specific logic when a drag starts on this page
            item.element.classList.add('opacity-50'); // Example: make original more transparent
        },
        onDrop: (item, zone, event) => {
            console.log('Dropped:', item.data.songName, 'into zone:', zone.name);
            // IMPORTANT: Move the actual DOM element to the new zone
            zone.element.appendChild(item.element); // This is a basic move, you might need more complex logic
            item.element.classList.remove('opacity-50');

            // Here you would typically make an API call to update the song's stage on the backend
            // For example: updateSongStage(item.data.songId, zone.name);
            //alert(`Song ${item.data.songName} (ID: ${item.data.songId}) dropped into ${zone.name}`);
        },
        canDrop: (item, zone, event) => {
            // Example: Prevent dropping a song back into its original list if that's a rule
            // if (item.data.originalZone === zone.name) {
            //     console.log(`Cannot drop ${item.data.songName} back into ${zone.name}`);
            //     return false;
            // }
            console.log(`Checking canDrop: ${item.data.songName} into ${zone.name}`);
            return true; // Allow dropping anywhere for now
        },
        onDragEnterZone: (item, zone, event) => {
            console.log('Entering zone:', zone.name, 'with item:', item.data.songName);
            zone.element.classList.add('bg-primary-focus', 'opacity-50'); // Highlight drop zone
        },
        onDragLeaveZone: (item, zone, event) => {
            console.log('Leaving zone:', zone.name, 'with item:', item.data.songName);
            zone.element.classList.remove('bg-primary-focus', 'opacity-50'); // Remove highlight
        }
    });

    // Register Draggable Items (Song Cards)
    document.querySelectorAll('.song-card').forEach(card => {
        const songId = card.dataset.songId;
        const songName = card.dataset.songName;
        const originalZone = card.closest('[data-drop-zone="true"]').dataset.zoneName; // Get initial zone
        dragDropSystem.registerDraggable(card, { songId, songName, originalZone });
    });

    // Register Drop Zones (Containers)
    const likedContainer = document.getElementById('liked-songs-container');
    const newContainer = document.getElementById('new-songs-container');
    const dislikedContainer = document.getElementById('disliked-songs-container');

    if (likedContainer) dragDropSystem.registerDropZone(likedContainer, { name: likedContainer.dataset.zoneName });
    if (newContainer) dragDropSystem.registerDropZone(newContainer, { name: newContainer.dataset.zoneName });
    if (dislikedContainer) dragDropSystem.registerDropZone(dislikedContainer, { name: dislikedContainer.dataset.zoneName });

});


