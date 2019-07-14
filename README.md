# Tourist for Visual Studio Code

## What's all this about?

Tourist is a new approach to documentation that allows programmers to explain
low-level technical details of a system while simultaneously providing the
context of how those details fit into the broader architecture. It lets
programmers document code in the same way that they would explain it in
person: by walking the consumer step-by-step through the important parts of a
codebase.

A **tour** is a series of locations throughout a codebase, along with
accompanying prose that explains the importance each location in turn.

A maintainer of a project can more effectively introduce newcomers to the
project by setting up one or more tours for the codebase that highlight the
relevant functional components. A person implementing a complex feature or
workflow can use a tour to solicit feedback from other people who are
familiar to the codebase, but not that particular logical flow.

## Getting Started

To create a new tour, start off by creating a separate directory (versioned
with git if desired) that will hold your tours. You can use this to keep
track of lots of tours of lots of codebases at once.

From the command palette (`CTRL-SHIFT-P` by default), run **Tourist: Create a
new tour**. Give the tour a name, and save the file in your tour directory.

Now, you can go from file to file, adding tour stops by right clicking on
lines in code and selecting "Add a tour stop" from the context menu. Once you
create a stop, you can add a markdown body.

### Opening a Tour from Someone Else

If someone else provides you with a tour, there are a couple of steps that
you need to take before you'll be able to actually view the tour.

First, make sure you have any repositories that the tour visits checked out
on your machine via git. For example, if the tour touches
`tourist-doc/tourist-core` and `tourist-doc/tourist-vscode`, make sure you
have both checked out locally.

Then, run **Tourist: Map a name to a repository** from the command palette and
show tourist where you put each repository on your system. By convention, the
tour file will use the plain repository name (e.g. `tourist-core` for
`tourist-doc/tourist-core`) but you may want to check the `repositories`
section of the `.tour` file just to be sure.

Now you can run **Tourist: Start a tour** to view the tour!

Optionally, you can also turn on "Read-only Mode" by unchecking "Show Edit
Controls" in the tourist user settings.

## Development

This project is a Visual Studio Code plugin. In order to run the plugin, open
the top-level directory in VSCode and simply run the debugger.

A new editor window should open with the Tourist extension running!
