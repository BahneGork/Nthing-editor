# Bugs & features
- ~preview formatting for yaml frontmatter and tags in writing focus~
- ~Find & Find&Replace dialogue box should be moveable~
- ~edit option: turn marked lines into bullet point list, numbered list.~
- ~Title bar: include filename without extension and some form of "saved" status, perhaps: not saved, last saved timestamp?~
- ~ctrl+1 still does not open recent file 1, etc.~ **FIXED** - Working now

- ~find & find replace does not highlight the word anymore, but stays focused on the dialogue box as we want. The yellow highlight appears, but it seems to be offset wrongly, it is not on the word searched for and it does not move if the text move. It looks like an overlay that is out of "sync".~ **FIXED** - Overlay now positions correctly using span's actual top position
- ~the standard behavior of bullet and number lists should apply, if i hit enter on a line that has a bullet/number it should automatically continue adding a bullet/next-number on the new line and if i hit enter one more time, it should remove it from that new line. This is standard is all editing software now.~ **FIXED** - Auto-continue works in Editor mode
- ~"Last saved - just now" is fine if the save was within seconds, but its not very telling when i come back to the window 1 hour later and i look at the save status and it says "Last saved - just now".~ **FIXED** - Updates every 60 seconds
- ~in writing focus with show formatting on, title bar save status does not change from Last saved just now to Not saved if i make changes. It does change to Last saved just now if i save.~ **FIXED** - CodeMirror now triggers content-changed notifications
- ~in writing focus with show formatting, bullet list continues as it should pr standard behavior, this does not happen when show formatting is turned off, nor does it work in editor mode.~ **FIXED** - Auto-continue works in Editor mode
- ~Also if another file is already open when using ctrl+1-9, pop warning box "are you sure you want to open another file, you will leave current file. Make sure you have saved first." or something similar, perhaps a save/save as button for the currently open file?~ **FIXED** - Warning dialog now shows for Open, Open Recent, and New with Save/Don't Save/Cancel options
- ~toggle autosave on/off in file menu, perhaps with options: 1min, 30min, 1hour? i dont know whats good intervals to provide as options, what are others offering?~ **FIXED** - Autosave menu added with intervals: 1, 5, 15, and 30 minutes
- file association
- ~i am not sure if this is intended or if it is a spinoff from the yellow highlighting on FIND. When i mark text now it gets a yellow background instead of blue.~ **FIXED** - Text selection now uses default blue color
- ~i cannot undo insert table?~ **FIXED** - Now uses execCommand to preserve undo history
- ~find/findreplace dialogue box, first time you click its title to move it, it makes a little jump away from the cursor.~ **FIXED** - Now uses getBoundingClientRect to account for CSS transform
- ~find doesnt scroll all the way to a found word.~ **FIXED** - Now uses exact coordinates to scroll and reveal matches at top or bottom


