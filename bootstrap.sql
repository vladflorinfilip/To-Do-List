-- Check if categories table exists
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS categories;

-- Create categories table
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    color VARCHAR(7) NOT NULL -- Color is stored as a hex code
);

-- Insert default categories
INSERT INTO categories (name, color) VALUES
('Work', '#0f74cc'),
('Home', '#5db7c6'),
('Garden', '#6b65da');

-- Create tasks table
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
    completed BOOLEAN DEFAULT FALSE 
);