// Import dependencies
const express = require("express")
const bodyParser = require("body-parser")
const { Pool } = require('pg');

// Create a new express application object
const app = express()
app.set('view engine', 'ejs');

// Define global variables for the two task lists
var todos = [];
var ticks = [];
var categories = [];

// PostgreSQL connection pool
const pool = new Pool({
    user: 'vlad.filip',
    host: 'localhost',
    database: 'todoapp',
    password: '',
    port: 5432,
});

// Middleware
app.use("/static", express.static("static"))
app.use(express.urlencoded({extended: true}))
app.use(bodyParser.urlencoded({ extended: true }));

// Immediately-Invoked Function Expression (IIFE) to ensure PosgreSQL connection at startup
(async () => {
    try {
        // Ensure the store is initialized at the start and handle errors
        const { todos, ticks, categories } = await initializeStore();
    } catch (error) {
        console.error("Error during PostgreSQL client connection or store initialization:", error);
        process.exit(1); // Exit the process with failure code
    }
})();

// Initialize data from PostgreSQL
async function initializeStore() {
    try {
        console.log('INITIALIZING STORE');

        // Fetch categories from PostgreSQL
        console.log("Fetching categories from PosgreSQL...");
        const categoriesResult = await pool.query('SELECT * FROM categories');
        categories = categoriesResult.rows;

        // Initialize todos and ticks arrays
        todos = [];
        ticks = [];

        for (let category of categories) {
            const tableName = `${category.name.toLowerCase()}_tasks`;
            const tasksResult = await pool.query(`SELECT * FROM ${tableName}`);
            const tasks = tasksResult.rows;

            for (let task of tasks) {
                if (!task.completed) {
                    // Add elements to outstanding tasks list
                    todos.push({ task: task.name, category: category.name });
                } else {
                    // Add elements to completed tasks list
                    ticks.push({ task: task.name, category: category.name })
                }
            }
        }
        return {todos, ticks, categories};
        } catch (err) {
            console.error('Error initializing store:', err);
            return { todos: [], ticks: [], categories: [] };
    }
}

// Write/update task to PostgreSQL
async function writeTasks(taskNAME, taskVALUE, category) {
    try {
        const tableName = `${category}_tasks`;
        console.log(tableName);
        if (taskVALUE === 1) {
            await pool.query(`UPDATE ${tableName} SET completed = $1 WHERE name = $2`, [true, taskNAME]);
        } else {
            await pool.query(`INSERT INTO ${tableName} (name, completed) VALUES ($1, $2) ON CONFLICT (name) DO UPDATE SET completed = $2`, [taskNAME, false]);
        }
    } catch (err) {
        console.error('Error writing tasks to PostgreSQL:', err);
    }
}

// ROUTES
app.get("/to-do-list", async (req, res) => {
    try {
        res.render("index.ejs", {
            name: "Vlad Filip",
            todos: todos,
            ticks: ticks,
            categories: categories
        });
    } catch (err) {
        console.error("Error initializing or reading tasks:", err);
        res.status(500).send("Internal Server Error");
    }
})

app.get("/categories", async (req,res) => {
    try {
        res.render("categories.ejs", {
            name: "Vlad Filip",
            todos: todos,
            ticks: ticks,
            categories: categories
        });
    } catch (err) {
        console.error("Error fetching categories:", err);
        res.status(500).send("Internal Server Error");
    }
})

// Read and add task
app.post("/addtask", async (req, res) => {
    try{ 
        // Read task
        const newTask = req.body.task;
        // Read category
        const category = req.body.category;
        if (newTask && category) {
            // Check the task has not already been added
            index_todos = todos.findIndex(t => t.task === newTask && t.category == category);
            index_ticks = ticks.findIndex(t => t.task === newTask && t.category == category);
            if (index_ticks > -1 || index_todos > -1) {
                console.log("This task has already been added.");
            } else {
                // Push new todo into array
                todos.push({ task: newTask , category: category });
                // Write tasks in database
                await writeTasks(newTask, 0, category);
                console.log('Added new task:', newTask);

            }
        }
        res.redirect('/to-do-list');
    } catch (err) {
        console.error('Error adding task:', err);
        res.status(500).send("Internal Server Error");
    }
});

// Tick task
app.post("/ticktask", async (req, res) => {
    try {
        // Read ticked task
        const tickedTask = req.body.check;
        if (tickedTask) {
            // Split the task name and category
            const [taskName, category] = tickedTask.split('_')
            // Remove the task from
            const taskIndex = todos.findIndex(t => t.task === taskName && t.category == category);
            if (taskIndex > -1) {
                todos.splice(taskIndex, 1); // Delete in todos
                ticks.push({ task: taskName, category: category }); // Push to ticks
                await writeTasks(taskName, 1, category) // Update redis
            }
            console.log('Ticked task:', taskName);
            res.redirect('/to-do-list');
        }
    } catch (err) {
        console.error('Error completing task:', err);
        res.status(500).send('Internal Server Error');
    }
});

// Remove task 
app.post("/removetask", async (req,res) => {
    try {
        // Read task to remove
        const tasktoRemove = req.body.tasktoRemove;
        if (tasktoRemove) {
            // Split the task name and category
            const [taskName, category] = tasktoRemove.split('_')
            const taskIndex  = ticks.findIndex(t => t.task === taskName && t.category == category);
            if (taskIndex > -1) {
                ticks.splice(taskIndex, 1); // Remove from ticks
                await pool.query(`DELETE FROM ${category.toLowerCase()}_tasks WHERE name = $1`, [taskName]); // Update PostgreSQL
            }
        console.log('Removed task:', taskName);
        res.redirect('/to-do-list');
        }
    } catch (err) {
        console.error('Error removing task:', err);
        res.status(500).send('Internal Server Error');
    }
})

// Add category
app.post("/addcategory", async (req,res) => {
    try {
        // Read category and color
        const newCategory = req.body.new_category;
        const newColor = req.body.color;
        if (newCategory && newColor) {
            // Check the category has not already been added
            index_category = categories.findIndex(t => t.category === newCategory);
            if (index_category > -1) {
                console.log("Category already exists.")
            } else {
                // Push new todo into array
                categories.push({ name: newCategory , color: newColor });
                // Write category to PostgreSQL
                await pool.query('INSERT INTO categories (name, color) VALUES ($1, $2)', [newCategory, newColor]);
                // Create a new table for the category
                const tableName = `${newCategory.toLowerCase()}_tasks`;
                await pool.query(`CREATE TABLE ${tableName} (id SERIAL PRIMARY KEY, name TEXT NOT NULL, completed BOOLEAN DEFAULT FALSE)`);
                console.log('Added new category:', newCategory);
            }
        }
        res.redirect("/categories");
    } catch (err) {
        console.error('Error adding category:', err);
        res.status(500).send("Internal Server Error");
    }
})

// Remove category
app.post("/removecategory", async (req,res) => {
    try {
        // Read category to be removed from category
        const categorytoRemove = req.body.categorytoRemove;
        if (categorytoRemove) {
            // Split the task name and category
            const [nameCategory, color] = categorytoRemove.split('_')
            const categoryIndex  = categories.findIndex(t => t.name === nameCategory && t.color == color);
            // Remove from category database
            if (categoryIndex > -1) {
                categories.splice(categoryIndex, 1);
                console.log('Removed category:', nameCategory);
            }
            // Remove tasks from todos with the removed category
            var todosIndex = todos.findIndex(t => t.category == nameCategory);
            while (todosIndex > -1) {
                todos.splice(todosIndex,1);
                var todosIndex = todos.findIndex(t => t.category == nameCategory);
            }
            // Remove tasks from ticks with the removed category
            var tickedIndex = ticks.findIndex(t => t.category == nameCategory);
            while (tickedIndex > -1) {
                ticks.splice(tickedIndex,1);
                var tickedIndex = ticks.findIndex(t => t.category == nameCategory);
            }
            // Remove category from PostgreSQL
            await pool.query('DELETE FROM categories WHERE name = $1', [nameCategory]);
            // Drop the table for the category
            const tableName = `${nameCategory.toLowerCase()}_tasks`;
            await pool.query(`DROP TABLE IF EXISTS ${tableName}`);;
        }
        res.redirect("/categories");
    } catch (err) {
        console.error('Error removing task:', err);
        res.status(500).send('Internal Server Error');
    }
})

// Function to reset categories to default values
app.post("/resetcategories", async (req,res) => {
    try{
        // Adds default categories
        categories = [
            { name: 'Work', color: '#0f74cc' },
            { name: 'Home', color: '#5db7c6' },
            { name: 'Garden', color: '#6b65da' }
        ];
        // Write categories to PostgreSQL
        await pool.query('DELETE FROM categories');
        for (let category of categories) {
            await pool.query('INSERT INTO categories (name, color) VALUES ($1, $2)', [category.name, category.color]);
            const tableName = `${category.name.toLowerCase()}_tasks`;
            await pool.query(`CREATE TABLE IF NOT EXISTS ${tableName} (id SERIAL PRIMARY KEY, name TEXT NOT NULL, completed BOOLEAN DEFAULT FALSE)`);
        }
        console.log('Categories reseted!');
        res.redirect("/categories");
    } catch (err) {
        console.error('Error reseting categories:', err);
        res.status(500).send('Internal Server Error');
    }
})

// Close the PostgreSQL client gracefully on server shutdown
async function shutdown() {
    try {
        await pool.end();
        console.log("PostgreSQL client disconnected");
        process.exit(0);
    } catch (err) {
        console.error("Error during PostgreSQL client disconnection:", err);
        process.exit(1);
    }
}

// Handle process termination signals
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// Run your application, so it listens on port 4444
app.listen(4444, () => {
    console.log("Server is Listening on port 4444")
})