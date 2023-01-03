###### AUAUST TOOLS — InDesign — Bundler

## About

Since UXP is a subset of JavaScript that doesn't support any kind of script importing (no library, no import, no require()), a bundler has been created for this purpose.
It basically concatenates files together in a very simple way using a declarative syntax inside comments. Explanation on how to use it available below.

## Directory structure

#### For the bundler

```
├ bundler.js
├ Dockerfile
├ docker-compose.yml
├ package.json
└ .env
```

Those files are used for running the `bundler.js` script.  
`Dockerfile` is a simple Node.js image that uses the latest version of Node.  
`docker-compose.yml` copies the required files to the container and starts the script, also enables using `docker compose up` for convenience.  
`package.json` is the configuration for the bundler.  
`.env` contains the `CURRENT_PROJECT` environment variable that is used to look for the `index.js` file and to name the bundled .idjs file.

#### For the scripts

```
├ GLOBALS/
├ PROJECTS/
│ └ <namespaces>
│   ├ index.js
│   └ IMPORTS/
└ BUNDLES/
  └ <namespaces>.idjs
```
**Warning**: When cloning this repository, you'll get binary files instead of actual folders. This is because they are symlinks to AUAUST's private scripts. Before using the bundler, you'll need to replace those files by actual folders and put your own scripts inside of them.

`GLOBALS` contains files that are made available globally by using the `useGlobal` statement.  
`PROJECTS` is the directory where project subdirectories are located.  
`PROJECTS/<namespaces>` are the scripts directories where `<namespaces>` is the name specified by the `CURRENT_PROJECT` variable in the `.env` file.  
`PROJECTS/<namespaces>/index.js` is the entry for the script, basically the script itself. It is also where `useGlobal` and `useLocal` statements are declared.  
`PROJECTS/<namespaces>/IMPORTS/` contains the files that are made available for that script by using the `useLocal` statement.  
`BUNDLES` is where bundled `.idjs` files are saved. It means this is where to run scripts from in InDesign.  
`BUNDLES/<namespaces>.idjs` are the bundled files. The name of the bundle is the same as the `CURRENT_PROJECT` variable, so it's easy to know where to find the source code.

## Using the bundler

#### Creating an index file

The entry for any script is at `PROJECTS/<namespaces>/index.js`. Once you have updated the `.env` file to tell the bundler where you want to work, it'll search for an index file there. To help understand how the bundler works, let's say the project we're working on is called `GENERATE`.

1. First, you'll need to be sure the content of `.env` is `CURRENT_PROJECT=GENERATE`.
2. Then, create the `PROJECTS/GENERATE` folder.
3. Add an `index.js` file. At this point, you're already good to run the bundler.

#### Running the bundler

We have set our current project inside `.env` and we have an index file. This is sufficient to create a "bundle" (which at this point will actually be a copy of the index.js file with empty lines and comments trimmed).
Before going further, be sure to have both `Docker` and `Docker Compose` installed and ready.

4. Open a new terminal and `cd` to the root of the directory.
5. Run `docker compose up`.
6. You should see `OK! BUNDLER SCRIPT STARTED` in the terminal after the container is launched.
7. If you did all right with setting up the environment and folders, you should also see `OK! INDEX FILE FOUND!`. Otherwise, you should see some debug information helping you understand what you did wrong.
8. You can navigate to `BUNDLES/` where you should find a new file: `GENERATE.idjs`!
9. That's it! You have your bundler running. Every time you'll edit the index file, it'll be bundled again to `GENERATE.idjs`.

#### Using the bundler's import system

At this point, we're not doing anything else than copying our file to another directory. Since the aim of that bundler is to enable importing files, let's do that!  
The bundler uses two kinds of imports: local and global imports. As mentionned earlier, globally available scripts are stored inside `GLOBALS` while locally available ones are stored in `PROJECTS/<namespaces>/IMPORTS`. Importing those files is done with declarations in the index.

Here's an exemple of such declaration:  
`#PROJECTS/GENERATE/index.js`

```
/* AUAUST
 * useGlobal exit alert
 */
```

As you can see, they're wrote inside comments. The first line, `/* AUAUST`, tells the bundler to read the comments inside that block.
Next, ` * useGlobal` is a rule telling it to look for the specified files. In our case, it'll look for `GLOBALS/exit.js` and `GLOBALS/alert.js`. Global files are always printed at the top of the bundle and in order of declaration. The local imports are a bit different. Let's update our index file:

```diff
 /* AUAUST
  * useGlobal exit alert
+ * useLocal variables
  */
```

If we ran that, we'd get an error: `ERR Declared an "useLocal" rule without specifying "@before" or "@after". Ignoring the declaration.`. That is, as the error says, because we did now tell the bundler where to put the import. Global scripts are considered to be "global utilities" like libraries consisting of functions or `const` declarations. With that consideration, we simply put them at the very top of the bundle to make them available anywhere in the script. Local script however are considered a way to split the code into more digest snippets. In that sense, it feels necessary to have a way to put order them differently.

We have two ways of choosing the position of the imported local script. The first one is the order in which they appear in the declarations. That is the same as global imports. For exemple, in the previous snippet we had that line: ` * useGlobal exit alert`. In the bundle, the script `exit.js` would be printed above `alert.js` because it is declared before. That is the same logic for local imports.

The second one is not one script relative to another but one script relative to the bundle. In ` * useLocal` rules, we **must** specify either `@before` or `@after` somewhere. Scripts linked inside `@before` rules will be printed after the global imports and before the index's contents while `@after` rules will be printed at the feet of the bundle. So let's update our index:

```diff
 /* AUAUST
  * useGlobal exit alert
- * useLocal variables
+ * useLocal @before variables
  */
```

And that is it!

You should be able to bundle anything from now!

> **A note**: there's no limit in the use of rules. You can use one big ` * useGlobal` rule with 10 imports or 10 ` * useGlobal` rules with one import each. It'll just work as expected. You can also set the `@position` of local imports anywhere. ` * useLocal @before variables` will work exactly the same way as ` * useLocal variables @before`.

## Using the bundles in InDesign

While you could technically simply put your cloned repo into you InDesign scripts folder, it would also include all other files in InDesign's script panel. It would also prevent you from having other scripts beside the bundler's scripts without editting the .gitignore file.

The easiest alternative is to create a symlink inside the script folder that points to `BUNDLES`. That way, you have access to all bundles inside InDesign without having to deal with other files. And it enables you to have your normal scripts beside without messing with the repo at all.
