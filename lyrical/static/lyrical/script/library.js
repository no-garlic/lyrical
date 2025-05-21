document.addEventListener('DOMContentLoaded', () => {
    makeVerticallyResizable(
        document.getElementById('panel1-top-content'),
        document.getElementById('panel1-vertical-splitter'),
        document.getElementById('panel1-bottom-content')
    );

    document.getElementById('btn-edit-song-name').onclick = (event) => {
        alert("clicked!")
    }

});


