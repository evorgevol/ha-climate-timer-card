class ClimateTimerCard extends HTMLElement {
  setConfig(config) {
    this.config = config;
  }

  set hass(hass) {
    const entity = hass.states[this.config.entity];
    const timer = hass.states[this.config.timer];

    if (!this.content) {
      this.innerHTML = `
        <ha-card>
          <div class="wrap">
            <button id="minus">−</button>
            <div class="temp"></div>
            <button id="plus">+</button>

            <div class="timer"></div>
            <div class="row"></div>
          </div>
        </ha-card>
      `;

      this.content = this.querySelector(".wrap");
      this.tempEl = this.querySelector(".temp");
      this.timerEl = this.querySelector(".timer");
      this.rowEl = this.querySelector(".row");

      const style = document.createElement("style");
      style.textContent = `
        .wrap {
          display:grid;
          grid-template-columns:60px 1fr 60px;
          grid-template-areas:
            "minus temp plus"
            "timer timer timer"
            "row row row";
          text-align:center;
          padding:20px;
        }

        .temp { font-size:64px; font-weight:600; grid-area:temp; }
        #minus { grid-area:minus; }
        #plus { grid-area:plus; }
        .timer { grid-area:timer; opacity:.7; font-size:24px; }
        .row { grid-area:row; display:flex; gap:6px; justify-content:center; }
      `;
      this.appendChild(style);

      this.querySelector("#minus").onclick = () =>
        hass.callService("climate", "set_temperature", {
          entity_id: this.config.entity,
          temperature: entity.attributes.temperature - 1
        });

      this.querySelector("#plus").onclick = () =>
        hass.callService("climate", "set_temperature", {
          entity_id: this.config.entity,
          temperature: entity.attributes.temperature + 1
        });
    }

    // update temp
    this.tempEl.innerHTML = `${entity.attributes.temperature}°`;

    // update timer
    if (timer && timer.state === "active") {
      this.timerEl.innerHTML = timer.attributes.remaining;
    } else {
      this.timerEl.innerHTML = "";
    }

    // build duration buttons
    this.rowEl.innerHTML = "";
    (this.config.durations || [1,2,3]).forEach(h => {
      const b = document.createElement("button");
      b.innerText = `${h}h`;
      b.onclick = () =>
        hass.callService("script", "timed_entity", {
          entity: this.config.entity,
          timer: this.config.timer,
          duration: `${String(h).padStart(2,"0")}:00:00`
        });
      this.rowEl.appendChild(b);
    });
  }

  getCardSize() {
    return 3;
  }
}

customElements.define("climate-timer-card", ClimateTimerCard);
