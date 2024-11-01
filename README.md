# To-Do List Application

This is a JavaScript project for creating a to-do list application.

## Description

The application runs at `localhost:4444/to-do-list`.

### Features

- **Task Management**: Users can add tasks under specific categories from a dropdown menu. Tasks can be marked as completed, moving them from the outstanding list to the completed tasks list. Completed tasks can be removed by pressing a remove button.
- **Category Management**: Users can add new categories with selected colors from a color picker. Categories can be removed or reset to the default types: Home, Garden, and Work. Removing a category will also remove all associated tasks.
- **Navigation**: A navigation bar allows users to switch between the category and tasks pages.

## Installation and Running

### Prerequisites

- Node.js (version 20)
- npm (Node Package Manager)
- nvm (Node Version Manager)

### Setup

1. **Clone the Repository**

   ```sh
   git clone https://github.com/yourusername/yourproject.git
   cd yourproject
   ```
2. **Install Dependencies**

    Ensure you have nodemon and express installed:

    ```sh
    npm init -y
    npm install -g nodemon
    npm install express
    ```

3. **Database Setup**

    The application supports both Redis and PostgreSQL for data persistence. Depending on the branch you are using:
    - For Redis, use the feature-22450 branch.
    - For PostgreSQL, use the master or main branch.

    Install the necessary database modules:

    ```sh
    npm install redis
    npm install pg
    ```

    When using PostgreSQL, you need to initialize the database by runing the bootstrap SQL file:

    ```sh
    psql -d todoapp -f bootstrap.sql
    psql -d todoapp <your_username> -f bootstrap.sql # If username required
    ```

4. **Run the Application**

    Use Node Version Manager (nvm) to switch to Node.js version 20 and start the application:

    ```ah
    nvm use 20
    npm run dev
    ```

    Open your browser and navigate to `http://localhost:4444`.

### Credentials and Ackwoledgements
This application was created by Vlad Filip under the supervision of Ilinca Ion.