# Climate Timer Card

A custom Lovelace card that combines:

• Climate controls
• Countdown timer
• Auto-off
• Duration presets

## Installation

### HACS
Frontend → Add custom repository → URL → type: Dashboard

### Manual
Copy `dist/climate-timer-card.js` into `/config/www/`
and add:

/local/climate-timer-card.js
type: module

## Usage

```
type: custom:climate-timer-card
entity: climate.living_room
timer: timer.living_room_timer
durations: [1,2,3]
```