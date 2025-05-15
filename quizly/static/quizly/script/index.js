document.addEventListener('DOMContentLoaded', function () {
    initHeroButton();
});

function initHeroButton() {
    // Set up the hero button click handler
    const heroButton = document.querySelector('.hero-btn');
    if (heroButton) {
        heroButton.addEventListener('click', handleHeroButtonClick);
    }
}

function handleHeroButtonClick() {
    // Redirect to the browse page
    window.location.href = '/browse';
}
