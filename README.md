# To Do List Application 
This is a JavaScript project to create a to-do list.

## Description and user interface
The application is run at localhost:4444/to-do-list.

The user can add a task under one category from the select dropdown. 
The task can then be marked (i.e., ticked) as completed and move from the oustanding list to the completed tasks.
This can then be removed by rmeoved by pressing a remove button. 

There is a category page where new categories can be added with selected colors from the color select element.
Categories can be removed or reinitialiased to the three default types: home, garden, work. 
If a category is removed, all the tasks under that category from the task page will also be removed.
The navigation bar allows transition between the category and tasks pages. 

## Installation and running
To run the app download and open the master folder. 
You need to have the nodemon and express packages installed. 
For installation run following command in terminal:

```
npm init -y
npm install -g nodemon
npm install express
```
The data between restarts is stored in a Redis or PosgreSQL database depending on which version/branch you run.
To install either of these modules run:

```
npm install redis
npm install pg
```

After installation, run the dev command and go to local:444 on your browser.
For this you need to use node version 20.

```
nvm -v # To view current version
nvm current
nvm list # To list all versions
nvm use 20 # To switch
nmp run dev # To run the application in development mode
```