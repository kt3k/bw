# The lifecycle of the characters

(Note: The main character always exists at the center of the screen)

1. Loaded as part of BlockMap.
2. Split into 10x10 chunk
3. When the character enters into ActivateScope, they get activated

- This check only happes for the characters in the chunks that overlaps with the
  ActivateScope.
- This check happens every 16 frames.
- However if the character is already in ViewScope, then they don't get
  activated (This happens when a character moves far away from its spawn point,
  and leaves ActivateScope while the spawn point is inside ViewScope)
  - However this rule doesn't apply when the main character warped to somewhere,
    or first appear in the screen

4. Activated characters are updated each frame. (by calling .step() function)
5. When an activated character leaves ActivateScope, then they go back to
   inactive state. Go back to step 3.

- This check happens every 60 frames.

# The lifecycle of the items

...
