// Grab all the todos by class
const todos = document.querySelectorAll(".todo");

// Add a click event to each of them
todos.forEach(todo => {
    todo.addEventListener("click", function () {
        this.style.textDecoration = "line-through";
    });
});