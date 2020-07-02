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
        this.handleToggleCollapse = this.handleToggleCollapse.bind(this);
        this.handleRemove = this.handleRemove.bind(this);

        this.bind(record, data => this.render(data));
    }
    handleInput(prop, evt) {
        this.record.update({[prop]: evt.target.value})
    }
    handleToggleCollapse() {
        this._collapsed = !this._collapsed;
        this.render();
    }
    handleRemove() {
        const result = confirm('Remove?')
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
                    <button title="Expand / Collapse"
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

        this.save = bounce(this.save.bind(this), 800);

        this.store.fetch().then(() => {
            this.bind(this.store, this.save);
        });
    }
    save() {
        this._loading = true;
        this.render();
        this.store.save().then(() => {
            this._error = false;
            this._loading = false;
            this.render();
        }).catch(e => {
            console.error(e);
            this._error = e.toString();
            this._loading = false;
            this.render();
        });
    }
    compose() {
        return jdom`<main class="app" oninput="${this.save}">
            <h1>${fmtDate(new Date())}</h1>
            <button onclick="${() => this.store.create({h: '', b: ''})}">Add</button>
            ${this.list.node}
        </main>`;
    }
}

const app = new App();
document.body.appendChild(app.node);
