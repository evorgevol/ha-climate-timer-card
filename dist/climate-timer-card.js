import { LitElement, html, css } from 'https://unpkg.com/lit@2.0.0/index.js?module'

class ClimateTimerCard extends LitElement {
    static properties = {
        hass: {},
        config: {},
    }

    constructor() {
        super()
        this._updateInterval = null
    }

    setConfig(config) {
        if (!config.entity) throw new Error('entity required')
        if (!config.timer) throw new Error('timer entity required')

        this.config = {
            durations: [1, 2, 3, 4],
            ...config,
        }
    }

    connectedCallback() {
        super.connectedCallback()
        // Update every second for live countdown
        this._updateInterval = setInterval(() => this.requestUpdate(), 1000)
    }

    disconnectedCallback() {
        super.disconnectedCallback()
        if (this._updateInterval) {
            clearInterval(this._updateInterval)
            this._updateInterval = null
        }
    }

    // ---------------- helpers ----------------

    _climate() {
        return this.hass.states[this.config.entity]
    }

    _timer() {
        return this.hass.states[this.config.timer]
    }

    _isOn() {
        return this._climate()?.state !== 'off'
    }

    _isTimerRunning() {
        return this._timer()?.state === 'active'
    }

    _finishesAt() {
        return this._timer()?.attributes?.finishes_at
    }

    _formatRemaining() {
        const finishesAt = this._finishesAt()
        if (!finishesAt) return ''

        const now = new Date()
        const endTime = new Date(finishesAt)
        const diffSeconds = Math.max(0, Math.floor((endTime - now) / 1000))

        const hours = Math.floor(diffSeconds / 3600)
        const minutes = Math.floor((diffSeconds % 3600) / 60)
        const seconds = diffSeconds % 60

        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    }

    _tempColor() {
        const s = this._climate()?.state
        if (s === 'cool') return 'blue'
        if (s === 'heat') return 'red'
        return ''
    }

    // ---------------- services ----------------

    _turnOn() {
        this.hass.callService('climate', 'turn_on', {
            entity_id: this.config.entity,
        })
    }

    _turnOff() {
        this.hass.callService('climate', 'turn_off', {
            entity_id: this.config.entity,
        })

        // Cancel timer if running
        this.hass.callService('timer', 'cancel', {
            entity_id: this.config.timer,
        })
    }

    _startTimer(hours) {
        // Turn on climate
        this._turnOn()

        // Start the timer
        this.hass.callService('timer', 'start', {
            entity_id: this.config.timer,
            duration: hours * 3600,
        })
    }

    _setTemp(delta) {
        const c = this._climate()
        const newTemp = (c.attributes.temperature || 0) + delta

        this.hass.callService('climate', 'set_temperature', {
            entity_id: this.config.entity,
            temperature: newTemp,
        })
    }

    // ---------------- render ----------------

    render() {
        const climate = this._climate()
        if (!climate) return html`<ha-card>Entity not found</ha-card>`

        const isOn = this._isOn()
        const running = this._isTimerRunning()
        const remaining = this._formatRemaining()

        const current = climate.attributes.current_temperature ?? '--'
        const target = climate.attributes.temperature ?? '--'

        return html`
            <ha-card>
                <div class="wrapper">
                    <div class="current ${this._tempColor()}">
                        <ha-icon icon="mdi:thermometer"></ha-icon>
                        ${current}°
                    </div>

                    <div class="target-row">
                        <div class="pm" @click=${() => this._setTemp(-1)}>−</div>

                        <div class="target">${`${target}°`}</div>

                        <div class="pm" @click=${() => this._setTemp(1)}>+</div>
                    </div>

                    ${running ? html`<div class="timer-text">⏱ ${remaining}</div>` : ''}

                    <div class="bottom">
                        <div class="btn icon ${!isOn ? 'active' : ''}" @click=${() => this._turnOff()}>
                            <ha-icon icon="mdi:power"></ha-icon>
                        </div>

                        <div class="btn icon ${isOn && !running ? 'active' : ''}" @click=${() => this._turnOn()}>
                            <ha-icon icon="mdi:snowflake"></ha-icon>
                        </div>

                        ${this.config.durations.map((h) => {
                            const active = running

                            return html`
                                <div class="btn ${active ? 'active' : ''}" @click=${() => this._startTimer(h)}>
                                    ${h}
                                </div>
                            `
                        })}
                    </div>
                </div>
            </ha-card>
        `
    }

    // ---------------- styles ----------------

    static styles = css`
        ha-card {
            padding: 16px;
            text-align: center;
        }

        .current {
            font-size: 14px;
            opacity: 0.7;
            margin-bottom: 6px;
            display: flex;
            justify-content: center;
            gap: 6px;
            align-items: center;
        }

        .current.blue {
            color: #3fa9ff;
        }
        .current.red {
            color: #ff5a5a;
        }

        .target-row {
            display: flex;
            justify-content: center;
            gap: 22px;
            margin: 14px 0;
            align-items: center;
        }

        .target {
            font-size: 36px;
            min-width: 90px;
        }

        .pm {
            font-size: 26px;
            cursor: pointer;
            user-select: none;
        }

        .bottom {
            display: flex;
            justify-content: space-around;
            gap: 8px;
        }

        .btn {
            padding: 6px 10px;
            border-radius: 10px;
            opacity: 0.5;
            cursor: pointer;
            width: 100%;
        }

        .timer-text {
            padding-bottom: 20px;
        }

        .btn.active {
            opacity: 1;
            background: var(--primary-color);
            color: white;
        }
    `
}

customElements.define('climate-timer-card', ClimateTimerCard)
