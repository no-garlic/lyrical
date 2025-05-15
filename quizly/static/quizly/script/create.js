document.addEventListener('DOMContentLoaded', function () {
    initQuestionFormToggle();
});

function initQuestionFormToggle() {
    // Get the button and form container elements
    const showFormButton = document.getElementById('show-question-form');
    const questionFormContainer = document.getElementById('question-form-container');
    const buttonContainer = document.querySelector('.add-question-button-container');
    const saveQuestionButtonContainer = document.getElementById('save-question-button-container');

    // Add click event listener to the button
    if (showFormButton && questionFormContainer) {
        showFormButton.addEventListener('click', function () {
            handleShowFormButtonClick(
                questionFormContainer,
                saveQuestionButtonContainer,
                buttonContainer
            );
        });
    }
}

function handleShowFormButtonClick(
    questionFormContainer,
    saveQuestionButtonContainer,
    buttonContainer
) {
    // Show the form container
    questionFormContainer.style.display = 'flex';

    // Show the save button container
    saveQuestionButtonContainer.style.display = 'flex';

    // Hide the button container
    buttonContainer.style.display = 'none';

    // Focus on the question text field
    document.getElementById('question-text').focus();
}
