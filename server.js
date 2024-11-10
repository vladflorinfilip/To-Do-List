// Import dependencies
const express = require("express");
const bodyParser = require("body-parser");
const cors = require('cors');
const { Pool } = require('pg');

// Create a new express application object
const app = express()
app.set('view engine', 'ejs');

// Define global variables
var todos = [];
var ticks = [];
var categories = [];
var categoryMap = {};

// PostgreSQL connection pool
const pool = new Pool({
    user: 'vlad.filip',
    host: 'localhost',
    database: 'todoapp',
    password: '',
    port: 5432,
});

// Middleware
app.use("/static", express.static("static"));
app.use(express.urlencoded({extended: true}));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
app.use(express.json());

// Immediately-Invoked Function Expression (IIFE) to ensure PosgreSQL connection at startup
(async () => {
    try {
        // Ensure the store is initialized at the start and handle errors
        const { todos, ticks, categories, categoryMap } = await initializeStore();
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
        // Get categories
        const categoriesResult = await pool.query('SELECT * FROM categories');
        categories = categoriesResult.rows;
        // Get tasks
        const tasksResult = await pool.query('SELECT * FROM tasks');
        tasks = tasksResult.rows;

        // Create a mapping from category_id to category_name
        categoryMap = {};
        categories.forEach(category => {
            categoryMap[category.id] = category.name;
        });

        // Initialize todos and ticks arrays
        todos = [];
        ticks = [];
        for (let task of tasks) {
            const categoryName = categoryMap[task.category_id];  // Lookup category name
            if (!task.completed) {
                // Add elements to outstanding list
                todos.push({task: task.name, category: categoryName})
            } else {
                // Add elements to completed tasks list
                ticks.push({ task: task.name, category: categoryName})
            }
        }
        return {todos, ticks, categories, categoryMap};
        } catch (err) {
            console.error('Error initializing store:', err);
            return { todos: [], ticks: [], categories: [], categoryMap: [] };
    }
}

// ROUTES
app.get("/to-do-list", async (req, res) => {
    try {
        res.render("./pug/index.pug", {
            name: "Vlad Filip",
            todos: todos,
            ticks: ticks,
            categories: categories,
            categoryMap: categoryMap
        });
    } catch (err) {
        console.error("Error initializing or reading tasks:", err);
        res.status(500).send("Internal Server Error");
    }
})

app.get("/categories", async (req,res) => {
    try {
        res.render("./pug/categories.pug", {
            name: "Vlad Filip",
            todos: todos,
            ticks: ticks,
            categories: categories,
            categoryMap: categoryMap
        });
    } catch (err) {
        console.error("Error fetching categories:", err);
        res.status(500).send("Internal Server Error");
    }
})

// APIs
app.get("/api/outstanding-tasks", async (req, res) => {
    try {
        res.json(todos);
    } catch (err) {
        console.error("Error fetching outstanding tasks:", err);
        res.status(500).send("Internal Server Error");
    }
});

app.get("/api/completed-tasks", async (req, res) => {
    try {
        res.json(ticks);
    } catch (err) {
        console.error("Error fetching completed tasks:", err);
        res.status(500).send("Internal Server Error");
    }
});

// POST METHODS
// Read and add task
app.post("/addtask", async (req, res) => {
    try{ 
        // Read task
        const newTask = req.body.task;
        // Read category
        const category = req.body.category;
        // Reverse category map
        const reverseCategoryMap = Object.fromEntries(
            Object.entries(categoryMap).map(([id, name]) => [name, id])
          );
        // Get category id
        const categoryId = reverseCategoryMap[category];
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
                await pool.query(`INSERT INTO tasks (name, category_id, completed) VALUES ($1, $2, $3)`, [newTask, categoryId ,false])
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
        console.log(tickedTask);
        if (tickedTask) {
            // Split the task name and category
            const [taskName, category] = tickedTask.split('_')
            // Remove the task from
            const taskIndex = todos.findIndex(t => t.task === taskName && t.category == category);
            if (taskIndex > -1) {
                // Delete in todos
                todos.splice(taskIndex, 1);
                // Push to ticks
                ticks.push({ task: taskName, category: category }); 
                // Update database
                await pool.query(`UPDATE tasks SET completed = $1 WHERE name = $2`, [true, taskName]);
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
            console.log(taskIndex);
            if (taskIndex > -1) {
                ticks.splice(taskIndex, 1); // Remove from ticks
                await pool.query(`DELETE FROM tasks WHERE name = $1`, [taskName]); // Update PostgreSQL
            }
            console.log('Removed task:', taskName);
            res.redirect('/to-do-list');
        } else {
            res.status(422).send(`You haven't given me a task`);
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
            index_category = categories.findIndex(t => t.name === newCategory);
            if (index_category > -1) {
                console.log("Category already exists.")
            } else {
                // Push new todo into array
                categories.push({ name: newCategory , color: newColor });

                // Write category to PostgreSQL and return the new ID
                const result = await pool.query(
                    'INSERT INTO categories (name, color) VALUES ($1, $2) RETURNING id',
                    [newCategory, newColor]
                );

                // Get ID
                const newCategoryId = result.rows[0].id;

                // Add the new category to the object
                categoryMap[newCategoryId] = newCategory;
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