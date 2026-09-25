# Home Assistant Cards

Two custom Lovelace cards in one repository:

- **[Climate Timer Card](#climate-timer-card)** – climate controls with a countdown timer, auto-off and duration presets
- **[Media Player Card](#media-player-card)** – a fully responsive `media_player` card

## Installation

### HACS

Frontend → Add custom repository → URL → type: Dashboard

HACS adds a single resource, `/hacsfiles/ha-climate-timer-card/cards.js`, which registers **both** cards.

### Manual

Copy the whole `dist/` folder into `/config/www/ha-cards/` and add one resource:

/local/ha-cards/cards.js
type: module

`cards.js` imports the individual card files, so one resource is all you need.

---

# Climate Timer Card

A custom Lovelace card that combines:

• Climate controls
• Countdown timer
• Auto-off
• Duration presets

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

---

# Media Player Card

A responsive Lovelace card for `media_player` entities. It fills whatever space the layout gives it and switches between a landscape and a portrait arrangement based on the card's own dimensions.

- **Landscape** – artwork on the left (max 50% width / 100% height), title + artist left-aligned on the right, centred transport controls, progress bar below.
- **Portrait** – artwork on top (max 100% width / 50% height), centred title, controls and progress below.

Artwork always keeps its aspect ratio.

## Usage

Pick **Media Player Card** from the dashboard's "Add card" dialog and choose an entity in the visual editor, or add it in YAML:

```yaml
type: custom:media-player-card
entity: media_player.living_room
```

**Configuration:**

- `entity` (required): Your `media_player` entity ID

Previous / play-pause / next buttons are dimmed automatically when the entity does not report support for them. The progress bar is only shown when the entity reports a media duration.
