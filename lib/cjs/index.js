"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jsonClone = exports.debugRef = void 0;
const devtools_api_1 = require("@vue/devtools-api");
const vue_1 = require("vue");
let _api;
let readId = 'read-ref-layer-id';
let writeId = 'write-ref-layer-id';
exports.default = {
    install(app, options) {
        // @ts-ignore
        Error.stackTraceLimit = Error.stackTraceLimit < 100 ? 100 : Error.stackTraceLimit;
        (0, devtools_api_1.setupDevtoolsPlugin)({
            id: 'tracked-ref-plugin',
            label: 'Ref value trace',
            enableEarlyProxy: true,
            app
        }, api => {
            _api = api;
            api.addTimelineLayer({
                id: readId,
                label: 'Ref read',
                color: 0xff984f
            });
            api.addTimelineLayer({
                id: writeId,
                label: 'Ref modified',
                color: 0x41b86a
            });
        });
    }
};
function debugRef(name, ref) {
    let oldValueString;
    const unwatch = (0, vue_1.watch)(() => ref.value, (newValue) => {
        const newValueString = JSON.stringify(newValue);
        if (newValueString === oldValueString) {
            return;
        }
        const stackInfo = getStackInfo(new Error());
        if (_api) {
            _api.addTimelineEvent({
                layerId: writeId,
                event: {
                    time: _api.now(),
                    data: {
                        newValue: JSON.parse(newValueString),
                        oldValue: JSON.parse(oldValueString),
                        file: stackInfo.file,
                        line: `${stackInfo.line}:${stackInfo.col}`,
                        path: stackInfo.path
                    },
                    groupId: name,
                    title: name,
                    subtitle: 'in ' + stackInfo.file
                }
            });
        }
        oldValueString = JSON.stringify(newValue);
    }, {
        onTrack: (a) => {
            const stackInfo = getStackInfo(new Error());
            if (_api) {
                _api.addTimelineEvent({
                    layerId: readId,
                    event: {
                        time: _api.now(),
                        data: stackInfo,
                        groupId: name,
                        title: name,
                        subtitle: 'in ' + stackInfo.file
                    }
                });
            }
        },
        onTrigger: e => console.log(e),
        deep: true,
        flush: 'sync',
        immediate: true
    });
    if ((0, vue_1.getCurrentScope)()) {
        (0, vue_1.onScopeDispose)(() => {
            unwatch();
        });
    }
}
exports.debugRef = debugRef;
function getStackInfo(err) {
    const stack = err.stack || '';
    const lines = stack.split('\n');
    let line = lines.find(l => l.includes('.vue'))
        || (lines.find(l => l.includes(window.location.origin) && !l.includes('tracked-ref.ts') && !l.includes('node_modules')))
        || '';
    line = line.substring(line.indexOf(window.location.origin) + window.location.origin.length);
    let filePath = (line.split('?') || [])[0];
    let fileName = filePath.split('/').at(-1);
    let [lineNumber, colNumber] = line
        .replace(/\)/g, '')
        .split(':').slice(1);
    return { file: fileName, line: lineNumber, col: colNumber, path: filePath };
}
function jsonClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}
exports.jsonClone = jsonClone;
