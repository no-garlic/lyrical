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
            console.log('Drag started:', item, event);
            // Add any specific logic when a drag starts on this page
        },
        onDrop: (item, zone, event) => {
            console.log('Dropped:', item, 'into zone:', zone, event);
            // IMPORTANT: Move the actual DOM element to the new zone
            // The zone itself might be the direct parent, or you might have a specific child container within the zone.
            // This example assumes the zone is the direct container.
            zone.appendChild(item.element);

            // Update song stage or send data to backend here
            const songId = item.data.songId;
            const newStage = zone.dataset.zoneName;
            console.log(`Song ${songId} moved to stage ${newStage}`);
            // Example: sendUpdateRequestToServer(songId, newStage);
        },
        canDrop: (item, zone, event) => {
            // Example: Prevent dropping a 'liked' item back into the 'liked' zone if it's already there.
            // This is a basic check; more complex logic might be needed.
            // if (item.data.songStage === zone.dataset.zoneName) {
            //     console.log('Cannot drop item in the same zone it came from.');
            //     return false;
            // }
            return true; // Allow drop by default
        },
        onDragEnterZone: (item, zone, event) => {
            console.log('Entered zone:', zone.id);
            // Add visual feedback or logic when item enters a drop zone
        },
        onDragLeaveZone: (item, zone, event) => {
            console.log('Left zone:', zone.id);
            // Remove visual feedback or logic when item leaves a drop zone
        }
    });

    // Register Draggable Items (Song Cards)
    document.querySelectorAll('.song-card').forEach(card => {
        dragDropSystem.registerDraggable(card, {
            id: card.dataset.songId, // Unique ID for the draggable item
            songId: card.dataset.songId,
            songName: card.dataset.songName,
            songStage: card.dataset.songStage,
            type: 'song-card' // Optional: type for filtering in canDrop
        });
    });

    // Register Drop Zones (Containers)
    const likedContainer = document.getElementById('liked-songs-container');
    const newContainer = document.getElementById('new-songs-container');
    const dislikedContainer = document.getElementById('disliked-songs-container');

    if (likedContainer) dragDropSystem.registerDropZone(likedContainer, ['song-card']);
    if (newContainer) dragDropSystem.registerDropZone(newContainer, ['song-card']);
    if (dislikedContainer) dragDropSystem.registerDropZone(dislikedContainer, ['song-card']);

});


