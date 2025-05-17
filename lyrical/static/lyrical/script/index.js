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
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    fetch('/call_llm', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-CSRFToken': csrfToken,
        }
    })
        .then(response => response.json())
        .then(data => {
            console.log(data);
            const element = document.querySelector('.hero-subheading')
            element.innerHTML = data;
        })
        .catch(error => {
            console.error('Error calling the llm: ', error);
        });


}
