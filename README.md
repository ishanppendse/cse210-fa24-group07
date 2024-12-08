# cse210-fa24-group07
CSE 210 Fall 2024 Project for Team 07

Navigate to the application folder - 
## Installing dependencies
Use npm install 
## Running the application
npm run start-dev
## Building the application executable for current platform
npm run make
## Building the application executable for MacOS
npm run make --platform darwin 
## Building the application executable for Windows
npm run make --platform win32
## Building the application executable for Linux
npm run make --platform linux
## Using JSDocs for documentation
The JSDoc command-line tool is available in
`./node_modules/.bin`. To generate documentation for the file
`yourJavaScriptFile.js`:

    ./node_modules/.bin/jsdoc yourJavaScriptFile.js

If you installed JSDoc globally, run the `jsdoc` command:

    jsdoc yourJavaScriptFile.js

By default, the generated documentation is saved in a directory named `out`. You can use the `--destination` (`-d`) option to specify another directory.

## Global shortcut

When the app is running, press `Ctrl+Alt+T`(on Windows) or `Command+Alt+T`(on Mac) to show the app .
