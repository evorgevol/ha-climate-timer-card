import { LitElement, html, css } from "https://unpkg.com/lit@2.8.0/index.js?module";

class ClimateTimerCard extends LitElement {
  static properties = {
    hass: {},
    config: {},
  };

  setConfig(config) {
    if (!config.entity) throw new Error("entity required");
    this.config = {
      durations: [1, 2, 3],
      ...config,
    };
  }

  // ---------- helpers ----------

  get climate() {
    return this.hass.states[this.config.entity];
  }

  get timerEntity() {
    if (this.config.timer) return this.config.timer;

    // auto-name timer.climateName_timer
    const name = this.config.entity.split(".")[1];
    return `timer.${name}_timer`;
  }

  get timer() {
    return this.hass.states[this.timerEntity];
  }

  call(domain, service, data) {
    this.hass.callService(domain, service, data);
  }

  setTemp(delta) {
    const t = this.climate.attributes.temperature + delta;
    this.call("climate", "set_temperature", {
      entity_id: this.config.entity,
      temperature: t,
    });
  }

  turnOn() {
    this.call("homeassistant", "turn_on", {
      entity_id: this.config.entity,
    });
  }

  turnOff() {
    this.call("homeassistant", "turn_off", {
      entity_id: this.config.entity,
    });
  }

  startTimer(hours) {
    const duration = `${String(hours).padStart(2, "0")}:00:00`;

    this.turnOn();

    this.call("timer", "start", {
      entity_id: this.timerEntity,
      duration,
    });
  }

  // auto off when timer finishes
  connectedCallback() {
    super.connectedCallback();

    window.addEventListener("hass-event", (e) => {
      if (
        e.detail.event_type === "timer.finished" &&
        e.detail.data.entity_id === this.timerEntity
      ) {
        this.turnOff();
      }
    });
  }

  // ---------- styling ----------

  static styles = css`
    ha-card {
      padding: 18px;
      border-radius: 24px;
    }

    .wrap {
      display: grid;
      grid-template-areas:
        "current current current"
        "minus target plus"
        "timer timer timer"
        "row row row"
        "power power power";
      grid-template-columns: 60px 1fr 60px;
      gap: 8px;
      text-align: center;
      align-items: center;
    }

    .current {
      grid-area: current;
      font-size: 14px;
      opacity: 0.7;
    }

    .target {
      grid-area: target;
      font-size: 64px;
      font-weight: 600;
    }

    .cooling {
      color: #4da3ff;
    }

    .heating {
      color: #ff6b6b;
    }

    button {
      font-size: 20px;
      border-radius: 18px;
      padding: 10px;
      border: none;
      background: var(--ha-card-background, #222);
      cursor: pointer;
    }

    .minus { grid-area: minus; }
    .plus { grid-area: plus; }

    .timer {
      grid-area: timer;
      font-size: 20px;
      opacity: 0.7;
    }

    .row {
      grid-area: row;
      display: flex;
      justify-content: center;
      gap: 6px;
    }

    .power {
      grid-area: power;
      display: flex;
      justify-content: center;
      gap: 10px;
    }
  `;

  // ---------- render ----------

  render() {
    if (!this.climate) return html``;

    const c = this.climate;
    const t = this.timer;

    const current = c.attributes.current_temperature;
    const target = c.attributes.temperature;

    const mode = c.state; // heating / cooling / off

    const colorClass =
      mode === "cooling"
        ? "cooling"
        : mode === "heating"
        ? "heating"
        : "";

    return html`
      <ha-card>
        <div class="wrap">

          <!-- current temp -->
          <div class="current ${colorClass}">
            🌡 ${current ?? "--"}°
          </div>

          <!-- minus -->
          <button class="minus" @click=${() => this.setTemp(-1)}>−</button>

          <!-- target -->
          <div class="target ${colorClass}">
            ${target}°
          </div>

          <!-- plus -->
          <button class="plus" @click=${() => this.setTemp(1)}>+</button>

          <!-- timer -->
          <div class="timer">
            ${t?.state === "active" ? `⏱ ${t.attributes.remaining}` : ""}
          </div>

          <!-- durations -->
          <div class="row">
            ${this.config.durations.map(
              (h) =>
                html`<button @click=${() => this.startTimer(h)}>
                  ${h}h
                </button>`
            )}
          </div>

          <!-- power buttons -->
          <div class="power">
            <button @click=${() => this.turnOn()}>On</button>
            <button @click=${() => this.turnOff()}>Off</button>
          </div>

        </div>
      </ha-card>
    `;
  }

  getCardSize() {
    return 3;
  }
}

customElements.define("climate-timer-card", ClimateTimerCard);
