import { LitElement, html, css } from 'https://unpkg.com/lit@2.0.0/index.js?module'

// media_player supported_features bitmask
const SUPPORT_PAUSE = 1
const SUPPORT_PREVIOUS_TRACK = 16
const SUPPORT_NEXT_TRACK = 32
const SUPPORT_PLAY = 16384

class MediaPlayerCard extends LitElement {
    static properties = {
        hass: {},
        config: {},
        _orientation: { state: true },
    }

    constructor() {
        super()
        this._orientation = 'landscape'
        this._updateInterval = null
        this._resizeObserver = null
    }

    setConfig(config) {
        if (!config.entity) throw new Error('entity required')

        this.config = { ...config }
    }

    getCardSize() {
        return 4
    }

    connectedCallback() {
        super.connectedCallback()

        // Live progress needs a tick
        this._updateInterval = setInterval(() => this.requestUpdate(), 1000)

        this._resizeObserver = new ResizeObserver(([entry]) => {
            const { width, height } = entry.contentRect
            if (!width || !height) return
            this._orientation = width >= height ? 'landscape' : 'portrait'
        })
        this._resizeObserver.observe(this)
    }

    disconnectedCallback() {
        super.disconnectedCallback()

        if (this._updateInterval) {
            clearInterval(this._updateInterval)
            this._updateInterval = null
        }

        if (this._resizeObserver) {
            this._resizeObserver.disconnect()
            this._resizeObserver = null
        }
    }

    // ---------------- helpers ----------------

    _entity() {
        return this.hass?.states[this.config.entity]
    }

    _state() {
        return this._entity()?.state
    }

    _isPlaying() {
        return this._state() === 'playing'
    }

    _supports(feature) {
        return ((this._entity()?.attributes?.supported_features || 0) & feature) !== 0
    }

    _title() {
        const a = this._entity()?.attributes || {}
        return a.media_title || a.friendly_name || this.config.entity
    }

    _artist() {
        const a = this._entity()?.attributes || {}
        return a.media_artist || a.media_series_title || a.media_album_name || ''
    }

    _image() {
        const picture = this._entity()?.attributes?.entity_picture
        if (!picture) return null
        if (/^https?:\/\//.test(picture)) return picture
        return this.hass.hassUrl ? this.hass.hassUrl(picture) : picture
    }

    _progress() {
        const a = this._entity()?.attributes || {}
        const duration = a.media_duration
        if (!duration || duration <= 0) return null

        let position = a.media_position ?? 0
        if (this._isPlaying() && a.media_position_updated_at) {
            position += (Date.now() - new Date(a.media_position_updated_at).getTime()) / 1000
        }
        position = Math.min(Math.max(position, 0), duration)

        return { position, duration, percent: (position / duration) * 100 }
    }

    _formatTime(seconds) {
        const total = Math.floor(seconds)
        const h = Math.floor(total / 3600)
        const m = Math.floor((total % 3600) / 60)
        const s = total % 60

        if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
        return `${m}:${String(s).padStart(2, '0')}`
    }

    // ---------------- services ----------------

    _call(service) {
        this.hass.callService('media_player', service, {
            entity_id: this.config.entity,
        })
    }

    // ---------------- render ----------------

    render() {
        const entity = this._entity()
        if (!entity) return html`<ha-card>Entity not found</ha-card>`

        const image = this._image()
        const artist = this._artist()
        const progress = this._progress()

        const canPrevious = this._supports(SUPPORT_PREVIOUS_TRACK)
        const canNext = this._supports(SUPPORT_NEXT_TRACK)
        const canPlayPause = this._supports(SUPPORT_PLAY | SUPPORT_PAUSE)

        return html`
            <ha-card>
                <div class="wrapper ${this._orientation}">
                    <div class="art">
                        ${image
                            ? html`<img src=${image} alt="" />`
                            : html`<div class="art-placeholder">
                                  <ha-icon icon="mdi:music"></ha-icon>
                              </div>`}
                    </div>

                    <div class="info">
                        <div class="text">
                            <div class="title">${this._title()}</div>
                            ${artist ? html`<div class="artist">${artist}</div>` : ''}
                        </div>

                        <div class="controls">
                            <ha-icon-button
                                class=${canPrevious ? '' : 'disabled'}
                                .disabled=${!canPrevious}
                                label="Previous"
                                @click=${() => this._call('media_previous_track')}
                            >
                                <ha-icon icon="mdi:skip-previous"></ha-icon>
                            </ha-icon-button>

                            <ha-icon-button
                                class="play ${canPlayPause ? '' : 'disabled'}"
                                .disabled=${!canPlayPause}
                                label=${this._isPlaying() ? 'Pause' : 'Play'}
                                @click=${() => this._call('media_play_pause')}
                            >
                                <ha-icon icon=${this._isPlaying() ? 'mdi:pause' : 'mdi:play'}></ha-icon>
                            </ha-icon-button>

                            <ha-icon-button
                                class=${canNext ? '' : 'disabled'}
                                .disabled=${!canNext}
                                label="Next"
                                @click=${() => this._call('media_next_track')}
                            >
                                <ha-icon icon="mdi:skip-next"></ha-icon>
                            </ha-icon-button>
                        </div>

                        ${progress
                            ? html`
                                  <div class="progress">
                                      <div class="bar">
                                          <div class="fill" style=${`width:${progress.percent}%`}></div>
                                      </div>
                                      <div class="times">
                                          <span>${this._formatTime(progress.position)}</span>
                                          <span>${this._formatTime(progress.duration)}</span>
                                      </div>
                                  </div>
                              `
                            : ''}
                    </div>
                </div>
            </ha-card>
        `
    }

    // ---------------- styles ----------------

    static styles = css`
        :host {
            display: block;
            height: 100%;
        }

        ha-card {
            height: 100%;
            box-sizing: border-box;
            padding: 12px;
            overflow: hidden;
            color: var(--primary-text-color);
        }

        .wrapper {
            display: flex;
            height: 100%;
            gap: 12px;
            min-width: 0;
            min-height: 0;
        }

        .art {
            display: flex;
            align-items: center;
            justify-content: center;
            min-width: 0;
            min-height: 0;
        }

        .art img,
        .art-placeholder {
            display: block;
            border-radius: var(--ha-card-border-radius, 12px);
            object-fit: contain;
        }

        .art-placeholder {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 100%;
            min-width: 48px;
            min-height: 48px;
            background: var(--secondary-background-color);
            color: var(--secondary-text-color);
        }

        .art-placeholder ha-icon {
            --mdc-icon-size: 36px;
        }

        .info {
            display: flex;
            flex-direction: column;
            justify-content: center;
            gap: 8px;
            flex: 1 1 auto;
            min-width: 0;
            min-height: 0;
        }

        .title {
            font-size: var(--ha-card-header-font-size, 1.1rem);
            font-weight: 600;
            line-height: 1.2;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .artist {
            font-size: 0.9rem;
            color: var(--secondary-text-color);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .controls {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
            color: var(--state-icon-color, var(--primary-text-color));
        }

        .controls ha-icon-button.play {
            --mdc-icon-size: 32px;
        }

        .controls .disabled {
            opacity: 0.3;
            pointer-events: none;
        }

        .progress {
            width: 100%;
        }

        .bar {
            height: 4px;
            border-radius: 2px;
            background: var(--divider-color, rgba(127, 127, 127, 0.3));
            overflow: hidden;
        }

        .fill {
            height: 100%;
            border-radius: 2px;
            background: var(--primary-color, #03a9f4);
        }

        .times {
            display: flex;
            justify-content: space-between;
            margin-top: 4px;
            font-size: 0.75rem;
            color: var(--secondary-text-color);
        }

        /* ---- landscape ---- */

        .wrapper.landscape {
            flex-direction: row;
        }

        .wrapper.landscape .art {
            flex: 0 0 auto;
            height: 100%;
            max-width: 50%;
        }

        /* height drives the size; max-width clamps it, and the browser keeps the ratio */
        .wrapper.landscape .art img {
            height: 100%;
            width: auto;
            max-width: 100%;
        }

        .wrapper.landscape .text {
            text-align: left;
        }

        /* ---- portrait ---- */

        .wrapper.portrait {
            flex-direction: column;
        }

        .wrapper.portrait .art {
            flex: 0 0 auto;
            width: 100%;
            height: 50%;
        }

        .wrapper.portrait .art img {
            height: 100%;
            width: auto;
            max-width: 100%;
        }

        .wrapper.portrait .info {
            justify-content: flex-start;
        }

        .wrapper.portrait .text {
            text-align: center;
        }
    `
}

customElements.define('media-player-card', MediaPlayerCard)

window.customCards = window.customCards || []
window.customCards.push({
    type: 'media-player-card',
    name: 'Media Player Card',
    description: 'A responsive media player card with artwork, transport controls and progress.',
})
