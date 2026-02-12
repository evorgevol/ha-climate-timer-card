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

## Setup

### 1. Add Timer Helpers (One per device)

Add to your `configuration.yaml`:

```yaml
timer:
    living_room_timer:
        duration: '08:00:00' # Max duration (doesn't matter, will be set by card)
    bedroom_timer:
        duration: '08:00:00'
```

See [example-config.yaml](example-config.yaml) for a complete example.

Restart Home Assistant after adding timers.

### 2. Add an Automation (One-time setup)

Create an automation to turn off the climate when the timer finishes. Add to `configuration.yaml` or via UI:

```yaml
automation:
    - alias: 'Climate Timer Auto-Off'
      trigger:
          - platform: event
            event_type: timer.finished
      condition:
          - condition: template
            value_template: "{{ trigger.event.data.entity_id.startswith('timer.') and '_timer' in trigger.event.data.entity_id }}"
      action:
          - service: climate.turn_off
            target:
                entity_id: "{{ 'climate.' + trigger.event.data.entity_id.replace('timer.', '').replace('_timer', '') }}"
```

### 3. Add the Card

```yaml
type: custom:climate-timer-card
entity: climate.living_room
timer: timer.living_room_timer
durations: [1, 2, 3, 4] # optional, hours
```

**Configuration:**

- `entity` (required): Your climate entity ID
- `timer` (required): Your timer helper entity ID
- `durations` (optional): Array of hour buttons. Default: `[1,2,3,4]`

## How it Works

When you press a duration button:

1. Climate device turns on
2. Timer helper starts counting down (visible on card)
3. When timer finishes, automation triggers and turns off the climate

**Timers run server-side in Home Assistant**, so they survive reboots, page refreshes, and work even when the card isn't visible! Each card has its own timer, so multiple devices can have independent timers running simultaneously.
