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

const debounce = (fn, delayMillis) => {
    let lastRun = 0;
    let to = null;
    return (...args) => {
        clearTimeout(to);
        const now = Date.now();
        const dfn = () => {
            lastRun = now;
            fn(...args);
        }
        if (now - lastRun > delayMillis) {
            dfn();
        } else {
            to = setTimeout(dfn, delayMillis);
        }
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
        this.bind(record, data => this.render(data));
    }
    compose({ h, b }) {
        return jdom`<div class="block">
            <div class="block-heading">
                <input value="${h}" type="text" />
            </div>
            <div class="block-body">
                <textarea value="${b}" />
            </div>
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

        this.save = debounce(this.save.bind(this), 1200);

        this.store.fetch();
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
        return jdom`<main class="app">
            <h1>${fmtDate(new Date())}</h1>
            <button onclick="${this.save}">Save</button>
            ${this.list.node}
        </main>`;
    }
}

const app = new App();
document.body.appendChild(app.node);
