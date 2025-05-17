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
            const container = document.querySelector('.json-data')
            
            data.forEach(element => {
                const p = document.createElement('p')

                p.className = "hero-subheading";
                p.innerHTML = element.title;
                
                container.append(p);
            });


        })
        .catch(error => {
            console.error('Error calling the llm: ', error);
        });


}
