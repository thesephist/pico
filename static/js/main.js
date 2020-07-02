const {
    Record,
    StoreOf,
    Component,
    ListOf,
} = window.Torus;

const MONTHS = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
];

function fmtDate(date) {
    return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

function relativeDate(date) {
    const delta = (new Date() - date) / 1000;
    if (delta < 60) {
        return '< 1 min ago';
    } else if (delta < 3600) {
        return `${~~(delta / 60)} min ago`;
    } else if (delta < 86400) {
        return `${~~(delta / 3600)} hr ago`;
    } else if (delta < 86400 * 2) {
        return 'yesterday';
    } else if (delta < 86400 * 3) {
        return '2 days ago';
    } else {
        return date.toLocaleDateString() + ' ' + formatTime(date);
    }
}

// only fire fn once it hasn't been called in delay ms
const bounce = (fn, delay) => {
    let to = null;
    return (...args) => {
        const bfn = () => fn(...args);
        clearTimeout(to);
        to = setTimeout(bfn, delay);
    }
}

class Block extends Record { }

class BlockStore extends StoreOf(Block) {
    fetch() {
        return fetch('/data')
            .then(r => r.json())
            .then(data => this.reset(data.map(d => new Block(d))));
    }
    save() {
        return fetch('/data', {
            method: 'POST',
            body: JSON.stringify(this.serialize()),
        });
    }
}

class BlockItem extends Component {
    init(record, removeCallback) {
        this.removeCallback = removeCallback;
        this._collapsed = false;

        this.handleHeadingInput = evt => this.handleInput('h', evt);
        this.handleBodyInput = evt => this.handleInput('b', evt);
        this.handleKeydown = this.handleKeydown.bind(this);
        this.handleToggleCollapse = this.handleToggleCollapse.bind(this);
        this.handleRemove = this.handleRemove.bind(this);

        this.bind(record, data => this.render(data));
    }
    isCollapsed() {
        return this._collapsed;
    }
    setCollapsed(c) {
        this._collapsed = c;
        this.render();
    }
    handleInput(prop, evt) {
        this.record.update({[prop]: evt.target.value})
    }
    handleKeydown(evt) {
        if (evt.key === 'Tab') {
            evt.preventDefault();
            const idx = evt.target.selectionStart;
            if (idx !== null) {
                const front = this.record.get('b').substr(0, idx);
                const back = this.record.get('b').substr(idx);
                this.record.update({b: front + '    ' + back});
                this.render();
                evt.target.setSelectionRange(idx + 4, idx + 4);
            }
        }
    }
    handleToggleCollapse() {
        this.setCollapsed(!this._collapsed);
    }
    handleRemove() {
        const isEmpty = !(this.record.get('h').trim() + this.record.get('b').trim());
        const result = isEmpty ? true : confirm('Remove?');
        if (!result) {
            return;
        }

        this.removeCallback();
    }
    compose({h, b}) {
        return jdom`<div class="block">
            <div class="block-heading">
                <input value="${h}" type="text"
                    placeholder="heading"
                    oninput="${this.handleHeadingInput}" />
                <div class="button-bar">
                    <button title="Expand/collapse"
                        onclick="${this.handleToggleCollapse}">
                        ${this._collapsed ? 'E' : 'C'}
                    </button>
                    <button title="Remove"
                        onclick="${this.handleRemove}">R</button>
                </div>
            </div>
            ${this._collapsed ? null : jdom`<div class="block-body">
                <textarea value="${b}"
                    placeholder="write..."
                    onkeydown="${this.handleKeydown}"
                    oninput="${this.handleBodyInput}" />
                <div class="p-heights ${b.endsWith('\n') ? 'end-line' : ''}>${b}</div>
            </div>`}
        </div>`;
    }
}

class BlockList extends ListOf(BlockItem) {
    compose() {
        return jdom`<div class="block-list">
            ${this.nodes}
        </div>`;
    }
}

class App extends Component {
    init() {
        this.store = new BlockStore();
        this.list = new BlockList(this.store);

        this._loading = false;
        this._error = false;
        this._lastSaved = new Date();
        this._lastSavedState = '';

        this.handleAllToggleCollapsed = this.handleAllToggleCollapsed.bind(this);
        this.save = bounce(this.save.bind(this), 800);

        this.store.fetch().then(() => {
            this._lastSavedState = JSON.stringify(this.store.serialize());
            this.bind(this.store, this.save);
            this.render();
        });

        this._interval = setInterval(this.render.bind(this), 60 * 1000);
    }
    remove() {
        super.remove();
        clearInterval(this._interval);
    }
    handleAllToggleCollapsed() {
        const allCollapsed = this.isAllCollapsed();
        for (const item of this.list.components) {
            item.setCollapsed(!allCollapsed);
        }
        this.render();
    }
    save() {
        const thisSavedState = JSON.stringify(this.store.serialize());
        if (this._lastSavedState === thisSavedState) {
            return;
        }

        this._lastSavedState = thisSavedState;
        this._loading = true;
        this.render();
        this.store.save().then(() => {
            this._lastSaved = new Date();
            this._error = false;
        }).catch(e => {
            this._error = e.toString();
        }).finally(() => {
            setTimeout(() => {
                this._loading = false;
                this.render();
                // adding artificial delay makes this easy to see as a user.
            }, 500);
        });
    }
    isAllCollapsed() {
        return this.list.components.every(c => c.isCollapsed());
    }
    compose() {
        const hour = new Date().getHours();
        if (hour < 8 || hour > 20) {
            document.body.classList.add('dark');
            document.documentElement.style.background = '#222';
        } else {
            document.body.classList.remove('dark');
            document.documentElement.style.background = '#fafafa';
        }

        return jdom`<main class="app" oninput="${this.save}">
            <header>
                <div class="header-left">
                    <h1>${fmtDate(new Date())}</h1>
                    <p class="sub">
                        ${this._loading ? 'Saving...' : `Saved ${relativeDate(this._lastSaved)}, ${this._lastSavedState.length}b`}
                    </div>
                </div>
                <div class="button-bar">
                    <button title="Expand/collapse all"
                        onclick="${this.handleAllToggleCollapsed}">
                        ${this.isAllCollapsed() ? 'Ea' : 'Ca'}
                    </button>
                    <button title="Add block"
                        onclick="${() => this.store.create({h: '', b: ''})}">A</button>
                </div>
            </header>
            ${this._error ? jdom`<p><em>${this._error}</em></p>` : null}
            ${this.list.node}
            <footer>
                <p class="sub">
                    Pico is built with
                    <a href="https://github.com/thesephist/torus" target="_blank">Torus</a>
                    and open-source on
                    <a href="https://github.com/thesephist/pico" target="_blank">GitHub</a>.
                </p>
            </footer>
        </main>`;
    }
}

const app = new App();
document.body.appendChild(app.node);
