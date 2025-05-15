document.addEventListener('DOMContentLoaded', function () {
    initSearchRadioButtons();
});

function initSearchRadioButtons() {
    // Get all radio buttons in the search form
    const radioButtons = document.querySelectorAll('.search-type input[type="radio"]');
    const searchInput = document.getElementById('search');

    // Add click event listener to each radio button
    radioButtons.forEach(function (radio) {
        radio.addEventListener('click', function () {
            handleRadioButtonClick(searchInput);
        });
    });
}

function handleRadioButtonClick(searchInput) {
    // Set focus back to the search input after a slight delay
    // The delay ensures the radio button click completes first
    // and it just feel better to the user
    setTimeout(function () {
        searchInput.focus();
    }, 10);
}
