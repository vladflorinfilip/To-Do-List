-- Check if categories table exists
DROP TABLE IF EXISTS categories;

-- Create categories table
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    color VARCHAR(7) NOT NULL -- Assuming color is stored as a hex code
);

-- Insert default categories
INSERT INTO categories (name, color) VALUES
('Work', '#0f74cc'),
('Home', '#5db7c6'),
('Garden', '#6b65da');

-- Create work tasks table
DROP TABLE IF EXISTS work_tasks;
CREATE TABLE work_tasks (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(7) NOT NULL -- Assuming color is stored as a hex code
);

-- Create categories table
DROP TABLE IF EXISTS home_tasks;
CREATE TABLE home_tasks (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(7) NOT NULL -- Assuming color is stored as a hex code
);

-- Create categories table
DROP TABLE IF EXISTS garden_tasks;
CREATE TABLE garden_tasks (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(255) NOT NULL -- Assuming color is stored as a hex code
);