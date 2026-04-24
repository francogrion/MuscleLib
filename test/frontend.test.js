const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createClassList() {
    const classes = new Set();

    return {
        add(name) {
            classes.add(name);
        },
        remove(name) {
            classes.delete(name);
        },
        replace(from, to) {
            if (classes.has(from)) {
                classes.delete(from);
            }

            classes.add(to);
        },
        contains(name) {
            return classes.has(name);
        },
    };
}

function createElement(tagName) {
    return {
        tagName,
        children: [],
        attributes: {},
        listeners: {},
        className: '',
        classList: createClassList(),
        style: {},
        innerHTML: '',
        textContent: '',
        appendChild(child) {
            child.parentNode = this;
            this.children.push(child);
            return child;
        },
        replaceChildren(...children) {
            this.children = [];
            children.forEach((child) => this.appendChild(child));
        },
        setAttribute(name, value) {
            this.attributes[name] = value;
        },
        addEventListener(type, handler) {
            if (!this.listeners[type]) {
                this.listeners[type] = [];
            }

            this.listeners[type].push(handler);
        },
        dispatchEvent(event) {
            const handlers = this.listeners[event.type] || [];
            handlers.forEach((handler) => handler(event));
        },
        querySelector(selector) {
            if (selector === '.collapse-icon') {
                return { classList: createClassList() };
            }

            return null;
        },
        querySelectorAll(selector) {
            if (selector === '.exercise-card') {
                return this.children.filter((child) => child.className === 'exercise-card');
            }

            return [];
        },
    };
}

function createTimerController() {
    let nextId = 1;
    const timers = new Map();

    return {
        setTimeout(callback, delay) {
            const id = nextId++;
            timers.set(id, { callback, delay });
            return id;
        },
        clearTimeout(id) {
            timers.delete(id);
        },
        runAll() {
            const pending = [...timers.entries()];
            timers.clear();
            pending.forEach(([, timer]) => timer.callback());
        },
        count() {
            return timers.size;
        },
    };
}

function createScriptEnvironment() {
    const timerController = createTimerController();
    const intervalCalls = [];
    const fetchCalls = [];
    const observerInstances = [];
    const documentListeners = {};
    const windowListeners = {};
    const exercisesContainer = createElement('div');

    exercisesContainer.id = 'exercises-container';

    const document = {
        addEventListener(type, handler) {
            if (!documentListeners[type]) {
                documentListeners[type] = [];
            }

            documentListeners[type].push(handler);
        },
        dispatchEvent(event) {
            const handlers = documentListeners[event.type] || [];
            handlers.forEach((handler) => handler(event));
        },
        getElementById(id) {
            if (id === 'exercises-container') {
                return exercisesContainer;
            }

            return null;
        },
        createElement,
        body: {
            offsetHeight: 1000,
        },
    };

    const window = {
        innerHeight: 900,
        scrollY: 0,
        addEventListener(type, handler) {
            if (!windowListeners[type]) {
                windowListeners[type] = [];
            }

            windowListeners[type].push(handler);
        },
        setTimeout: timerController.setTimeout,
        clearTimeout: timerController.clearTimeout,
    };

    class FakeIntersectionObserver {
        constructor(callback, options) {
            this.callback = callback;
            this.options = options;
            this.observed = [];
            this.unobserved = [];
            observerInstances.push(this);
        }

        observe(target) {
            this.observed.push(target);
        }

        unobserve(target) {
            this.unobserved.push(target);
        }
    }

    const context = {
        console,
        window,
        document,
        IntersectionObserver: FakeIntersectionObserver,
        fetch(url) {
            fetchCalls.push(url);
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve([{
                    name: 'Push Up',
                    id: 'Push_Up',
                    images: ['Push_Up/0.jpg', 'Push_Up/1.jpg'],
                    level: 'beginner',
                    category: 'strength',
                    force: 'push',
                    equipment: null,
                    primaryMuscles: ['chest'],
                    secondaryMuscles: ['triceps'],
                    instructions: ['Step 1'],
                }]),
            });
        },
        setInterval(callback, delay) {
            intervalCalls.push({ callback, delay });
            return intervalCalls.length;
        },
        clearInterval() {},
        CustomEvent: class CustomEvent {
            constructor(type, init = {}) {
                this.type = type;
                this.detail = init.detail;
            }
        },
    };

    context.global = context;
    context.globalThis = context;
    context.self = context;
    context.window.document = document;
    context.window.CustomEvent = context.CustomEvent;

    return {
        context,
        document,
        window,
        fetchCalls,
        intervalCalls,
        observerInstances,
        windowListeners,
        exercisesContainer,
    };
}

function createSearchEnvironment({ keepFetchPending = false } = {}) {
    const timerController = createTimerController();
    const fetchCalls = [];
    const dispatchedEvents = [];
    const placeholder = createElement('div');
    const documentListeners = {};

    let currentAbortSignal = null;
    let pendingFetchResolve = null;

    const document = {
        addEventListener(type, handler) {
            if (!documentListeners[type]) {
                documentListeners[type] = [];
            }

            documentListeners[type].push(handler);
        },
        dispatchEvent(event) {
            dispatchedEvents.push(event);
            const handlers = documentListeners[event.type] || [];
            handlers.forEach((handler) => handler(event));
        },
        getElementById(id) {
            if (id === 'search-placeholder') {
                return placeholder;
            }

            return null;
        },
        createElement,
    };

    const window = {
        setTimeout: timerController.setTimeout,
        clearTimeout: timerController.clearTimeout,
    };

    const context = {
        console,
        window,
        document,
        setTimeout: timerController.setTimeout,
        clearTimeout: timerController.clearTimeout,
        apiBaseUrl: 'https://libapi.vercel.app',
        fetchExercises() {
            throw new Error('search.js should not call fetchExercises directly when clearing');
        },
        fetch(url, options = {}) {
            fetchCalls.push({ url, options });
            currentAbortSignal = options.signal;

            if (keepFetchPending) {
                return new Promise((resolve) => {
                    pendingFetchResolve = () => resolve({
                        ok: true,
                        json: () => Promise.resolve({
                            exercises: [{ name: 'Push Up' }],
                        }),
                    });
                });
            }

            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({
                    exercises: [{ name: 'Push Up' }],
                }),
            });
        },
        AbortController,
        CustomEvent: class CustomEvent {
            constructor(type, init = {}) {
                this.type = type;
                this.detail = init.detail;
            }
        },
    };

    context.global = context;
    context.globalThis = context;
    context.self = context;
    context.window.document = document;
    context.window.CustomEvent = context.CustomEvent;

    return {
        context,
        placeholder,
        timerController,
        fetchCalls,
        dispatchedEvents,
        getCurrentAbortSignal() {
            return currentAbortSignal;
        },
        resolvePendingFetch() {
            if (pendingFetchResolve) {
                pendingFetchResolve();
                pendingFetchResolve = null;
            }
        },
    };
}

function loadScript(relativePath, context) {
    const filePath = path.join(__dirname, '..', relativePath);
    const source = fs.readFileSync(filePath, 'utf8');
    vm.runInNewContext(source, context, { filename: filePath });
}

function flushPromises() {
    return new Promise((resolve) => setImmediate(resolve));
}

async function runTest(name, fn) {
    try {
        await fn();
        console.log(`PASS ${name}`);
    } catch (error) {
        console.error(`FAIL ${name}`);
        console.error(error);
        process.exitCode = 1;
    }
}

async function main() {
    await runTest('script.js renders cards without creating looping image intervals', async () => {
        const env = createScriptEnvironment();

        loadScript(path.join('public', 'js', 'script.js'), env.context);
        await flushPromises();

        assert.equal(env.fetchCalls.length, 1);
        assert.equal(env.intervalCalls.length, 0);
        assert.equal(env.exercisesContainer.children.length, 1);

        const card = env.exercisesContainer.children[0];
        const image = card.children[0];

        assert.equal(image.src, 'https://libapi.vercel.app/exercises/Push_Up/0.jpg');
        assert.equal(image.loading, 'lazy');
        assert.equal(env.observerInstances[0].observed.length, 1);
    });

    await runTest('script.js blocks infinite scroll while search results are active and resets cleanly', async () => {
        const env = createScriptEnvironment();

        loadScript(path.join('public', 'js', 'script.js'), env.context);
        await flushPromises();

        const initialCard = env.exercisesContainer.children[0];
        env.document.dispatchEvent({
            type: 'searchResults',
            detail: [{
                name: 'Squat',
                images: ['/squat/0.jpg'],
                level: 'beginner',
                category: 'strength',
                force: 'push',
                equipment: null,
                primaryMuscles: ['legs'],
                secondaryMuscles: [],
                instructions: ['Step 1'],
            }],
        });

        env.window.scrollY = 200;
        env.windowListeners.scroll[0]();
        await flushPromises();

        assert.equal(env.fetchCalls.length, 1);
        assert.equal(env.observerInstances[0].unobserved[0], initialCard);

        env.document.dispatchEvent({ type: 'clearSearchResults' });
        await flushPromises();

        assert.equal(env.fetchCalls.length, 2);
    });

    await runTest('search.js debounces input and encodes the query before fetching', async () => {
        const env = createSearchEnvironment();

        loadScript(path.join('public', 'js', 'components', 'search.js'), env.context);

        const searchContainer = env.placeholder.children[0];
        const input = searchContainer.children[0];

        input.dispatchEvent({ type: 'input', target: { value: 'push' } });
        input.dispatchEvent({ type: 'input', target: { value: 'push up' } });

        assert.equal(env.timerController.count(), 1);
        assert.equal(env.fetchCalls.length, 0);

        env.timerController.runAll();
        await flushPromises();

        assert.equal(env.fetchCalls.length, 1);
        assert.match(env.fetchCalls[0].url, /query=push%20up/);
        assert.equal(env.dispatchedEvents.at(-1).type, 'searchResults');
    });

    await runTest('search.js aborts in-flight searches and clears via event only once', async () => {
        const env = createSearchEnvironment({ keepFetchPending: true });

        loadScript(path.join('public', 'js', 'components', 'search.js'), env.context);

        const searchContainer = env.placeholder.children[0];
        const input = searchContainer.children[0];

        input.dispatchEvent({ type: 'input', target: { value: 'push' } });
        env.timerController.runAll();
        await flushPromises();

        const activeSignal = env.getCurrentAbortSignal();
        assert.equal(activeSignal.aborted, false);

        input.dispatchEvent({ type: 'input', target: { value: '' } });

        assert.equal(activeSignal.aborted, true);
        assert.equal(env.dispatchedEvents.at(-1).type, 'clearSearchResults');

        env.resolvePendingFetch();
        await flushPromises();
    });
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
