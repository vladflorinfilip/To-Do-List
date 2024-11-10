// Import dependencies
const express = require("express")
const bodyParser = require("body-parser")
const redis = require("redis");
const { promisify } = require("util");

// Create a new express application object
const app = express()
app.set('view engine', 'ejs');

// Define global variables for the two task lists
var todos = [];
var ticks = [];
var categories = [];

// Create a Redis client
// Create a Redis client with correct port and host
const REDIS_PORT = process.env.REDIS_PORT || 6379; // Default Redis port is 6379
const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1'; // Default Redis host is localhost
const client = redis.createClient({
    host: REDIS_HOST,
    port: REDIS_PORT
});

client.on("error", function (error) {
    console.error(`Redis client not connected to the server: ${error}`);
});

client.on("connect", function () {
    console.log("Redis client connected to the server");
});

// Middleware
app.use("/static", express.static("static"))
app.use(express.urlencoded({extended: true}))
app.use(bodyParser.urlencoded({ extended: true }));

// Immediately-Invoked Function Expression (IIFE) to ensure Redis client connection at startup
(async () => {
    try {
        await client.connect();

        // Ensure the store is initialized at the start and handle errors
        const { todos, ticks, categories } = await initializeStore();
    } catch (error) {
        console.error("Error during Redis client connection or store initialization:", error);
        process.exit(1); // Exit the process with failure code
    }
})();

// Promisify Redis client methods for easier async/await usage
const setAsync = promisify(client.set).bind(client);

// Initialize Redis store if not already initialized
async function initializeStore() {
    try {
        console.log('INITIALIZING STORE');

        // Check if categories list exist
        console.log("Fetching categories from Redis...");
        if (await client.exists('categories')) {
            console.log('Categories already initialized.');
            categories = JSON.parse(await client.get('categories')) || [];;
        } else {
            console.log('Categories not found, initializing...');
            categories = [];
            categories.push({category: 'Work', color: '#0f74cc'});
            categories.push({category: 'Home', color: '#5db7c6'});
            categories.push({category: 'Garden', color: '#6b65da'});
            setAsync('categories', JSON.stringify(categories));
            console.log('Initialized.');
        }

        for (let index in categories) {
            category = categories[index].category;
            if (await client.exists(category)) {
                console.log('Category is already initialized:',category);
                this[category] = JSON.parse(await client.get(category)) || [];
            } else {
                console.log('Category not found, initializing...');
                setAsync(category, JSON.stringify([]))
                console.log('Initialized category:',category);
            }
        }

        // Create todos and ticks from the categories databases
        todos = [];
        ticks = [];
        for (let index in categories) {
            category = categories[index].category;
            tasks = JSON.parse(await client.get(category));
            for (let indexTask in tasks) {
                if (tasks[indexTask].ticked == 0) {
                    todos.push({task: tasks[indexTask].task, category: category});
                } else {
                    ticks.push({task: tasks[indexTask].task, category: category});
                }
            }
        }

        return {todos, ticks, categories}
    } catch (err) {
        console.error('Error initializing store:', err);
    }
}

// Write/remove task to Redis
async function writeTasks(taskNAME, taskVALUE, category) {
    try {
        index = this[category].findIndex(t => t.task == taskNAME);
        if (index > -1) {
            if (this[category][index].ticked == 0) {
                this[category][index].ticked = 1;
                await client.set(category, JSON.stringify(this[category]));
            } else {
                this[category].splice(index, 1);
                await client.set(category, JSON.stringify(this[category]));
            }
        } else {
            this[category].push({task: taskNAME, ticked: taskVALUE});
            await client.set(category, JSON.stringify(this[category]));
        }
    } catch (err) {
        console.error('Error writing tasks to Redis:', err);
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
        const tickedTask = req.body.check;;
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
                await writeTasks(taskName, 1, category); // Update redis database
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
                categories.push({ category: newCategory , color: newColor });
                // Write category to redis
                await client.set('categories', JSON.stringify(categories));
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
            const [category, color] = categorytoRemove.split('_')
            const categoryIndex  = categories.findIndex(t => t.category === category && t.color == color);
            // Remove from category database
            if (categoryIndex > -1) {
                categories.splice(categoryIndex, 1);
                console.log('Removed category:', category);
            }
            // Remove tasks from todos with the removed category
            var todosIndex = todos.findIndex(t => t.category == category);
            while (todosIndex > -1) {
                todos.splice(todosIndex,1);
                var todosIndex = todos.findIndex(t => t.category == category);
            }
            // Remove tasks from ticks with the removed category
            var tickedIndex = ticks.findIndex(t => t.category == category);
            while (tickedIndex > -1) {
                ticks.splice(tickedIndex,1);
                var tickedIndex = ticks.findIndex(t => t.category == category);
            }
            await client.set('categories', JSON.stringify(categories));
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
        categories = [];
        categories.push({category: 'Work', color: '#0f74cc'});
        categories.push({category: 'Home', color: '#5db7c6'});
        categories.push({category: 'Garden', color: '#6b65da'});
        // Write in database
        await client.set('categories', JSON.stringify(categories));
        console.log('Categories reseted.');
        res.redirect("/categories");
    } catch (err) {
        console.error('Error reseting categories:', err);
        res.status(500).send('Internal Server Error');
    }
})
// Close the Redis client gracefully on server shutdown
async function shutdown() {
    try {
        await client.quit();
        console.log("Redis client disconnected");
        process.exit(0);
    } catch (err) {
        console.error("Error during Redis client disconnection:", err);
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