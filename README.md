# Tourist for Visual Studio Code

## What's all this about?

Tourist is a tool for documenting your code through "tours", similarly to how
an experienced developer may introduce a newer dev to a codebase.

## Running the code

Before you can build this project, you need to build `tourist` from
[hgoldstein95/tourist](https://github.com/hgoldstein95/tourist). By default,
the `package.json` requires that the two repositories be siblings. This will
change when `tourist` is hosted on npm. After that, remember to run
```bash
npm install
```
in the `tourist-vscode` directory.

This project is a Visual Studio Code plugin. In order to run the plugin, open
the top-level directory in VSCode and simply run the debugger.

A new editor window should open with the Tourist extension running!

## Simple Workflow

Start off by creating a separate directory (versioned with git if desired)
that will hold your tours. You can use this to keep track of lots of tours of
lots of codebases at once.

Create a workspace with your new tour directory, as well as any repositories
that you might want to put tour stops in.

Select your tour directory in the file explorer, and then run the "Create a
new tour" command to make a new tour file.

Now, you can go from file to file, adding tour stops by right clicking on
lines in code and selecting "Add a tour stop" from the context menu. Once you
create a stop, you can add a markdown body.