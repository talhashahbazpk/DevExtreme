"use strict";

var eventsEngine = require("../../events/core/events_engine"),
    windowUtils = require("../../core/utils/window"),
    domAdapter = require("../../core/dom_adapter"),
    navigator = windowUtils.getNavigator(),
    _math = Math,
    _abs = _math.abs,
    _sqrt = _math.sqrt,
    _round = _math.round,

    eventEmitterModule = require("./event_emitter"),
    eventUtils = require("../../events/utils"),
    wheelEventName = require("../../events/core/wheel").name,
    _addNamespace = eventUtils.addNamespace,
    _parseScalar = require("../core/utils").parseScalar,
    _now = Date.now,

    _NAME = "dxVectorMap",
    EVENTS = {};

setupEvents();

var EVENT_START = "start",
    EVENT_MOVE = "move",
    EVENT_END = "end",
    EVENT_ZOOM = "zoom",
    EVENT_HOVER_ON = "hover-on",
    EVENT_HOVER_OFF = "hover-off",
    EVENT_CLICK = "click",
    EVENT_FOCUS_ON = "focus-on",
    EVENT_FOCUS_MOVE = "focus-move",
    EVENT_FOCUS_OFF = "focus-off",

    CLICK_TIME_THRESHOLD = 500,
    CLICK_COORD_THRESHOLD_MOUSE = 5,
    CLICK_COORD_THRESHOLD_TOUCH = 20,
    DRAG_COORD_THRESHOLD_MOUSE = 5,
    DRAG_COORD_THRESHOLD_TOUCH = 10,
    FOCUS_ON_DELAY_MOUSE = 300,
    FOCUS_OFF_DELAY_MOUSE = 300,
    FOCUS_ON_DELAY_TOUCH = 300,
    FOCUS_OFF_DELAY_TOUCH = 400,
    FOCUS_COORD_THRESHOLD_MOUSE = 5,
    WHEEL_COOLDOWN = 50,
    WHEEL_DIRECTION_COOLDOWN = 300;

function Tracker(parameters) {
    var that = this;
    that._root = parameters.root;
    that._createEventHandlers(parameters.dataKey);
    that._createProjectionHandlers(parameters.projection);
    that._initEvents();
    that._focus = new Focus(function(name, arg) {
        that._fire(name, arg);
    });
    that._attachHandlers();
}

Tracker.prototype = {
    constructor: Tracker,

    dispose: function() {
        var that = this;
        that._detachHandlers();
        that._disposeEvents();
        that._focus.dispose();
        that._root = that._focus = that._docHandlers = that._rootHandlers = null;
    },

    _eventNames: [
        EVENT_START, EVENT_MOVE, EVENT_END, EVENT_ZOOM, EVENT_CLICK,
        EVENT_HOVER_ON, EVENT_HOVER_OFF,
        EVENT_FOCUS_ON, EVENT_FOCUS_OFF, EVENT_FOCUS_MOVE
    ],

    _startClick: function(event, data) {
        if(!data) { return; }
        var coords = getEventCoords(event);
        this._clickState = {
            x: coords.x, y: coords.y,
            threshold: isTouchEvent(event) ? CLICK_COORD_THRESHOLD_TOUCH : CLICK_COORD_THRESHOLD_MOUSE,
            time: _now()
        };
    },

    _endClick: function(event, data) {
        var state = this._clickState,
            threshold,
            coords;

        if(!state) { return; }

        if(data && _now() - state.time <= CLICK_TIME_THRESHOLD) {
            threshold = state.threshold;
            coords = getEventCoords(event);
            if(_abs(coords.x - state.x) <= threshold && _abs(coords.y - state.y) <= threshold) {
                this._fire(EVENT_CLICK, { data: data, x: coords.x, y: coords.y, $event: event });
            }
        }
        this._clickState = null;
    },

    _startDrag: function(event, data) {
        if(!data) { return; }
        var coords = getEventCoords(event),
            state = this._dragState = { x: coords.x, y: coords.y, data: data };
        this._fire(EVENT_START, { x: state.x, y: state.y, data: state.data });
    },

    _moveDrag: function(event, data) {
        var state = this._dragState,
            coords,
            threshold;

        if(!state) { return; }

        coords = getEventCoords(event);
        threshold = isTouchEvent(event) ? DRAG_COORD_THRESHOLD_TOUCH : DRAG_COORD_THRESHOLD_MOUSE;
        if(state.active || _abs(coords.x - state.x) > threshold || _abs(coords.y - state.y) > threshold) {
            state.x = coords.x;
            state.y = coords.y;
            state.active = true;
            state.data = data || {};
            this._fire(EVENT_MOVE, { x: state.x, y: state.y, data: state.data });
        }
    },

    _endDrag: function() {
        var state = this._dragState;
        if(!state) { return; }
        this._dragState = null;
        this._fire(EVENT_END, { x: state.x, y: state.y, data: state.data });
    },

    _wheelZoom: function(event, data) {
        if(!data) { return; }
        var that = this,
            lock = that._wheelLock,
            time = _now(),
            delta,
            coords;

        if(time - lock.time <= WHEEL_COOLDOWN) { return; }
        // T136650
        if(time - lock.dirTime > WHEEL_DIRECTION_COOLDOWN) {
            lock.dir = 0;
        }
        // T107589, T136650
        delta = adjustWheelDelta(event.delta / 120 || 0, lock);

        if(delta === 0) { return; }

        coords = getEventCoords(event);
        that._fire(EVENT_ZOOM, { delta: delta, x: coords.x, y: coords.y });
        lock.time = lock.dirTime = time;
    },

    _startZoom: function(event, data) {
        if(!isTouchEvent(event) || !data) {
            return;
        }

        var state = this._zoomState = this._zoomState || {},
            coords,
            pointer2;

        if(state.pointer1 && state.pointer2) { return; }

        if(state.pointer1 === undefined) {
            state.pointer1 = getPointerId(event) || 0;
            coords = getMultitouchEventCoords(event, state.pointer1);
            state.x1 = state.x1_0 = coords.x;
            state.y1 = state.y1_0 = coords.y;
        }
        if(state.pointer2 === undefined) {
            pointer2 = getPointerId(event) || 1;
            if(pointer2 !== state.pointer1) {
                coords = getMultitouchEventCoords(event, pointer2);
                if(coords) {
                    state.x2 = state.x2_0 = coords.x;
                    state.y2 = state.y2_0 = coords.y;
                    state.pointer2 = pointer2;
                    state.ready = true;
                    this._endDrag();
                }
            }
        }
    },

    _moveZoom: function(event) {
        var state = this._zoomState,
            coords;

        if(!state || !isTouchEvent(event)) {
            return;
        }

        if(state.pointer1 !== undefined) {
            coords = getMultitouchEventCoords(event, state.pointer1);
            if(coords) {
                state.x1 = coords.x;
                state.y1 = coords.y;
            }
        }
        if(state.pointer2 !== undefined) {
            coords = getMultitouchEventCoords(event, state.pointer2);
            if(coords) {
                state.x2 = coords.x;
                state.y2 = coords.y;
            }
        }
    },

    _endZoom: function(event) {
        var state = this._zoomState,
            startDistance,
            currentDistance;

        if(!state || !isTouchEvent(event)) {
            return;
        }

        if(state.ready) {
            startDistance = getDistance(state.x1_0, state.y1_0, state.x2_0, state.y2_0);
            currentDistance = getDistance(state.x1, state.y1, state.x2, state.y2);
            this._fire(EVENT_ZOOM, { ratio: currentDistance / startDistance, x: (state.x1_0 + state.x2_0) / 2, y: (state.y1_0 + state.y2_0) / 2 });
        }
        this._zoomState = null;
    },

    _startHover: function(event, data) {
        this._doHover(event, data, true);
    },

    _moveHover: function(event, data) {
        this._doHover(event, data, false);
    },

    _doHover: function(event, data, isTouch) {
        var that = this;
        if((that._dragState && that._dragState.active) || (that._zoomState && that._zoomState.ready)) {
            that._cancelHover();
            return;
        }

        if(isTouchEvent(event) !== isTouch || that._hoverTarget === event.target || (that._hoverState && that._hoverState.data === data)) {
            return;
        }

        that._cancelHover();
        if(data) {
            that._hoverState = { data: data };
            that._fire(EVENT_HOVER_ON, { data: data });
        }
        that._hoverTarget = event.target;
    },

    _cancelHover: function() {
        var state = this._hoverState;
        this._hoverState = this._hoverTarget = null;
        if(state) {
            this._fire(EVENT_HOVER_OFF, { data: state.data });
        }
    },

    _startFocus: function(event, data) {
        this._doFocus(event, data, true);
    },

    _moveFocus: function(event, data) {
        this._doFocus(event, data, false);
    },

    _doFocus: function(event, data, isTouch) {
        var that = this;
        if((that._dragState && that._dragState.active) || (that._zoomState && that._zoomState.ready)) {
            that._cancelFocus();
            return;
        }

        if(isTouchEvent(event) !== isTouch) { return; }

        that._focus.turnOff(isTouch ? FOCUS_OFF_DELAY_TOUCH : FOCUS_OFF_DELAY_MOUSE);
        data && that._focus.turnOn(data, getEventCoords(event), isTouch ? FOCUS_ON_DELAY_TOUCH : FOCUS_ON_DELAY_MOUSE, isTouch);
    },

    _endFocus: function(event) {
        if(!isTouchEvent(event)) { return; }
        this._focus.cancelOn();
    },

    _cancelFocus: function() {
        this._focus.cancel();
    },

    _createEventHandlers: function(DATA_KEY) {
        var that = this;

        that._docHandlers = {};
        that._rootHandlers = {};

        // Because of "stopPropagation" at any time only one of two handlers will be fully executed
        that._rootHandlers[EVENTS.start] /* T322560 */ = that._docHandlers[EVENTS.start] = function(event) {
            var isTouch = isTouchEvent(event),
                data = getData(event);

            if(isTouch && !that._isTouchEnabled) { return; }
            if(data) {
                event.preventDefault();
                event.stopPropagation(); // T322560
            }

            that._startClick(event, data);
            that._startDrag(event, data);
            that._startZoom(event, data);
            that._startHover(event, data);
            that._startFocus(event, data);
        };

        that._docHandlers[EVENTS.move] = function(event) {
            var isTouch = isTouchEvent(event),
                data = getData(event);

            if(isTouch && !that._isTouchEnabled) { return; }

            that._moveDrag(event, data);
            that._moveZoom(event, data);
            that._moveHover(event, data);
            that._moveFocus(event, data);
        };

        that._docHandlers[EVENTS.end] = function(event) {
            var isTouch = isTouchEvent(event),
                data = getData(event);

            if(isTouch && !that._isTouchEnabled) { return; }

            that._endClick(event, data);
            that._endDrag(event, data);
            that._endZoom(event, data);
            that._endFocus(event, data);
        };

        that._rootHandlers[EVENTS.wheel] = function(event) {
            that._cancelFocus();

            if(!that._isWheelEnabled) { return; }

            var data = getData(event);
            if(data) {
                event.preventDefault();
                event.stopPropagation(); // T249548
                that._wheelZoom(event, data);
            }
        };
        that._wheelLock = { dir: 0 };

        // Actually it is responsibility of the text element wrapper to handle "data" to its span elements (if there are any).
        // Now to avoid not so necessary complication of renderer text-span issue is handled on the side of the tracker.
        function getData(event) {
            var target = event.target;
            return (target.tagName === "tspan" ? target.parentNode : target)[DATA_KEY];
        }
    },

    _createProjectionHandlers: function(projection) {
        var that = this;
        projection.on({ "center": handler, "zoom": handler }); // T247841
        function handler() {
            // `_cancelHover` probably should also be called here but for now let it not be so
            that._cancelFocus();
        }
    },

    reset: function() {
        var that = this;
        that._clickState = null;
        that._endDrag();
        that._cancelHover();
        that._cancelFocus();
    },

    setOptions: function(options) {
        var that = this;
        that.reset();
        that._detachHandlers();
        that._isTouchEnabled = !!_parseScalar(options.touchEnabled, true);
        that._isWheelEnabled = !!_parseScalar(options.wheelEnabled, true);
        that._attachHandlers();
    },

    _detachHandlers: function() {
        var that = this;
        if(that._isTouchEnabled) {
            that._root.css({ "touch-action": "", "-webkit-user-select": "" }).
                off(_addNamespace("MSHoldVisual", _NAME)).
                off(_addNamespace("contextmenu", _NAME));
        }
        eventsEngine.off(domAdapter.getDocument(), that._docHandlers);
        that._root.off(that._rootHandlers);
    },

    _attachHandlers: function() {
        var that = this;
        if(that._isTouchEnabled) {
            that._root.css({ "touch-action": "none", "-webkit-user-select": "none" }).
                on(_addNamespace("MSHoldVisual", _NAME), function(event) {
                    event.preventDefault();
                }).
                on(_addNamespace("contextmenu", _NAME), function(event) {
                    isTouchEvent(event) && event.preventDefault();
                });
        }
        eventsEngine.on(domAdapter.getDocument(), that._docHandlers);
        that._root.on(that._rootHandlers);
    }
};

var Focus = function(fire) {
    var that = this,
        _activeData = null,
        _data = null,
        _disabled = false,
        _onTimer = null,
        _offTimer = null,
        _x,
        _y;

    that.dispose = function() {
        clearTimeout(_onTimer);
        clearTimeout(_offTimer);
        that.turnOn = that.turnOff = that.cancel = that.cancelOn = that.dispose = that = fire = _activeData = _data = _onTimer = _offTimer = null;
    };
    that.turnOn = function(data, coords, timeout, forceTimeout) {
        if(data === _data && _disabled) { return; }
        _disabled = false;
        _data = data;
        if(_activeData) {
            _x = coords.x;
            _y = coords.y;
            clearTimeout(_onTimer);
            _onTimer = setTimeout(function() {
                _onTimer = null;
                if(_data === _activeData) {
                    fire(EVENT_FOCUS_MOVE, { data: _data, x: _x, y: _y });
                    onCheck(true);
                } else {
                    fire(EVENT_FOCUS_ON, { data: _data, x: _x, y: _y, done: onCheck });
                }
            }, forceTimeout ? timeout : 0);
        } else {
            if(!_onTimer || _abs(coords.x - _x) > FOCUS_COORD_THRESHOLD_MOUSE || _abs(coords.y - _y) > FOCUS_COORD_THRESHOLD_MOUSE || forceTimeout) {
                _x = coords.x;
                _y = coords.y;
                clearTimeout(_onTimer);
                _onTimer = setTimeout(function() {
                    _onTimer = null;
                    fire(EVENT_FOCUS_ON, { data: _data, x: _x, y: _y, done: onCheck });
                }, timeout);
            }
        }
        function onCheck(result) {
            _disabled = !result;
            if(result) {
                _activeData = _data;
                clearTimeout(_offTimer);
                _offTimer = null;
            }
        }
    };
    that.turnOff = function(timeout) {
        clearTimeout(_onTimer);
        _onTimer = null;
        _data = null;
        if(_activeData && !_disabled) {
            _offTimer = _offTimer || setTimeout(function() {
                _offTimer = null;
                fire(EVENT_FOCUS_OFF, { data: _activeData });
                _activeData = null;
            }, timeout);
        }
    };
    that.cancel = function() {
        clearTimeout(_onTimer);
        clearTimeout(_offTimer);
        if(_activeData) {
            fire(EVENT_FOCUS_OFF, { data: _activeData });
        }
        _activeData = _data = _onTimer = _offTimer = null;
    };
    that.cancelOn = function() {
        clearTimeout(_onTimer);
        _onTimer = null;
    };
};

eventEmitterModule.makeEventEmitter(Tracker);

exports.Tracker = Tracker;

///#DEBUG
var originFocus = Focus;
exports._DEBUG_forceEventMode = function(mode) {
    setupEvents(mode);
};
exports.Focus = Focus;
exports._DEBUG_stubFocusType = function(focusType) {
    Focus = focusType;
};
exports._DEBUG_restoreFocusType = function() {
    Focus = originFocus;
};
///#ENDDEBUG

function getDistance(x1, y1, x2, y2) {
    return _sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
}

function isTouchEvent(event) {
    var type = event.originalEvent.type,
        pointerType = event.originalEvent.pointerType;
    return /^touch/.test(type) || (/^MSPointer/.test(type) && pointerType !== 4) || (/^pointer/.test(type) && pointerType !== "mouse");
}

function selectItem(flags, items) {
    var i = 0,
        ii = flags.length,
        item;
    for(; i < ii; ++i) {
        if(flags[i]) {
            item = items[i];
            break;
        }
    }
    return _addNamespace(item || items[i], _NAME);
}

function setupEvents() {
    var flags = [navigator.pointerEnabled, navigator.msPointerEnabled, windowUtils.hasProperty("ontouchstart")];
    ///#DEBUG
    if(arguments.length) {
        flags = [
            arguments[0] === "pointer",
            arguments[0] === "MSPointer",
            arguments[0] === "touch"
        ];
    }
    ///#ENDDEBUG
    EVENTS = {
        start: selectItem(flags, ["pointerdown", "MSPointerDown", "touchstart mousedown", "mousedown"]),
        move: selectItem(flags, ["pointermove", "MSPointerMove", "touchmove mousemove", "mousemove"]),
        end: selectItem(flags, ["pointerup", "MSPointerUp", "touchend mouseup", "mouseup"]),
        wheel: _addNamespace(wheelEventName, _NAME)
    };
}

function getEventCoords(event) {
    var originalEvent = event.originalEvent,
        touch = (originalEvent.touches && originalEvent.touches[0]) || {};
    return { x: touch.pageX || originalEvent.pageX || event.pageX, y: touch.pageY || originalEvent.pageY || event.pageY };
}

function getPointerId(event) {
    return event.originalEvent.pointerId;
}

function getMultitouchEventCoords(event, pointerId) {
    var originalEvent = event.originalEvent;
    if(originalEvent.pointerId !== undefined) {
        originalEvent = originalEvent.pointerId === pointerId ? originalEvent : null;
    } else {
        originalEvent = originalEvent.touches[pointerId];
    }
    return originalEvent ? { x: originalEvent.pageX || event.pageX, y: originalEvent.pageY || event.pageY } : null;
}

function adjustWheelDelta(delta, lock) {
    if(delta === 0) { return 0; }

    var _delta = _abs(delta), sign = _round(delta / _delta);

    if(lock.dir && sign !== lock.dir) { return 0; }

    lock.dir = sign;
    if(_delta < 0.1) {
        _delta = 0;
    } else if(_delta < 1) {
        _delta = 1;
    } else if(_delta > 4) {
        _delta = 4;
    } else {
        _delta = _round(_delta);
    }
    return sign * _delta;
}
