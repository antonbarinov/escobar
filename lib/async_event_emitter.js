function AsyncEventEmitter() {}
AsyncEventEmitter.prototype.__asyncEventEmitterEvents = {};
AsyncEventEmitter.prototype.on = function (eventName, func) {
    const e = this.__asyncEventEmitterEvents;
    if (!e[eventName]) e[eventName] = [];
    e[eventName].push({
        function: func
    });
};
AsyncEventEmitter.prototype.once = function (eventName, func) {
    const e = this.__asyncEventEmitterEvents;
    if (!e[eventName]) e[eventName] = [];
    e[eventName].push({
        function: func,
        once: true,
        executed: false
    });
};
AsyncEventEmitter.prototype.emit = async function (eventName, ...args) {
    const events = this.__asyncEventEmitterEvents[eventName] || [];
    for (let event of events) {
        if (event.once) {
            if (event.executed) continue;
            event.executed = true;
        }

        await event.function.apply(event.function, args);
    }

    return true;
};
AsyncEventEmitter.prototype.hasSubscribe = function (eventName) {
    return !!this.__asyncEventEmitterEvents[eventName];
};

module.exports = AsyncEventEmitter;