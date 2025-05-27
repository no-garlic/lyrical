
/**
 * Pure utility functions for song card and container management.
 * These functions have no dependencies on other modules and can be used independently.
 */

/**
 * Sort song cards alphabetically within a panel.
 * @param {string} panelName - The ID of the panel containing the cards to sort.
 */
export function sortCardsInPanel(panelName) {
    const panel = document.getElementById(panelName);
    if (!panel) {
        console.error(`Panel with ID ${panelName} not found.`);
        return;
    }

    // get all child elements (song cards) of the panel
    const cards = Array.from(panel.children);

    // sort the cards alphabetically by their songName dataset property
    cards.sort((a, b) => {
        const nameA = a.dataset.songName ? a.dataset.songName.toLowerCase() : '';
        const nameB = b.dataset.songName ? b.dataset.songName.toLowerCase() : '';
        if (nameA < nameB) {
            return -1;
        }
        if (nameA > nameB) {
            return 1;
        }
        return 0;
    });

    // remove existing cards from the panel
    while (panel.firstChild) {
        panel.removeChild(panel.firstChild);
    }

    // append sorted cards back to the panel
    cards.forEach(card => {
        panel.appendChild(card);
    });
}

/**
 * Move a song card to a new container by song ID.
 * @param {string} songId - The ID of the song to move.
 * @param {string} newContainer - The ID of the destination container.
 */
export function moveSongCardById(songId, newContainer) {
    console.log(`Moving song card: ${songId}`);

    // get the destination panel and the song card
    const destinationPanel = document.getElementById(newContainer);
    const songCard = document.getElementById(`song-card-${songId}`);

    if (destinationPanel && songCard) {
        // move the song card
        destinationPanel.appendChild(songCard);

        // reset the background color incase it is still set to new
        songCard.classList.remove('bg-neutral');
        songCard.classList.add('bg-base-200');

        // update the cards stage
        songCard.dataset.songStage = destinationPanel.dataset.zoneName;

        return { destinationPanel, songCard };
    } else {
        console.error(`Error occured moving song card for songId: ${songId} to container ${newContainer}`);
        return null;
    }
}

/**
 * Get the count of child elements in a container.
 * @param {string} containerId - The ID of the container.
 * @returns {number} The number of child elements.
 */
export function getContainerChildCount(containerId) {
    const container = document.getElementById(containerId);
    return container ? container.childElementCount : 0;
}

/**
 * Update song card visual state for new cards.
 * @param {HTMLElement} card - The card element to update.
 */
export function setupNewCardVisualState(card) {
    // when a new card is created, change its background color to a brighter color until it
    // is clicked on once.
    card.classList.remove('bg-base-200');
    card.classList.add('bg-neutral');

    // the first time the card is clicked, change it's background back to the regular color
    const handleClickOnce = () => {
        card.classList.remove('bg-neutral');
        card.classList.add('bg-base-200');
        card.removeEventListener('click', handleClickOnce);
    };

    // add the event listener to the new card to revert the background color
    card.addEventListener('click', handleClickOnce);
}

/**
 * Get song data from a card element.
 * @param {HTMLElement} card - The card element.
 * @returns {Object} Object containing songId, songName, and songStage.
 */
export function getSongDataFromCard(card) {
    return {
        songId: card.dataset.songId,
        songName: card.dataset.songName,
        songStage: card.dataset.songStage
    };
}

/**
 * Update song card data attributes.
 * @param {HTMLElement} card - The card element.
 * @param {Object} data - Data to update (songName, songStage).
 */
export function updateSongCardData(card, data) {
    if (data.songName !== undefined) {
        card.dataset.songName = data.songName;
    }
    if (data.songStage !== undefined) {
        card.dataset.songStage = data.songStage;
    }
}
