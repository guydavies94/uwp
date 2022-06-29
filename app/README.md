# Setting up UWPets

You will need:
* Node.js (tested with v17.5)
* MySQL/MariaDB (tested with MariaDB v15.1)

## Setting up the database
While logged into a MySQL/MariaDB shell as a user with database creation permissions, and with your current working directory set to the root of your UWPets local repository, run `source init-database.sql` to create the UWPets database and initialise the tables with some sample rows.

## Setting up the server
With your current working directory set to the root of your UWPets local repository, run `npm install` to install the required Node.js packages (express and mysql2). You can then run `node .` to begin a session, which will launch the server (by default on port 80, although you can change this in the app/settings.json file).

## Using the web app
Navigate to http://localhost/ in your browser to access the UWPets admin console.

Thank you for taking the time to consider my application, and have a great day!