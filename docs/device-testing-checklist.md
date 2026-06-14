# Mobile and Tablet Device Test

Browser layout checks are automated, but camera and microphone quality must be
verified on physical devices before presenting tracking accuracy as complete.

## Devices

- One recent iPhone using Safari.
- One recent Android phone using Chrome.
- One iPad or Android tablet in landscape.
- Test a lower-performance device when available.

## Setup conditions

- Bright front lighting.
- Dim indoor lighting.
- Camera 1.5 to 2.5 metres from the player.
- Portrait and landscape orientation.
- Child-sized player and adult-sized player.
- Plain and visually busy backgrounds.

## Pass criteria

- Camera and microphone permission can be granted.
- Both hands remain marked without arm lines crossing.
- The interface maintains at least 20 tracking updates per second on a recent
  tablet, or gracefully reduces updates without blocking controls.
- Moving too close, too far, or outside the frame produces one stable setup
  message after at least 2.5 seconds.
- Brief landmark loss does not create a saved report event.
- No posture or technique correction is generated from framing events.
- Pitch display responds within 300 milliseconds to a sustained note.
- A natural pause creates one section and one pause, not repeated counts.
- Phone and tablet layouts have no horizontal overflow.
- Ending a session produces activity totals that match a timed manual check
  within two seconds.

## Child comprehension test

Ask the child, without explaining the screen:

1. What are you practising today?
2. Does the screen want you to stop or keep playing?
3. What does the camera message want you to do?
4. What would you choose to do next?

Revise any label that the child cannot explain in their own words.
